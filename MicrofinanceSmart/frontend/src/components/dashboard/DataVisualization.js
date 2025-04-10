import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title
);

const DataVisualization = ({ loanStats, chartType = 'all', dataKey = null }) => {
  const [chartData, setChartData] = useState({});

  // Define chart colors
  const chartColors = {
    backgrounds: [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ],
    borders: [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(255, 99, 132, 1)'
    ]
  };

  useEffect(() => {
    if (!loanStats) return;

    const prepareData = () => {
      const data = {};

      // Prepare loan status distribution data
      if (loanStats.status_distribution && (chartType === 'all' || chartType === 'doughnut' || dataKey === 'status_distribution')) {
        const statusLabels = Object.keys(loanStats.status_distribution);
        const statusValues = Object.values(loanStats.status_distribution);

        data.statusDistribution = {
          labels: statusLabels.map(label => label.charAt(0).toUpperCase() + label.slice(1)), // Capitalize
          datasets: [{
            data: statusValues,
            backgroundColor: chartColors.backgrounds.slice(0, statusLabels.length),
            borderColor: chartColors.borders.slice(0, statusLabels.length),
            borderWidth: 1
          }]
        };
      }

      // Prepare loan amount ranges data
      if (loanStats.amount_stats && loanStats.amount_stats.ranges && (chartType === 'all' || chartType === 'bar')) {
        const ranges = loanStats.amount_stats.ranges;
        
        data.amountRanges = {
          labels: ranges.map(r => r.range),
          datasets: [{
            label: 'Number of Loans',
            data: ranges.map(r => r.count),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        };
      }

      // Prepare monthly trend data
      if (loanStats.monthly_trend && (chartType === 'all' || chartType === 'line')) {
        const monthlyData = loanStats.monthly_trend;
        
        data.monthlyTrend = {
          labels: monthlyData.map(item => item.month),
          datasets: [{
            label: 'Number of Loans',
            data: monthlyData.map(item => item.count),
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.3,
            fill: true
          }]
        };
      }

      setChartData(data);
    };

    prepareData();
  }, [loanStats, chartType, dataKey, chartColors.backgrounds, chartColors.borders]);

  // If no loan stats data is available, show a message
  if (!loanStats || Object.keys(loanStats).length === 0) {
    return (
      <div className="data-visualization empty-state">
        <h2>Data Visualization</h2>
        <p>No loan statistics data available for visualization.</p>
      </div>
    );
  }

  // If specific chart type and data key is provided, render just that chart
  if (chartType !== 'all' && dataKey) {
    if (dataKey === 'status_distribution' && chartData.statusDistribution) {
      return (
        <div className="chart-container">
          {chartType === 'doughnut' && <Doughnut data={chartData.statusDistribution} />}
          {chartType === 'pie' && <Pie data={chartData.statusDistribution} />}
        </div>
      );
    }
    return <div className="no-data">Requested chart data not available</div>;
  }

  return (
    <div className="data-visualization">
      <div className="charts-grid">
        {chartData.statusDistribution && (
          <div className="chart-card">
            <h3>Loan Status Distribution</h3>
            <div className="chart-wrapper">
              <Doughnut data={chartData.statusDistribution} />
            </div>
          </div>
        )}
        
        {chartData.amountRanges && (
          <div className="chart-card">
            <h3>Loan Amount Ranges</h3>
            <div className="chart-wrapper">
              <Bar 
                data={chartData.amountRanges} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Loan Amount Distribution'
                    }
                  }
                }} 
              />
            </div>
          </div>
        )}
        
        {chartData.monthlyTrend && (
          <div className="chart-card">
            <h3>Monthly Loan Trend</h3>
            <div className="chart-wrapper">
              <Line 
                data={chartData.monthlyTrend} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Loans By Month'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
          </div>
        )}
      </div>
      
      {loanStats.amount_stats && (
        <div className="stats-summary">
          <h3>Loan Amount Statistics</h3>
          <div className="stats-cards">
            <div className="stats-card">
              <h4>Average Amount</h4>
              <div className="stats-value">${loanStats.amount_stats.average?.toLocaleString() || 0}</div>
            </div>
            <div className="stats-card">
              <h4>Minimum Amount</h4>
              <div className="stats-value">${loanStats.amount_stats.minimum?.toLocaleString() || 0}</div>
            </div>
            <div className="stats-card">
              <h4>Maximum Amount</h4>
              <div className="stats-value">${loanStats.amount_stats.maximum?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;
