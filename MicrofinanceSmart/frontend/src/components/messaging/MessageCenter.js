import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUsers, sendMessage, getMessages } from '../../services/api';

const MessageCenter = ({ isAdmin }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('notification');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    // If admin, load the list of users
    if (isAdmin) {
      fetchUsers();
    } else {
      // If client, load their messages
      fetchClientMessages();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await getUsers();
      
      if (response && response.users) {
        // Filter to get only client users
        const clientUsers = response.users.filter(user => user.role === 'client');
        setUsers(clientUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchClientMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await getMessages();
      
      if (response && response.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    // No need to fetch messages for the user here as we don't have an endpoint for that
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageContent.trim()) {
      toast.error('Message content cannot be empty');
      return;
    }
    
    if (isAdmin && !selectedUser) {
      toast.error('Please select a user to send the message to');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      let messageData = {
        content: messageContent,
        message_type: messageType
      };
      
      if (isAdmin) {
        messageData.user_id = selectedUser.id;
        
        // Add additional fields for payment reminder
        if (messageType === 'payment_reminder') {
          if (!paymentAmount || !dueDate) {
            toast.error('Payment amount and due date are required for payment reminders');
            setSendingMessage(false);
            return;
          }
          
          messageData.payment_amount = parseFloat(paymentAmount);
          messageData.due_date = dueDate;
        }
      }
      
      await sendMessage(messageData);
      toast.success('Message sent successfully');
      
      // Clear the form
      setMessageContent('');
      setPaymentAmount('');
      setDueDate('');
      
      // Refresh messages if client
      if (!isAdmin) {
        fetchClientMessages();
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Admin messaging interface
  const renderAdminInterface = () => (
    <div className="messaging-interface admin-messaging">
      <div className="user-selection">
        <h3>Select Client</h3>
        
        {loadingUsers ? (
          <div className="loading-spinner">Loading users...</div>
        ) : (
          <div className="users-list">
            {users.length > 0 ? (
              users.map(user => (
                <div 
                  key={user.id} 
                  className={`user-item ${selectedUser && selectedUser.id === user.id ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="user-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.first_name} {user.last_name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No clients available</div>
            )}
          </div>
        )}
      </div>
      
      <div className="message-composer">
        <h3>Send Message</h3>
        {selectedUser ? (
          <form onSubmit={handleSendMessage} className="message-form">
            <div className="message-header">
              <div className="recipient">
                To: {selectedUser.first_name} {selectedUser.last_name}
              </div>
              
              <div className="message-type-selector">
                <label htmlFor="message-type">Message Type:</label>
                <select 
                  id="message-type" 
                  value={messageType} 
                  onChange={(e) => setMessageType(e.target.value)}
                  className="form-control"
                >
                  <option value="notification">Notification</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
            </div>
            
            {messageType === 'payment_reminder' && (
              <div className="payment-reminder-fields">
                <div className="form-group">
                  <label htmlFor="payment-amount">Payment Amount ($):</label>
                  <input 
                    type="number" 
                    id="payment-amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="form-control"
                    min="0"
                    step="0.01"
                    required={messageType === 'payment_reminder'}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="due-date">Due Date:</label>
                  <input 
                    type="date" 
                    id="due-date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-control"
                    required={messageType === 'payment_reminder'}
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="message-content">Message:</label>
              <textarea 
                id="message-content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="form-control"
                rows="5"
                placeholder="Type your message here..."
                required
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={sendingMessage}
            >
              {sendingMessage ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Send Message
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="no-selection">
            <p>Please select a client from the list to send a message.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Client messaging interface
  const renderClientInterface = () => (
    <div className="messaging-interface client-messaging">
      <h3>Your Messages</h3>
      
      {loadingMessages ? (
        <div className="loading-spinner">Loading messages...</div>
      ) : (
        <div className="messages-container">
          {messages.length > 0 ? (
            <div className="message-list">
              {messages.map(message => (
                <div key={message.id} className={`message-item ${message.message_type}`}>
                  <div className="message-icon">
                    <i className={
                      message.message_type === 'notification' ? 'fas fa-bell' :
                      message.message_type === 'payment_reminder' ? 'fas fa-money-bill' :
                      'fas fa-exclamation-circle'
                    }></i>
                  </div>
                  <div className="message-content">
                    <div className="message-text">{message.content}</div>
                    <div className="message-meta">
                      <span className="message-time">{new Date(message.send_time).toLocaleString()}</span>
                      <span className={`message-status status-${message.status}`}>{message.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>You don't have any messages yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="message-center">
      <div className="message-center-header">
        <img 
          src={
            isAdmin 
              ? "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b" 
              : "https://images.unsplash.com/photo-1460925895917-afdab827c52f"
          } 
          alt="Messaging Center"
          className="message-banner"
        />
        <div className="message-center-title">
          <h2>{isAdmin ? "Client Messaging Center" : "Message Inbox"}</h2>
          <p>{isAdmin 
            ? "Send notifications, reminders, and alerts to your clients" 
            : "View important notifications and messages from the system"
          }</p>
        </div>
      </div>
      
      <div className="message-center-content">
        {isAdmin ? renderAdminInterface() : renderClientInterface()}
      </div>
    </div>
  );
};

export default MessageCenter;
