from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from backend.app import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    phone_number = db.Column(db.String(20))
    role = db.Column(db.String(20), default='client')  # 'admin' or 'client'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    loans = db.relationship('Loan', backref='borrower', lazy=True)
    messages = db.relationship('Message', backref='recipient', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.role == 'admin'
    
    def __repr__(self):
        return f'<User {self.username}>'

class Loan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)
    term_months = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, active, completed
    purpose = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    
    # Relationships
    payments = db.relationship('Payment', backref='loan', lazy=True)
    
    def __repr__(self):
        return f'<Loan {self.id} - {self.amount}>'

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loan.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # pending, successful, failed
    
    def __repr__(self):
        return f'<Payment {self.id} - {self.amount}>'

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    send_time = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # pending, sent, failed
    message_type = db.Column(db.String(20), default='notification')  # notification, reminder, alert
    
    def __repr__(self):
        return f'<Message {self.id}>'

class ExcelFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(256), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    file_path = db.Column(db.String(512), nullable=False)
    analysis_complete = db.Column(db.Boolean, default=False)
    
    # Relationships
    analysis_results = db.relationship('AnalysisResult', backref='excel_file', lazy=True)
    
    def __repr__(self):
        return f'<ExcelFile {self.filename}>'

class AnalysisResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    excel_file_id = db.Column(db.Integer, db.ForeignKey('excel_file.id'), nullable=False)
    result_type = db.Column(db.String(64), nullable=False)  # summary, prediction, trend
    result_data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AnalysisResult {self.id} - {self.result_type}>'

class FinancialMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    value = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    metric_type = db.Column(db.String(64), nullable=False)  # revenue, expense, profit, roi
    
    def __repr__(self):
        return f'<FinancialMetric {self.name} - {self.value}>'

class ClientActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    activity_type = db.Column(db.String(64), nullable=False)  # login, loan_application, payment
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.JSON)
    
    def __repr__(self):
        return f'<ClientActivity {self.id} - {self.activity_type}>'
