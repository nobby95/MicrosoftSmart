import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS
from flask_login import LoginManager
from config import Config

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

# Initialize extensions
db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

# Create the app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"], "supports_credentials": True}})

# Configure the app
app.secret_key = os.environ.get("SESSION_SECRET", "your-secure-secret-key-here")  # Default only for development
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///microfinance.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Configure file uploads
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max upload size

# Initialize extensions with app
db.init_app(app)
login_manager.init_app(app)

# Ensure upload directory exists
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Import and register blueprints
with app.app_context():
    # Import models to create tables
    from backend import models
    
    # Import and register route blueprints
    from backend.routes.auth_routes import auth_bp
    from backend.routes.dashboard_routes import dashboard_bp
    from backend.routes.client_routes import client_bp
    from backend.routes.admin_routes import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(client_bp, url_prefix='/api/client')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Create database tables
    db.create_all()

# Setup login manager
@login_manager.user_loader
def load_user(user_id):
    from backend.models import User
    return User.query.get(int(user_id))

# Root route
@app.route('/')
def index():
    return {"message": "Microfinance Platform API", "status": "running"}, 200

# Health check endpoint
@app.route('/api/health')
def health_check():
    return {"status": "healthy"}, 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return {"error": "Resource not found"}, 404

@app.errorhandler(500)
def server_error(error):
    return {"error": "Internal server error"}, 500
