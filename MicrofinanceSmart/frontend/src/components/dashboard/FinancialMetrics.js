import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const FinancialMetrics = ({ metrics }) => {
  // If no metrics data is available, show a message
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="financial-metrics empty-state">
        <h2>Financial Metrics</h2>
        <p>No financial metrics data available.</p>
      </div>
    );
  }

  // Extract financial metrics data if available
  const financialMetrics = metrics.financial_metrics || {};

  // Format loan status data for visualization
  const loanStatusData = {
    labels: ['Active Loans', 'Pending Loans', 'Completed Loans'],
    datasets: [
      {
        data: [
          metrics.active_loans || 0,
          metrics.pending_loans || 0,
          (metrics.total_loans || 0) - (metrics.active_loans || 0) - (metrics.pending_loans || 0)
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Revenue data for bar chart if available
  const hasRevenueData = financialMetrics.revenue && financialMetrics.revenue.length > 0;
  
  const revenueData = hasRevenueData ? {
    labels: financialMetrics.revenue.map(item => item.name),
    datasets: [
      {
        label: 'Revenue',
        data: financialMetrics.revenue.map(item => item.value),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  // Options for bar chart
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Breakdown',
      },
    },
  };

  return (
    <div className="financial-metrics">
      <div className="metrics-overview">
        <div className="metrics-card">
          <h3>Total Portfolio</h3>
          <div className="metrics-value">${metrics.total_loan_amount?.toLocaleString() || 0}</div>
          <div className="metrics-subtitle">Total amount of all loans</div>
        </div>
        
        <div className="metrics-card">
          <h3>Payments Collected</h3>
          <div className="metrics-value">${metrics.total_payments?.toLocaleString() || 0}</div>
          <div className="metrics-subtitle">Total payments received</div>
        </div>
        
        <div className="metrics-card">
          <h3>Clients</h3>
          <div className="metrics-value">{metrics.total_users || 0}</div>
          <div className="metrics-subtitle">Total number of clients</div>
        </div>
        
        <div className="metrics-card">
          <h3>Loans</h3>
          <div className="metrics-value">{metrics.total_loans || 0}</div>
          <div className="metrics-subtitle">Total number of loans</div>
        </div>
      </div>
      
      <div className="metrics-charts">
        <div className="chart-container">
          <h3>Loan Status Distribution</h3>
          <div className="chart-wrapper">
            <Doughnut data={loanStatusData} />
          </div>
        </div>
        
        {hasRevenueData && (
          <div className="chart-container">
            <h3>Revenue Metrics</h3>
            <div className="chart-wrapper">
              <Bar data={revenueData} options={barOptions} />
            </div>
          </div>
        )}
      </div>
      
      <div className="metrics-section">
        <h3>Key Financial Indicators</h3>
        <div className="metrics-table-container">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(financialMetrics).flatMap(([type, metrics]) => 
                metrics.map((metric, index) => (
                  <tr key={`${type}-${index}`}>
                    <td>{metric.name}</td>
                    <td>{type === 'roi' ? `${metric.value}%` : `$${metric.value.toLocaleString()}`}</td>
                    <td>{new Date(metric.date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
              {Object.keys(financialMetrics).length === 0 && (
                <tr>
                  <td colSpan="3" className="empty-table-message">No financial indicators available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialMetrics;
