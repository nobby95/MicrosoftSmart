import logging
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer

logger = logging.getLogger(__name__)

class MicrofinanceML:
    def __init__(self, data=None):
        """
        Initialize ML service with optional data
        
        Args:
            data (pandas.DataFrame, optional): Initial data
        """
        self.data = data
        self.models = {}
        self.preprocessors = {}
        self.features = {}
        self.target = None
        self.prediction_type = None  # 'regression' or 'classification'
        
    def set_data(self, data):
        """
        Set data for analysis
        
        Args:
            data (pandas.DataFrame): Data to analyze
        """
        self.data = data
        
    def prepare_features(self, feature_cols, target_col, prediction_type='regression'):
        """
        Prepare features and target for model training
        
        Args:
            feature_cols (list): Column names to use as features
            target_col (str): Column name to predict
            prediction_type (str): 'regression' or 'classification'
            
        Returns:
            dict: Preparation results
        """
        if self.data is None or len(self.data) == 0:
            return {'error': 'No data available'}
        
        # Save feature and target info
        self.features[target_col] = feature_cols
        self.target = target_col
        self.prediction_type = prediction_type
        
        try:
            # Handle missing values in features
            X = self.data[feature_cols]
            y = self.data[target_col]
            
            # Create imputer for missing values
            imputer = SimpleImputer(strategy='mean')
            X_imputed = imputer.fit_transform(X)
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_imputed)
            
            # Save preprocessors
            self.preprocessors[target_col] = {
                'imputer': imputer,
                'scaler': scaler
            }
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42
            )
            
            return {
                'status': 'success',
                'X_train': X_train,
                'X_test': X_test,
                'y_train': y_train,
                'y_test': y_test,
                'feature_names': feature_cols,
                'target_name': target_col,
                'prediction_type': prediction_type
            }
        
        except Exception as e:
            logger.error(f"Error preparing features: {str(e)}")
            return {'error': f"Error preparing features: {str(e)}"}
    
    def train_model(self, feature_cols, target_col, prediction_type='regression', model_type='random_forest'):
        """
        Train a machine learning model
        
        Args:
            feature_cols (list): Column names to use as features
            target_col (str): Column name to predict
            prediction_type (str): 'regression' or 'classification'
            model_type (str): Type of model to train
            
        Returns:
            dict: Training results
        """
        # Prepare data
        prep_result = self.prepare_features(feature_cols, target_col, prediction_type)
        
        if 'error' in prep_result:
            return prep_result
        
        X_train = prep_result['X_train']
        y_train = prep_result['y_train']
        X_test = prep_result['X_test']
        y_test = prep_result['y_test']
        
        try:
            # Create and train model based on type
            if prediction_type == 'regression':
                if model_type == 'random_forest':
                    model = RandomForestRegressor(n_estimators=100, random_state=42)
                elif model_type == 'linear':
                    model = LinearRegression()
                else:
                    return {'error': f"Unknown regression model type: {model_type}"}
                
                # Train the model
                model.fit(X_train, y_train)
                
                # Evaluate on test set
                y_pred = model.predict(X_test)
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                # Save model
                self.models[target_col] = model
                
                # Feature importance for Random Forest
                if model_type == 'random_forest':
                    importance = model.feature_importances_
                    feature_importance = dict(zip(feature_cols, importance))
                else:
                    feature_importance = {}
                
                return {
                    'status': 'success',
                    'model_type': model_type,
                    'prediction_type': prediction_type,
                    'metrics': {
                        'mse': mse,
                        'rmse': np.sqrt(mse),
                        'r2': r2
                    },
                    'feature_importance': feature_importance
                }
                
            elif prediction_type == 'classification':
                # Convert target to categorical if needed
                if not pd.api.types.is_categorical_dtype(y_train):
                    y_train = y_train.astype('category')
                    y_test = y_test.astype('category')
                
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                
                # Train the model
                model.fit(X_train, y_train)
                
                # Evaluate on test set
                y_pred = model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                
                # Save model
                self.models[target_col] = model
                
                # Feature importance
                importance = model.feature_importances_
                feature_importance = dict(zip(feature_cols, importance))
                
                return {
                    'status': 'success',
                    'model_type': model_type,
                    'prediction_type': prediction_type,
                    'metrics': {
                        'accuracy': accuracy,
                        'classification_report': classification_report(y_test, y_pred, output_dict=True)
                    },
                    'feature_importance': feature_importance
                }
            
            else:
                return {'error': f"Unknown prediction type: {prediction_type}"}
                
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            return {'error': f"Error training model: {str(e)}"}
    
    def predict(self, data, target_col):
        """
        Make predictions using a trained model
        
        Args:
            data (dict or DataFrame): Data to predict on
            target_col (str): Target column/model to use
            
        Returns:
            dict: Prediction results
        """
        if target_col not in self.models:
            return {'error': f"No trained model for target: {target_col}"}
        
        if target_col not in self.features:
            return {'error': f"No feature information for target: {target_col}"}
        
        try:
            # Convert input to DataFrame if it's a dict
            if isinstance(data, dict):
                data = pd.DataFrame([data])
            
            # Get required features
            feature_cols = self.features[target_col]
            
            # Check if all required features are present
            missing_features = [f for f in feature_cols if f not in data.columns]
            if missing_features:
                return {'error': f"Missing required features: {missing_features}"}
            
            # Extract features
            X = data[feature_cols]
            
            # Preprocess features
            imputer = self.preprocessors[target_col]['imputer']
            scaler = self.preprocessors[target_col]['scaler']
            
            X_imputed = imputer.transform(X)
            X_scaled = scaler.transform(X_imputed)
            
            # Make prediction
            model = self.models[target_col]
            predictions = model.predict(X_scaled)
            
            # Format results
            if self.prediction_type == 'regression':
                return {
                    'status': 'success',
                    'predictions': predictions.tolist()
                }
            else:  # classification
                return {
                    'status': 'success',
                    'predictions': predictions.tolist(),
                    'prediction_probabilities': model.predict_proba(X_scaled).tolist()
                }
                
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            return {'error': f"Error making predictions: {str(e)}"}
    
    def analyze_loan_risk(self, loan_data):
        """
        Analyze loan risk for a given loan application
        
        Args:
            loan_data (dict): Loan application data
            
        Returns:
            dict: Risk analysis results
        """
        required_fields = ['amount', 'term_months', 'interest_rate']
        
        # Check for required fields
        missing_fields = [f for f in required_fields if f not in loan_data]
        if missing_fields:
            return {'error': f"Missing required fields: {missing_fields}"}
        
        try:
            # Extract key features
            amount = float(loan_data['amount'])
            term = int(loan_data['term_months'])
            interest = float(loan_data['interest_rate'])
            
            # Simple risk scoring (for demonstration)
            # In a real system, this would use a trained model
            
            # Risk factors
            amount_factor = min(1.0, amount / 10000)  # Higher amount = higher risk
            term_factor = min(1.0, term / 36)  # Longer term = higher risk
            interest_factor = max(0.0, 1.0 - (interest / 20))  # Lower interest = higher risk
            
            # Overall risk score (0-100)
            risk_score = (amount_factor * 0.5 + term_factor * 0.3 + interest_factor * 0.2) * 100
            
            # Risk category
            if risk_score < 30:
                risk_category = 'Low'
                approval_recommended = True
            elif risk_score < 70:
                risk_category = 'Medium'
                approval_recommended = risk_score < 50
            else:
                risk_category = 'High'
                approval_recommended = False
            
            # Monthly payment calculation
            monthly_rate = interest / 100 / 12
            monthly_payment = (amount * monthly_rate * (1 + monthly_rate) ** term) / ((1 + monthly_rate) ** term - 1)
            
            return {
                'status': 'success',
                'risk_score': risk_score,
                'risk_category': risk_category,
                'approval_recommended': approval_recommended,
                'monthly_payment': monthly_payment,
                'total_payment': monthly_payment * term,
                'total_interest': (monthly_payment * term) - amount
            }
            
        except Exception as e:
            logger.error(f"Error analyzing loan risk: {str(e)}")
            return {'error': f"Error analyzing loan risk: {str(e)}"}
    
    def segment_customers(self, data, n_clusters=3):
        """
        Segment customers using clustering
        
        Args:
            data (DataFrame): Customer data
            n_clusters (int): Number of clusters
            
        Returns:
            dict: Segmentation results
        """
        if data is None or len(data) == 0:
            return {'error': 'No data available'}
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return {'error': 'Need at least 2 numeric columns for clustering'}
        
        try:
            # Prepare data
            X = data[numeric_cols]
            
            # Handle missing values
            imputer = SimpleImputer(strategy='mean')
            X_imputed = imputer.fit_transform(X)
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_imputed)
            
            # Apply KMeans clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = kmeans.fit_predict(X_scaled)
            
            # Add cluster labels to original data
            data_with_clusters = data.copy()
            data_with_clusters['cluster'] = clusters
            
            # Get cluster statistics
            cluster_stats = []
            for i in range(n_clusters):
                cluster_data = data_with_clusters[data_with_clusters['cluster'] == i]
                
                # Calculate statistics for numeric columns
                stats = {}
                for col in numeric_cols:
                    stats[col] = {
                        'mean': float(cluster_data[col].mean()),
                        'median': float(cluster_data[col].median()),
                        'min': float(cluster_data[col].min()),
                        'max': float(cluster_data[col].max())
                    }
                
                cluster_stats.append({
                    'cluster_id': i,
                    'size': len(cluster_data),
                    'percentage': len(cluster_data) / len(data) * 100,
                    'statistics': stats
                })
            
            return {
                'status': 'success',
                'n_clusters': n_clusters,
                'cluster_stats': cluster_stats,
                'cluster_labels': clusters.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error segmenting customers: {str(e)}")
            return {'error': f"Error segmenting customers: {str(e)}"}
