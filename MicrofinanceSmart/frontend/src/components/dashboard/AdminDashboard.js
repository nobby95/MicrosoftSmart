import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getDashboardMetrics, 
  getLoanStatistics, 
  getRecentActivity 
} from '../../services/api';
import FinancialMetrics from './FinancialMetrics';
import DataVisualization from './DataVisualization';
import FileUpload from '../excel/FileUpload';
import MessageCenter from '../messaging/MessageCenter';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loanStats, setLoanStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard metrics
        const metricsData = await getDashboardMetrics();
        setMetrics(metricsData.metrics);
        
        // Fetch loan statistics
        const loanStatsData = await getLoanStatistics();
        setLoanStats(loanStatsData.loan_stats);
        
        // Fetch recent activity
        const activityData = await getRecentActivity();
        setActivities(activityData.activities || []);
        setRecentLoans(activityData.recent_loans || []);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderOverviewTab = () => (
    <div className="overview-tab">
      <div className="dashboard-welcome">
        <h1>Admin Dashboard</h1>
        <p>Welcome to the MicroFinance SaaS Platform. Here's an overview of your system.</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading dashboard data...</div>
      ) : (
        <>
          <div className="metrics-cards">
            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="metric-content">
                <h3>Total Clients</h3>
                <div className="metric-value">{metrics?.total_users || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <div className="metric-content">
                <h3>Active Loans</h3>
                <div className="metric-value">{metrics?.active_loans || 0}</div>
              </div>
            </div>

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
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div className="metric-content">
                <h3>Pending Applications</h3>
                <div className="metric-value">{metrics?.pending_loans || 0}</div>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="dashboard-section">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        <i className={
                          activity.type === 'login' ? 'fas fa-sign-in-alt' :
                          activity.type === 'loan_application' ? 'fas fa-file-invoice' :
                          'fas fa-money-check'
                        }></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-user">{activity.username}</div>
                        <div className="activity-action">
                          {activity.type === 'login' ? 'Logged in' :
                           activity.type === 'loan_application' ? 'Applied for a loan' :
                           'Made a payment'}
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

            <div className="dashboard-section">
              <h2>Recent Loan Applications</h2>
              <div className="loan-list">
                {recentLoans.length > 0 ? (
                  <table className="loan-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLoans.map((loan) => (
                        <tr key={loan.loan_id}>
                          <td>{loan.loan_id}</td>
                          <td>{loan.username}</td>
                          <td>${loan.amount.toLocaleString()}</td>
                          <td>
                            <span className={`status-badge status-${loan.status}`}>
                              {loan.status}
                            </span>
                          </td>
                          <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">No recent loans found</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <img 
          src="https://images.unsplash.com/photo-1542744173-05336fcc7ad4" 
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
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`tab-button ${activeTab === 'excel' ? 'active' : ''}`}
            onClick={() => setActiveTab('excel')}
          >
            Excel Analysis
          </button>
          <button 
            className={`tab-button ${activeTab === 'messaging' ? 'active' : ''}`}
            onClick={() => setActiveTab('messaging')}
          >
            Client Messaging
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverviewTab()}
        
        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h1>Financial Analytics</h1>
            {loading ? (
              <div className="loading-spinner">Loading analytics data...</div>
            ) : (
              <>
                <FinancialMetrics metrics={metrics} />
                <DataVisualization loanStats={loanStats} />
              </>
            )}
          </div>
        )}
        
        {activeTab === 'excel' && (
          <div className="excel-tab">
            <h1>Excel Data Analysis</h1>
            <FileUpload />
          </div>
        )}
        
        {activeTab === 'messaging' && (
          <div className="messaging-tab">
            <h1>Client Messaging</h1>
            <MessageCenter isAdmin={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
