import os
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

def send_message(to_phone_number, message_content):
    """
    Send an SMS message using Twilio
    
    Args:
        to_phone_number (str): The recipient's phone number in E.164 format
        message_content (str): The content of the message to send
        
    Returns:
        tuple: (success: bool, message_sid: str or None, error: str or None)
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        logger.error("Twilio credentials not configured")
        return False, None, "Twilio credentials not configured"
    
    try:
        # Initialize Twilio client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Send the message
        message = client.messages.create(
            body=message_content,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone_number
        )
        
        logger.info(f"Message sent with SID: {message.sid}")
        return True, message.sid, None
        
    except TwilioRestException as e:
        logger.error(f"Twilio error: {str(e)}")
        return False, None, f"Twilio error: {str(e)}"
    
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return False, None, f"Error sending message: {str(e)}"

def send_loan_approval_notification(phone_number, client_name, loan_amount, loan_id):
    """
    Send loan approval notification to a client
    
    Args:
        phone_number (str): Client's phone number
        client_name (str): Client's name
        loan_amount (float): Approved loan amount
        loan_id (int): Loan ID
        
    Returns:
        tuple: Result from send_message function
    """
    message = (
        f"Hello {client_name}, your loan application #{loan_id} "
        f"for ${loan_amount:.2f} has been approved! "
        f"Log in to your account for more details."
    )
    return send_message(phone_number, message)

def send_payment_reminder(phone_number, client_name, payment_amount, due_date):
    """
    Send payment reminder to a client
    
    Args:
        phone_number (str): Client's phone number
        client_name (str): Client's name
        payment_amount (float): Payment amount due
        due_date (str): Due date of the payment
        
    Returns:
        tuple: Result from send_message function
    """
    message = (
        f"Hello {client_name}, this is a reminder that a payment of "
        f"${payment_amount:.2f} is due on {due_date}. "
        f"Please ensure timely payment to avoid late fees."
    )
    return send_message(phone_number, message)

def send_payment_confirmation(phone_number, client_name, payment_amount, loan_id):
    """
    Send payment confirmation to a client
    
    Args:
        phone_number (str): Client's phone number
        client_name (str): Client's name
        payment_amount (float): Payment amount
        loan_id (int): Loan ID
        
    Returns:
        tuple: Result from send_message function
    """
    message = (
        f"Hello {client_name}, we have received your payment of "
        f"${payment_amount:.2f} for loan #{loan_id}. Thank you!"
    )
    return send_message(phone_number, message)

def send_analysis_notification(phone_number, admin_name, file_name, summary=None):
    """
    Send notification when an Excel file has been analyzed
    
    Args:
        phone_number (str): Admin's phone number
        admin_name (str): Admin's name
        file_name (str): Name of the analyzed file
        summary (dict, optional): Summary statistics of the analysis
        
    Returns:
        tuple: Result from send_message function
    """
    # Basic message without summary details
    if not summary:
        message = (
            f"Hello {admin_name}, your Excel file '{file_name}' has been "
            f"successfully uploaded and analyzed. You can view the results "
            f"in your dashboard."
        )
    else:
        # Message with some basic summary details
        try:
            rows = summary.get('rows', 'N/A')
            columns = summary.get('columns', 'N/A')
            
            message = (
                f"Hello {admin_name}, your Excel file '{file_name}' has been "
                f"successfully analyzed. The file contains {rows} rows and "
                f"{columns} columns. Log in to view the full analysis."
            )
        except Exception:
            # Fallback to basic message if there's an error extracting summary data
            message = (
                f"Hello {admin_name}, your Excel file '{file_name}' has been "
                f"successfully uploaded and analyzed. You can view the results "
                f"in your dashboard."
            )
    
    return send_message(phone_number, message)
