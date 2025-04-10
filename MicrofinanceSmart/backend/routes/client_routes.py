import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from backend.app import db
from backend.models import Loan, Payment, Message, ClientActivity
from backend.services.twilio_service import send_payment_confirmation
from backend.services.ml_service import MicrofinanceML

logger = logging.getLogger(__name__)

client_bp = Blueprint('client', __name__)

@client_bp.route('/loans', methods=['GET'])
@login_required
def get_loans():
    """Get all loans for the current client"""
    try:
        loans = Loan.query.filter_by(user_id=current_user.id).all()
        
        loan_list = []
        for loan in loans:
            # Get payments for this loan
            payments = Payment.query.filter_by(loan_id=loan.id).all()
            total_paid = sum(payment.amount for payment in payments if payment.status == 'successful')
            
            loan_list.append({
                'id': loan.id,
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

@client_bp.route('/loans', methods=['POST'])
@login_required
def create_loan():
    """Create a new loan application"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['amount', 'interest_rate', 'term_months', 'purpose']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new loan
        new_loan = Loan(
            user_id=current_user.id,
            amount=data['amount'],
            interest_rate=data['interest_rate'],
            term_months=data['term_months'],
            purpose=data['purpose'],
            status='pending'
        )
        
        db.session.add(new_loan)
        
        # Record activity
        activity = ClientActivity(
            user_id=current_user.id,
            activity_type='loan_application',
            details={
                'loan_amount': data['amount'],
                'term_months': data['term_months'],
                'purpose': data['purpose']
            }
        )
        
        db.session.add(activity)
        db.session.commit()
        
        # Perform risk analysis using ML service
        ml_service = MicrofinanceML()
        risk_analysis = ml_service.analyze_loan_risk(data)
        
        return jsonify({
            'message': 'Loan application submitted successfully',
            'loan_id': new_loan.id,
            'risk_analysis': risk_analysis if 'error' not in risk_analysis else None
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating loan: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create loan application'}), 500

@client_bp.route('/loans/<int:loan_id>', methods=['GET'])
@login_required
def get_loan(loan_id):
    """Get details for a specific loan"""
    try:
        loan = Loan.query.filter_by(id=loan_id, user_id=current_user.id).first()
        
        if not loan:
            return jsonify({'error': 'Loan not found or unauthorized'}), 404
        
        # Get payments for this loan
        payments = Payment.query.filter_by(loan_id=loan.id).all()
        payment_list = []
        
        for payment in payments:
            payment_list.append({
                'id': payment.id,
                'amount': payment.amount,
                'payment_date': payment.payment_date.strftime('%Y-%m-%d %H:%M:%S'),
                'status': payment.status
            })
        
        # Calculate loan statistics
        total_paid = sum(payment.amount for payment in payments if payment.status == 'successful')
        remaining = loan.amount - total_paid
        
        # Calculate monthly payment
        monthly_rate = loan.interest_rate / 100 / 12
        if monthly_rate > 0:
            monthly_payment = (loan.amount * monthly_rate * (1 + monthly_rate) ** loan.term_months) / ((1 + monthly_rate) ** loan.term_months - 1)
        else:
            monthly_payment = loan.amount / loan.term_months
        
        return jsonify({
            'loan': {
                'id': loan.id,
                'amount': loan.amount,
                'interest_rate': loan.interest_rate,
                'term_months': loan.term_months,
                'status': loan.status,
                'purpose': loan.purpose,
                'created_at': loan.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'approved_at': loan.approved_at.strftime('%Y-%m-%d %H:%M:%S') if loan.approved_at else None,
                'total_paid': total_paid,
                'remaining': remaining,
                'monthly_payment': monthly_payment,
                'payments': payment_list
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching loan details: {str(e)}")
        return jsonify({'error': 'Failed to retrieve loan details'}), 500

@client_bp.route('/payments', methods=['POST'])
@login_required
def make_payment():
    """Make a loan payment"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['loan_id', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if loan exists and belongs to current user
        loan = Loan.query.filter_by(id=data['loan_id'], user_id=current_user.id).first()
        
        if not loan:
            return jsonify({'error': 'Loan not found or unauthorized'}), 404
        
        if loan.status != 'active':
            return jsonify({'error': 'Cannot make payment on a non-active loan'}), 400
        
        # Create payment record
        payment = Payment(
            loan_id=loan.id,
            amount=data['amount'],
            status='successful'  # Assume payment is successful
        )
        
        db.session.add(payment)
        
        # Record activity
        activity = ClientActivity(
            user_id=current_user.id,
            activity_type='payment',
            details={
                'loan_id': loan.id,
                'payment_amount': data['amount']
            }
        )
        
        db.session.add(activity)
        db.session.commit()
        
        # Send payment confirmation via Twilio
        if current_user.phone_number:
            send_payment_confirmation(
                current_user.phone_number,
                f"{current_user.first_name} {current_user.last_name}",
                data['amount'],
                loan.id
            )
        
        return jsonify({
            'message': 'Payment processed successfully',
            'payment_id': payment.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to process payment'}), 500

@client_bp.route('/messages', methods=['GET'])
@login_required
def get_messages():
    """Get all messages for the current client"""
    try:
        messages = Message.query.filter_by(user_id=current_user.id).order_by(Message.send_time.desc()).all()
        
        message_list = []
        for message in messages:
            message_list.append({
                'id': message.id,
                'content': message.content,
                'send_time': message.send_time.strftime('%Y-%m-%d %H:%M:%S'),
                'status': message.status,
                'message_type': message.message_type
            })
        
        return jsonify({'messages': message_list}), 200
        
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        return jsonify({'error': 'Failed to retrieve messages'}), 500

@client_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get client profile information"""
    try:
        return jsonify({
            'profile': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'phone_number': current_user.phone_number,
                'created_at': current_user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': 'Failed to retrieve profile'}), 500
