import os
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename

from backend.app import db
from backend.models import User, Loan, Payment, Message, ExcelFile, AnalysisResult, FinancialMetric
from backend.services.twilio_service import send_loan_approval_notification, send_payment_reminder
from backend.services.excel_processor import ExcelProcessor, save_uploaded_file
from backend.services.ml_service import MicrofinanceML

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

# Admin check decorator
def admin_required(f):
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return login_required(decorated_function)

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users (admin only)"""
    try:
        users = User.query.all()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'role': user.role,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({'users': user_list}), 200
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return jsonify({'error': 'Failed to retrieve users'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get a specific user (admin only)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's loans
        loans = Loan.query.filter_by(user_id=user.id).all()
        loan_list = []
        
        for loan in loans:
            loan_list.append({
                'id': loan.id,
                'amount': loan.amount,
                'interest_rate': loan.interest_rate,
                'term_months': loan.term_months,
                'status': loan.status,
                'purpose': loan.purpose,
                'created_at': loan.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'role': user.role,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'loans': loan_list
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user'}), 500

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Create a new user (admin only)"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if username or email already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Validate role
        if data['role'] not in ['admin', 'client']:
            return jsonify({'error': 'Invalid role. Must be "admin" or "client"'}), 400
        
        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data.get('phone_number', ''),
            role=data['role']
        )
        new_user.set_password(data['password'])
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': new_user.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create user'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update a user (admin only)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.json
        
        # Update fields if provided
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            # Check if email already exists for another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({'error': 'Email already in use'}), 400
            user.email = data['email']
        if 'phone_number' in data:
            user.phone_number = data['phone_number']
        if 'role' in data:
            if data['role'] not in ['admin', 'client']:
                return jsonify({'error': 'Invalid role. Must be "admin" or "client"'}), 400
            user.role = data['role']
        if 'password' in data:
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user_id': user.id
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update user'}), 500

@admin_bp.route('/loans', methods=['GET'])
@admin_required
def get_all_loans():
    """Get all loans (admin only)"""
    try:
        loans = Loan.query.all()
        
        loan_list = []
        for loan in loans:
            # Get user information
            user = User.query.get(loan.user_id)
            username = f"{user.first_name} {user.last_name}" if user else "Unknown User"
            
            # Get payment information
            payments = Payment.query.filter_by(loan_id=loan.id).all()
            total_paid = sum(payment.amount for payment in payments if payment.status == 'successful')
            
            loan_list.append({
                'id': loan.id,
                'user_id': loan.user_id,
                'username': username,
                'amount': loan.amount,
                'interest_rate': loan.interest_rate,
                'term_months': loan.term_months,
                'status': loan.status,
                'purpose': loan.purpose,
                'created_at': loan.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'approved_at': loan.approved_at.strftime('%Y-%m-%d %H:%M:%S') if loan.approved_at else None,
                'total_paid': total_paid,
                'remaining': loan.amount - total_paid,
                'payment_count': len(payments)
            })
        
        return jsonify({'loans': loan_list}), 200
        
    except Exception as e:
        logger.error(f"Error fetching loans: {str(e)}")
        return jsonify({'error': 'Failed to retrieve loans'}), 500

@admin_bp.route('/loans/<int:loan_id>', methods=['PUT'])
@admin_required
def update_loan(loan_id):
    """Update a loan (admin only)"""
    try:
        loan = Loan.query.get(loan_id)
        
        if not loan:
            return jsonify({'error': 'Loan not found'}), 404
        
        data = request.json
        
        # Update status if provided
        if 'status' in data:
            old_status = loan.status
            new_status = data['status']
            
            if new_status not in ['pending', 'approved', 'rejected', 'active', 'completed']:
                return jsonify({'error': 'Invalid loan status'}), 400
            
            loan.status = new_status
            
            # If status changed to approved, set approved_at timestamp
            if old_status != 'approved' and new_status == 'approved':
                loan.approved_at = datetime.utcnow()
                
                # Send approval notification
                user = User.query.get(loan.user_id)
                if user and user.phone_number:
                    send_loan_approval_notification(
                        user.phone_number,
                        f"{user.first_name} {user.last_name}",
                        loan.amount,
                        loan.id
                    )
        
        # Update other fields if provided
        if 'interest_rate' in data:
            loan.interest_rate = data['interest_rate']
        if 'term_months' in data:
            loan.term_months = data['term_months']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Loan updated successfully',
            'loan_id': loan.id
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating loan: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update loan'}), 500

@admin_bp.route('/excel-upload', methods=['POST'])
@admin_required
def upload_excel():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        if not file.filename.endswith(('.xls', '.xlsx')):
            return jsonify({'error': 'Invalid file format'}), 400

        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Process file
        try:
            processor = ExcelProcessor(filepath)
            results = processor.analyze()
            return jsonify({
                'file_id': results.id,
                'message': 'File uploaded and analyzed successfully'
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    except Exception as e:
        return jsonify({'error': 'Upload failed'}), 500

@admin_bp.route('/excel-files', methods=['GET'])
@admin_required
def get_excel_files():
    """Get all uploaded Excel files (admin only)"""
    try:
        excel_files = ExcelFile.query.all()
        
        file_list = []
        for file in excel_files:
            # Get uploader information
            uploader = User.query.get(file.uploaded_by)
            uploader_name = f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown User"
            
            file_list.append({
                'id': file.id,
                'filename': file.filename,
                'uploaded_by': file.uploaded_by,
                'uploader_name': uploader_name,
                'upload_date': file.upload_date.strftime('%Y-%m-%d %H:%M:%S'),
                'analysis_complete': file.analysis_complete
            })
        
        return jsonify({'excel_files': file_list}), 200
        
    except Exception as e:
        logger.error(f"Error fetching Excel files: {str(e)}")
        return jsonify({'error': 'Failed to retrieve Excel files'}), 500

@admin_bp.route('/excel-files/<int:file_id>/results', methods=['GET'])
@admin_required
def get_analysis_results(file_id):
    """Get analysis results for a specific Excel file (admin only)"""
    try:
        excel_file = ExcelFile.query.get(file_id)
        
        if not excel_file:
            return jsonify({'error': 'Excel file not found'}), 404
        
        # Get all analysis results for this file
        results = AnalysisResult.query.filter_by(excel_file_id=file_id).all()
        
        result_dict = {}
        for result in results:
            result_dict[result.result_type] = result.result_data
        
        return jsonify({
            'file_info': {
                'id': excel_file.id,
                'filename': excel_file.filename,
                'upload_date': excel_file.upload_date.strftime('%Y-%m-%d %H:%M:%S')
            },
            'results': result_dict
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching analysis results: {str(e)}")
        return jsonify({'error': 'Failed to retrieve analysis results'}), 500

@admin_bp.route('/messages', methods=['POST'])
@admin_required
def send_message():
    """Send a message to a client (admin only)"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['user_id', 'content', 'message_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user exists
        user = User.query.get(data['user_id'])
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Create message record
        message = Message(
            user_id=user.id,
            content=data['content'],
            message_type=data['message_type']
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Send message via Twilio if phone number exists
        if user.phone_number:
            if data['message_type'] == 'payment_reminder':
                send_payment_reminder(
                    user.phone_number,
                    f"{user.first_name} {user.last_name}",
                    float(data.get('payment_amount', 0)),
                    data.get('due_date', 'soon')
                )
            else:
                # Use generic message sending
                from backend.services.twilio_service import send_message as send_twilio_message
                send_twilio_message(user.phone_number, data['content'])
        
        return jsonify({
            'message': 'Message sent successfully',
            'message_id': message.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to send message'}), 500

@admin_bp.route('/metrics', methods=['POST'])
@admin_required
def create_metric():
    """Create a new financial metric (admin only)"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'value', 'metric_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new metric
        metric = FinancialMetric(
            name=data['name'],
            value=data['value'],
            metric_type=data['metric_type']
        )
        
        db.session.add(metric)
        db.session.commit()
        
        return jsonify({
            'message': 'Metric created successfully',
            'metric_id': metric.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating metric: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create metric'}), 500
