import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

class ExcelProcessor:
    def __init__(self, file_path):
        """
        Initialize Excel processor with file path
        
        Args:
            file_path (str): Path to Excel file
        """
        self.file_path = file_path
        self.data = None
        self.summary = {}
        self.columns = []
        
    def load_data(self):
        """
        Load data from Excel file
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.data = pd.read_excel(self.file_path)
            self.columns = self.data.columns.tolist()
            logger.info(f"Successfully loaded Excel file with {len(self.data)} rows and {len(self.columns)} columns")
            return True
        except Exception as e:
            logger.error(f"Error loading Excel file: {str(e)}")
            return False
    
    def get_basic_stats(self):
        """
        Get basic statistics for numerical columns
        
        Returns:
            dict: Basic statistics for each numerical column
        """
        if self.data is None:
            return {}
        
        stats = {}
        numeric_columns = self.data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            stats[col] = {
                'mean': float(self.data[col].mean()),
                'median': float(self.data[col].median()),
                'min': float(self.data[col].min()),
                'max': float(self.data[col].max()),
                'std': float(self.data[col].std()),
                'missing': int(self.data[col].isna().sum())
            }
        
        return stats
    
    def detect_data_types(self):
        """
        Detect data types of columns
        
        Returns:
            dict: Data types for each column
        """
        if self.data is None:
            return {}
        
        dtypes = {}
        for col in self.columns:
            if pd.api.types.is_numeric_dtype(self.data[col]):
                if all(self.data[col].dropna() == self.data[col].dropna().astype(int)):
                    dtypes[col] = 'integer'
                else:
                    dtypes[col] = 'float'
            elif pd.api.types.is_datetime64_dtype(self.data[col]):
                dtypes[col] = 'datetime'
            else:
                dtypes[col] = 'string'
        
        return dtypes
    
    def get_summary(self):
        """
        Get summary of the Excel data
        
        Returns:
            dict: Summary information about the data
        """
        if self.data is None:
            self.load_data()
        
        if self.data is None:
            return {'error': 'Failed to load data'}
        
        self.summary = {
            'rows': len(self.data),
            'columns': len(self.columns),
            'column_names': self.columns,
            'statistics': self.get_basic_stats(),
            'data_types': self.detect_data_types(),
            'missing_values': {col: int(self.data[col].isna().sum()) for col in self.columns},
            'sample_data': self.data.head(5).fillna('').to_dict('records')
        }
        
        return self.summary
    
    def analyze_financial_data(self):
        """
        Perform financial analysis on the data
        
        Returns:
            dict: Financial analysis results
        """
        if self.data is None:
            self.load_data()
        
        if self.data is None:
            return {'error': 'Failed to load data'}
        
        # Detect amount/financial columns (typically contains words like amount, price, cost, etc.)
        amount_columns = []
        for col in self.columns:
            if any(term in col.lower() for term in ['amount', 'price', 'cost', 'fee', 'payment', 'loan', 'principal', 'interest']):
                if pd.api.types.is_numeric_dtype(self.data[col]):
                    amount_columns.append(col)
        
        financial_analysis = {
            'amount_columns': amount_columns,
            'totals': {},
            'averages': {},
            'distributions': {}
        }
        
        # Calculate totals and averages for financial columns
        for col in amount_columns:
            financial_analysis['totals'][col] = float(self.data[col].sum())
            financial_analysis['averages'][col] = float(self.data[col].mean())
            
            # Create distribution of values in bins
            bins = 5
            hist, bin_edges = np.histogram(self.data[col].dropna(), bins=bins)
            bin_labels = [f"{bin_edges[i]:.2f}-{bin_edges[i+1]:.2f}" for i in range(len(bin_edges)-1)]
            financial_analysis['distributions'][col] = {
                'bins': bin_labels,
                'counts': hist.tolist()
            }
        
        # Time-based analysis if date columns exist
        date_columns = []
        for col in self.columns:
            # Check if column name suggests it's a date
            if any(term in col.lower() for term in ['date', 'time', 'period', 'day', 'month', 'year']):
                # Try to convert to datetime
                try:
                    self.data[f'{col}_dt'] = pd.to_datetime(self.data[col], errors='coerce')
                    if not self.data[f'{col}_dt'].isna().all():
                        date_columns.append(f'{col}_dt')
                except:
                    pass
        
        # If we found date columns, analyze time-based patterns
        if date_columns and amount_columns:
            financial_analysis['time_series'] = {}
            
            for date_col in date_columns:
                for amount_col in amount_columns:
                    # Group by month and calculate sum
                    try:
                        # Use original column name without _dt suffix for the key
                        orig_date_col = date_col.replace('_dt', '')
                        
                        # Group by month and year
                        monthly_data = self.data.groupby(pd.Grouper(key=date_col, freq='M'))[amount_col].sum()
                        
                        financial_analysis['time_series'][f"{orig_date_col}_{amount_col}_monthly"] = {
                            'dates': [dt.strftime('%Y-%m') for dt in monthly_data.index],
                            'values': monthly_data.tolist()
                        }
                    except Exception as e:
                        logger.error(f"Error in time series analysis: {str(e)}")
        
        return financial_analysis

    def extract_commission_data(self):
        """
        Extract commission data specifically from agent commission Excel files
        
        Returns:
            dict: Commission data extracted from the file
        """
        if self.data is None:
            self.load_data()
        
        if self.data is None:
            return {'error': 'Failed to load data'}
        
        # Look for agent and commission related columns
        agent_columns = []
        commission_columns = []
        
        for col in self.columns:
            col_lower = col.lower()
            if any(term in col_lower for term in ['agent', 'employee', 'staff', 'name']):
                agent_columns.append(col)
            if any(term in col_lower for term in ['commission', 'bonus', 'incentive', 'payout']):
                commission_columns.append(col)
        
        if not agent_columns or not commission_columns:
            return {'error': 'Could not identify agent or commission columns'}
        
        # Use the first identified columns
        agent_col = agent_columns[0]
        commission_col = commission_columns[0]
        
        # Extract agent commission data
        agent_commissions = {}
        for agent, group in self.data.groupby(agent_col):
            if pd.isna(agent):
                continue
            
            agent_commissions[str(agent)] = {
                'total_commission': float(group[commission_col].sum()),
                'average_commission': float(group[commission_col].mean()),
                'commission_count': int(len(group)),
                'max_commission': float(group[commission_col].max()),
                'min_commission': float(group[commission_col].min())
            }
        
        # Get top performers
        if agent_commissions:
            top_agents = sorted(
                agent_commissions.items(), 
                key=lambda x: x[1]['total_commission'], 
                reverse=True
            )[:5]
            
            top_performers = {
                agent: {
                    'total_commission': details['total_commission'],
                    'average_commission': details['average_commission']
                } for agent, details in top_agents
            }
        else:
            top_performers = {}
            
        return {
            'agent_commissions': agent_commissions,
            'top_performers': top_performers,
            'total_commissions': sum(ac['total_commission'] for ac in agent_commissions.values()) if agent_commissions else 0,
            'commission_column': commission_col,
            'agent_column': agent_col
        }

def save_uploaded_file(uploaded_file, upload_folder):
    """
    Save an uploaded file securely
    
    Args:
        uploaded_file: File object from request.files
        upload_folder: Folder to save the file in
        
    Returns:
        tuple: (success, filename or error message)
    """
    if uploaded_file.filename == '':
        return False, 'No selected file'
    
    try:
        # Secure the filename to prevent directory traversal attacks
        filename = secure_filename(uploaded_file.filename)
        
        # Add timestamp to ensure uniqueness
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        file_parts = os.path.splitext(filename)
        filename = f"{file_parts[0]}_{timestamp}{file_parts[1]}"
        
        file_path = os.path.join(upload_folder, filename)
        uploaded_file.save(file_path)
        
        return True, file_path
    except Exception as e:
        logger.error(f"Error saving uploaded file: {str(e)}")
        return False, f"Error saving file: {str(e)}"
