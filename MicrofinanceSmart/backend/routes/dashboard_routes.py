import logging
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from backend.app import db
from backend.models import User, Loan, Payment, FinancialMetric, ClientActivity

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/metrics', methods=['GET'])
@login_required
def get_dashboard_metrics():
    """Get dashboard metrics for current user"""
    try:
        if current_user.is_admin():
            # Admin metrics
            total_users = User.query.filter_by(role='client').count()
            total_loans = Loan.query.count()
            active_loans = Loan.query.filter_by(status='active').count()
            pending_loans = Loan.query.filter_by(status='pending').count()
            
            # Calculate total loan amount
            loan_amount_query = db.session.query(db.func.sum(Loan.amount)).scalar()
            total_loan_amount = float(loan_amount_query) if loan_amount_query else 0
            
            # Calculate total payments received
            payment_amount_query = db.session.query(
                db.func.sum(Payment.amount)
            ).filter(
                Payment.status == 'successful'
            ).scalar()
            total_payments = float(payment_amount_query) if payment_amount_query else 0
            
            # Get financial metrics
            financial_metrics = {}
            for metric in FinancialMetric.query.all():
                if metric.metric_type not in financial_metrics:
                    financial_metrics[metric.metric_type] = []
                
                financial_metrics[metric.metric_type].append({
                    'name': metric.name,
                    'value': metric.value,
                    'date': metric.date.strftime('%Y-%m-%d')
                })
            
            return jsonify({
                'metrics': {
                    'total_users': total_users,
                    'total_loans': total_loans,
                    'active_loans': active_loans,
                    'pending_loans': pending_loans,
                    'total_loan_amount': total_loan_amount,
                    'total_payments': total_payments,
                    'financial_metrics': financial_metrics
                }
            }), 200
            
        else:
            # Client metrics
            user_loans = Loan.query.filter_by(user_id=current_user.id).all()
            
            # Calculate total and remaining loan amounts
            total_loan_amount = sum(loan.amount for loan in user_loans)
            
            # Get payments for user's loans
            loan_ids = [loan.id for loan in user_loans]
            payments = Payment.query.filter(
                Payment.loan_id.in_(loan_ids),
                Payment.status == 'successful'
            ).all()
            
            total_paid = sum(payment.amount for payment in payments)
            remaining_amount = total_loan_amount - total_paid
            
            # Get active loans
            active_loans = [loan for loan in user_loans if loan.status == 'active']
            pending_loans = [loan for loan in user_loans if loan.status == 'pending']
            
            # Get recent activity
            recent_activities = ClientActivity.query.filter_by(
                user_id=current_user.id
            ).order_by(
                ClientActivity.timestamp.desc()
            ).limit(5).all()
            
            activities = []
            for activity in recent_activities:
                activities.append({
                    'type': activity.activity_type,
                    'timestamp': activity.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'details': activity.details
                })
            
            return jsonify({
                'metrics': {
                    'total_loan_amount': total_loan_amount,
                    'total_paid': total_paid,
                    'remaining_amount': remaining_amount,
                    'active_loans_count': len(active_loans),
                    'pending_loans_count': len(pending_loans),
                    'recent_activities': activities
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve dashboard metrics'}), 500

@dashboard_bp.route('/loan-stats', methods=['GET'])
@login_required
def get_loan_statistics():
    """Get loan statistics for visualization"""
    try:
        if current_user.is_admin():
            # Get loan status distribution
            status_counts = {}
            for status in ['pending', 'approved', 'rejected', 'active', 'completed']:
                count = Loan.query.filter_by(status=status).count()
                status_counts[status] = count
            
            # Get loan amount distribution
            loan_amounts = db.session.query(Loan.amount).all()
            amounts = [float(amount[0]) for amount in loan_amounts]
            
            # Calculate basic statistics
            if amounts:
                avg_amount = sum(amounts) / len(amounts)
                min_amount = min(amounts)
                max_amount = max(amounts)
            else:
                avg_amount = 0
                min_amount = 0
                max_amount = 0
            
            # Create amount ranges
            ranges = [
                {'range': '0-1000', 'count': sum(1 for a in amounts if a <= 1000)},
                {'range': '1001-5000', 'count': sum(1 for a in amounts if 1001 <= a <= 5000)},
                {'range': '5001-10000', 'count': sum(1 for a in amounts if 5001 <= a <= 10000)},
                {'range': '10001+', 'count': sum(1 for a in amounts if a > 10000)}
            ]
            
            # Get monthly loan counts
            monthly_counts = db.session.query(
                db.func.strftime('%Y-%m', Loan.created_at).label('month'),
                db.func.count(Loan.id).label('count')
            ).group_by('month').all()
            
            month_data = [{'month': month, 'count': count} for month, count in monthly_counts]
            
            return jsonify({
                'loan_stats': {
                    'status_distribution': status_counts,
                    'amount_stats': {
                        'average': avg_amount,
                        'minimum': min_amount,
                        'maximum': max_amount,
                        'ranges': ranges
                    },
                    'monthly_trend': month_data
                }
            }), 200
            
        else:
            # Client can only see their own loans
            user_loans = Loan.query.filter_by(user_id=current_user.id).all()
            
            # Get loan status distribution
            status_counts = {}
            for status in ['pending', 'approved', 'rejected', 'active', 'completed']:
                count = sum(1 for loan in user_loans if loan.status == status)
                status_counts[status] = count
            
            # Get payment history
            loan_ids = [loan.id for loan in user_loans]
            payments = Payment.query.filter(
                Payment.loan_id.in_(loan_ids)
            ).order_by(
                Payment.payment_date
            ).all()
            
            payment_history = []
            for payment in payments:
                payment_history.append({
                    'date': payment.payment_date.strftime('%Y-%m-%d'),
                    'amount': payment.amount,
                    'status': payment.status,
                    'loan_id': payment.loan_id
                })
            
            return jsonify({
                'loan_stats': {
                    'status_distribution': status_counts,
                    'payment_history': payment_history
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Error getting loan statistics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve loan statistics'}), 500

@dashboard_bp.route('/recent-activity', methods=['GET'])
@login_required
def get_recent_activity():
    """Get recent system activity"""
    try:
        if current_user.is_admin():
            # Get recent client activity for admin
            activities = ClientActivity.query.order_by(
                ClientActivity.timestamp.desc()
            ).limit(20).all()
            
            activity_list = []
            for activity in activities:
                user = User.query.get(activity.user_id)
                
                if user:
                    username = f"{user.first_name} {user.last_name}"
                else:
                    username = "Unknown User"
                
                activity_list.append({
                    'user_id': activity.user_id,
                    'username': username,
                    'type': activity.activity_type,
                    'timestamp': activity.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'details': activity.details
                })
            
            # Get recent loan applications
            recent_loans = Loan.query.order_by(
                Loan.created_at.desc()
            ).limit(10).all()
            
            loan_list = []
            for loan in recent_loans:
                user = User.query.get(loan.user_id)
                
                if user:
                    username = f"{user.first_name} {user.last_name}"
                else:
                    username = "Unknown User"
                
                loan_list.append({
                    'loan_id': loan.id,
                    'user_id': loan.user_id,
                    'username': username,
                    'amount': loan.amount,
                    'status': loan.status,
                    'created_at': loan.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
            
            return jsonify({
                'activities': activity_list,
                'recent_loans': loan_list
            }), 200
            
        else:
            # Client can only see their own activity
            activities = ClientActivity.query.filter_by(
                user_id=current_user.id
            ).order_by(
                ClientActivity.timestamp.desc()
            ).limit(10).all()
            
            activity_list = []
            for activity in activities:
                activity_list.append({
                    'type': activity.activity_type,
                    'timestamp': activity.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'details': activity.details
                })
            
            return jsonify({
                'activities': activity_list
            }), 200
            
    except Exception as e:
        logger.error(f"Error getting recent activity: {str(e)}")
        return jsonify({'error': 'Failed to retrieve recent activity'}), 500

@dashboard_bp.route('/record-activity', methods=['POST'])
@login_required
def record_activity():
    """Record a client activity"""
    try:
        data = request.json
        
        # Validate required fields
        if 'activity_type' not in data:
            return jsonify({'error': 'Activity type is required'}), 400
        
        # Create activity record
        activity = ClientActivity(
            user_id=current_user.id,
            activity_type=data['activity_type'],
            details=data.get('details', {})
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'message': 'Activity recorded successfully',
            'activity_id': activity.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error recording activity: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to record activity'}), 500
