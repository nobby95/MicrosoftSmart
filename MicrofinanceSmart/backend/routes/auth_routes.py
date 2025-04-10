import logging
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash

from backend.app import db
from backend.models import User

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if username or email already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data['phone_number'],
            role='client'  # Default role is client
        )
        new_user.set_password(data['password'])
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': new_user.id
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user"""
    try:
        data = request.json
        
        # Validate required fields
        if 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user by username
        user = User.query.filter_by(username=data['username']).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Log in the user
        login_user(user)
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout the current user"""
    try:
        logout_user()
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        logger.error(f"Error logging out: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/user', methods=['GET'])
@login_required
def get_user():
    """Get current user information"""
    try:
        return jsonify({
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'phone_number': current_user.phone_number,
                'role': current_user.role
            }
        }), 200
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user information'}), 500

@auth_bp.route('/user', methods=['PUT'])
@login_required
def update_user():
    """Update user information"""
    try:
        data = request.json
        
        # Get current user
        user = User.query.get(current_user.id)
        
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
        if 'password' in data:
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update user information'}), 500
