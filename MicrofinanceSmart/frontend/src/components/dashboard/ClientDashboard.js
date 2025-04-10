import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getDashboardMetrics, 
  getLoanStatistics, 
  getRecentActivity,
  getClientLoans,
  createLoanApplication
} from '../../services/api';
import { getCurrentUser } from '../../services/auth';
import DataVisualization from './DataVisualization';

const ClientDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loanStats, setLoanStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loans, setLoans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanFormData, setLoanFormData] = useState({
    amount: '',
    interest_rate: '5.0',
    term_months: '12',
    purpose: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const [metricsData, loansData] = await Promise.all([
          getDashboardMetrics(),
          getClientLoans()
        ]);
        setMetrics(metricsData.metrics);
        setLoans(loansData.loans);
      } catch (err) {
        setError(err.message);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleLoanFormChange = (e) => {
    const { name, value } = e.target;
    setLoanFormData({ ...loanFormData, [name]: value });
  };

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Convert string values to appropriate types
      const loanData = {
        ...loanFormData,
        amount: parseFloat(loanFormData.amount),
        interest_rate: parseFloat(loanFormData.interest_rate),
        term_months: parseInt(loanFormData.term_months)
      };
      
      const response = await createLoanApplication(loanData);
      toast.success('Loan application submitted successfully!');
      
      // Reset form and hide it
      setLoanFormData({
        amount: '',
        interest_rate: '5.0',
        term_months: '12',
        purpose: ''
      });
      setShowLoanForm(false);
      
      // Refresh loans list
      const loansData = await getClientLoans();
      setLoans(loansData.loans || []);
      
      // If we got risk analysis, show it
      if (response.risk_analysis) {
        toast.info(`Risk analysis: ${response.risk_analysis.risk_category} risk, monthly payment estimated at $${response.risk_analysis.monthly_payment.toFixed(2)}`);
      }
      
    } catch (error) {
      console.error('Error submitting loan application:', error);
      toast.error('Failed to submit loan application');
    }
  };

  const renderOverviewTab = () => (
    <div className="overview-tab">
      <div className="dashboard-welcome">
        <h1>Client Dashboard</h1>
        <p>Welcome back, {user?.first_name}! Here's an overview of your account.</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading dashboard data...</div>
      ) : (
        <>
          <div className="metrics-cards">
            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="metric-content">
                <h3>Total Loan Amount</h3>
                <div className="metric-value">${metrics?.total_loan_amount?.toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div className="metric-content">
                <h3>Total Paid</h3>
                <div className="metric-value">${metrics?.total_paid?.toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <div className="metric-content">
                <h3>Remaining Balance</h3>
                <div className="metric-value">${metrics?.remaining_amount?.toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div className="metric-content">
                <h3>Active Loans</h3>
                <div className="metric-value">{metrics?.active_loans_count || 0}</div>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Your Loans</h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowLoanForm(!showLoanForm)}
                >
                  {showLoanForm ? 'Cancel' : 'Apply for a Loan'}
                </button>
              </div>
              
              {showLoanForm && (
                <div className="loan-application-form">
                  <h3>New Loan Application</h3>
                  <form onSubmit={handleLoanSubmit}>
                    <div className="form-group">
                      <label>Loan Amount ($)</label>
                      <input
                        type="number"
                        name="amount"
                        value={loanFormData.amount}
                        onChange={handleLoanFormChange}
                        required
                        min="100"
                        step="100"
                        className="form-control"
                        placeholder="Enter loan amount"
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Interest Rate (%)</label>
                        <input
                          type="number"
                          name="interest_rate"
                          value={loanFormData.interest_rate}
                          onChange={handleLoanFormChange}
                          required
                          min="1"
                          max="20"
                          step="0.1"
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Term (Months)</label>
                        <select
                          name="term_months"
                          value={loanFormData.term_months}
                          onChange={handleLoanFormChange}
                          required
                          className="form-control"
                        >
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                          <option value="36">36 months</option>
                          <option value="48">48 months</option>
                          <option value="60">60 months</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Purpose of Loan</label>
                      <textarea
                        name="purpose"
                        value={loanFormData.purpose}
                        onChange={handleLoanFormChange}
                        required
                        className="form-control"
                        placeholder="Describe the purpose of this loan"
                        rows="3"
                      ></textarea>
                    </div>
                    
                    <button type="submit" className="btn btn-success">
                      Submit Application
                    </button>
                  </form>
                </div>
              )}
              
              <div className="loan-list">
                {loans.length > 0 ? (
                  <table className="loan-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Status</th>
                        <th>Remaining</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id}>
                          <td>{loan.id}</td>
                          <td>${loan.amount.toLocaleString()}</td>
                          <td>{loan.purpose.substring(0, 30)}...</td>
                          <td>
                            <span className={`status-badge status-${loan.status}`}>
                              {loan.status}
                            </span>
                          </td>
                          <td>${loan.remaining.toLocaleString()}</td>
                          <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">
                    <p>You don't have any loans yet.</p>
                    {!showLoanForm && (
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => setShowLoanForm(true)}
                      >
                        Apply for your first loan
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-section">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        <i className={
                          activity.type === 'login' ? 'fas fa-sign-in-alt' :
                          activity.type === 'loan_application' ? 'fas fa-file-invoice' :
                          'fas fa-money-check'
                        }></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-action">
                          {activity.type === 'login' ? 'You logged in' :
                           activity.type === 'loan_application' ? 'You applied for a loan' :
                           'You made a payment'}
                        </div>
                        <div className="activity-time">{activity.timestamp}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">No recent activities found</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="client-dashboard">
      <div className="dashboard-header">
        <img 
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71" 
          alt="Financial Dashboard"
          className="dashboard-banner"
        />
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverviewTab()}
        
        {activeTab === 'payments' && (
          <div className="payments-tab">
            <h1>Payment History</h1>
            {loading ? (
              <div className="loading-spinner">Loading payment data...</div>
            ) : (
              <div className="payment-history">
                {loanStats?.payment_history && loanStats.payment_history.length > 0 ? (
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Loan ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanStats.payment_history.map((payment, index) => (
                        <tr key={index}>
                          <td>{new Date(payment.date).toLocaleDateString()}</td>
                          <td>{payment.loan_id}</td>
                          <td>${payment.amount.toLocaleString()}</td>
                          <td>
                            <span className={`status-badge status-${payment.status}`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">No payment history found</div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h1>Loan Analytics</h1>
            {loading ? (
              <div className="loading-spinner">Loading analytics data...</div>
            ) : (
              <>
                <div className="analytics-section">
                  <h2>Loan Status Distribution</h2>
                  <DataVisualization 
                    loanStats={loanStats} 
                    chartType="doughnut"
                    dataKey="status_distribution"
                  />
                </div>
                
                <div className="loan-summary">
                  <h2>Your Loan Summary</h2>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <h3>Total Active Loans</h3>
                      <div className="summary-value">
                        {loanStats?.status_distribution?.active || 0}
                      </div>
                    </div>
                    <div className="summary-card">
                      <h3>Pending Applications</h3>
                      <div className="summary-value">
                        {loanStats?.status_distribution?.pending || 0}
                      </div>
                    </div>
                    <div className="summary-card">
                      <h3>Completed Loans</h3>
                      <div className="summary-value">
                        {loanStats?.status_distribution?.completed || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
