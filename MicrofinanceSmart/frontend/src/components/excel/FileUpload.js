import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { uploadExcelFile, getExcelFiles, getAnalysisResults } from '../../services/api';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [excelFiles, setExcelFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    // Load the list of excel files when component mounts
    const fetchExcelFiles = async () => {
      try {
        setLoading(true);
        const response = await getExcelFiles();
        setExcelFiles(response.excel_files || []);
      } catch (error) {
        console.error('Error fetching Excel files:', error);
        toast.error('Failed to load Excel files');
      } finally {
        setLoading(false);
      }
    };

    fetchExcelFiles();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file is an Excel file
      if (!selectedFile.name.match(/\.(xls|xlsx)$/i)) {
        toast.error('Please select an Excel file (.xls or .xlsx)');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadExcelFile(formData);
      
      if (response?.file_id) {
        toast.success('File uploaded successfully');
        setSelectedFileId(response.file_id);
        await fetchAnalysisResults(response.file_id);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const fetchAnalysisResults = async (fileId) => {
    try {
      setLoadingResults(true);
      const results = await getAnalysisResults(fileId);
      setAnalysisResults(results);
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      toast.error('Failed to load analysis results');
      setAnalysisResults(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleFileSelect = async (fileId) => {
    setSelectedFileId(fileId);
    await fetchAnalysisResults(fileId);
  };

  // Render financial analysis results
  const renderFinancialAnalysis = () => {
    const financialData = analysisResults?.results?.financial;
    
    if (!financialData) return <div className="no-data">No financial analysis available</div>;
    
    return (
      <div className="financial-analysis">
        <h3>Financial Analysis</h3>
        
        {financialData.amount_columns && (
          <div className="section">
            <h4>Financial Columns Detected</h4>
            <ul className="detected-columns">
              {financialData.amount_columns.map((col, index) => (
                <li key={index}>{col}</li>
              ))}
            </ul>
          </div>
        )}
        
        {financialData.totals && Object.keys(financialData.totals).length > 0 && (
          <div className="section">
            <h4>Column Totals</h4>
            <div className="totals-grid">
              {Object.entries(financialData.totals).map(([column, value], index) => (
                <div key={index} className="total-item">
                  <div className="column-name">{column}</div>
                  <div className="column-value">${value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {financialData.time_series && Object.keys(financialData.time_series).length > 0 && (
          <div className="section">
            <h4>Time Series Analysis</h4>
            <div className="time-series-container">
              {Object.entries(financialData.time_series).map(([key, data], index) => (
                <div key={index} className="time-series-chart">
                  <h5>{key.replace(/_/g, ' ')}</h5>
                  <div className="chart-preview">
                    <div className="bar-chart-container">
                      {data.values.map((value, i) => (
                        <div 
                          key={i} 
                          className="bar-item" 
                          style={{ 
                            height: `${Math.min(100, value / Math.max(...data.values) * 100)}%` 
                          }}
                          title={`${data.dates[i]}: $${value.toLocaleString()}`}
                        ></div>
                      ))}
                    </div>
                    <div className="time-labels">
                      {data.dates.filter((_, i) => i % Math.ceil(data.dates.length / 5) === 0).map((date, i) => (
                        <div key={i} className="time-label">{date}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render commission analysis results
  const renderCommissionAnalysis = () => {
    const commissionData = analysisResults?.results?.commission;
    
    if (!commissionData) return <div className="no-data">No commission analysis available</div>;
    
    return (
      <div className="commission-analysis">
        <h3>Agent Commission Analysis</h3>
        
        <div className="commission-summary">
          <div className="summary-item">
            <div className="summary-label">Total Commissions</div>
            <div className="summary-value">${commissionData.total_commissions.toLocaleString()}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Agent Column</div>
            <div className="summary-value">{commissionData.agent_column}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Commission Column</div>
            <div className="summary-value">{commissionData.commission_column}</div>
          </div>
        </div>
        
        {commissionData.top_performers && Object.keys(commissionData.top_performers).length > 0 && (
          <div className="top-performers">
            <h4>Top Performing Agents</h4>
            <table className="performers-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Total Commission</th>
                  <th>Average Commission</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(commissionData.top_performers).map(([agent, data], index) => (
                  <tr key={index}>
                    <td>{agent}</td>
                    <td>${data.total_commission.toLocaleString()}</td>
                    <td>${data.average_commission.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {commissionData.agent_commissions && Object.keys(commissionData.agent_commissions).length > 0 && (
          <div className="agent-commissions">
            <h4>All Agent Commissions</h4>
            <div className="agent-commission-chart">
              {Object.entries(commissionData.agent_commissions)
                .sort((a, b) => b[1].total_commission - a[1].total_commission)
                .map(([agent, data], index) => (
                  <div key={index} className="agent-bar">
                    <div className="agent-name">{agent}</div>
                    <div 
                      className="agent-bar-fill" 
                      style={{ 
                        width: `${(data.total_commission / commissionData.total_commissions) * 100}%` 
                      }}
                    >
                      ${data.total_commission.toLocaleString()}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-upload-container">
      <div className="upload-section">
        <h2>Upload Excel File for Analysis</h2>
        <p>
          Upload your Excel files for automated analysis using machine learning. 
          The system will analyze financial data, identify patterns, and extract meaningful insights.
        </p>
        
        <form onSubmit={handleUpload} className="upload-form">
          <div className="file-input-container">
            <input 
              type="file" 
              id="excel-file" 
              onChange={handleFileChange} 
              accept=".xls,.xlsx"
              className="file-input"
            />
            <label htmlFor="excel-file" className="file-label">
              <i className="fas fa-file-excel"></i>
              {file ? file.name : 'Choose Excel File'}
            </label>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary upload-btn"
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i> Upload & Analyze
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="file-explorer">
        <h2>Uploaded Files</h2>
        
        {loading ? (
          <div className="loading-spinner">Loading files...</div>
        ) : (
          <>
            <div className="files-list">
              {excelFiles.length > 0 ? (
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Upload Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelFiles.map((file) => (
                      <tr 
                        key={file.id} 
                        className={selectedFileId === file.id ? 'selected-file' : ''}
                      >
                        <td>{file.filename}</td>
                        <td>{new Date(file.upload_date).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${file.analysis_complete ? 'status-completed' : 'status-pending'}`}>
                            {file.analysis_complete ? 'Analysis Complete' : 'Processing'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleFileSelect(file.id)}
                            disabled={!file.analysis_complete}
                          >
                            View Results
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">No Excel files have been uploaded yet.</div>
              )}
            </div>
            
            {selectedFileId && (
              <div className="analysis-results">
                <h2>Analysis Results</h2>
                
                {loadingResults ? (
                  <div className="loading-spinner">Loading analysis results...</div>
                ) : (
                  analysisResults ? (
                    <div className="results-container">
                      <div className="file-info">
                        <h3>{analysisResults.file_info.filename}</h3>
                        <p>Uploaded: {new Date(analysisResults.file_info.upload_date).toLocaleString()}</p>
                      </div>
                      
                      <div className="analysis-tabs">
                        <div className="tabs-header">
                          <button 
                            className={`tab-btn ${!analysisResults.results.financial && !analysisResults.results.commission ? 'active' : ''}`}
                            onClick={() => {
                              const tabContent = document.querySelectorAll('.tab-content');
                              tabContent.forEach(content => content.classList.remove('active'));
                              document.getElementById('summary-tab').classList.add('active');

                              const tabBtns = document.querySelectorAll('.tab-btn');
                              tabBtns.forEach(btn => btn.classList.remove('active'));
                              document.querySelectorAll('.tab-btn')[0].classList.add('active');
                            }}
                          >
                            Summary
                          </button>
                          
                          {analysisResults.results.financial && (
                            <button 
                              className="tab-btn"
                              onClick={() => {
                                const tabContent = document.querySelectorAll('.tab-content');
                                tabContent.forEach(content => content.classList.remove('active'));
                                document.getElementById('financial-tab').classList.add('active');

                                const tabBtns = document.querySelectorAll('.tab-btn');
                                tabBtns.forEach(btn => btn.classList.remove('active'));
                                document.querySelectorAll('.tab-btn')[1].classList.add('active');
                              }}
                            >
                              Financial Analysis
                            </button>
                          )}
                          
                          {analysisResults.results.commission && (
                            <button 
                              className="tab-btn"
                              onClick={() => {
                                const tabContent = document.querySelectorAll('.tab-content');
                                tabContent.forEach(content => content.classList.remove('active'));
                                document.getElementById('commission-tab').classList.add('active');

                                const tabBtns = document.querySelectorAll('.tab-btn');
                                tabBtns.forEach(btn => btn.classList.remove('active'));
                                document.querySelectorAll('.tab-btn')[2].classList.add('active');
                              }}
                            >
                              Commission Analysis
                            </button>
                          )}
                        </div>
                        
                        <div className="tabs-content">
                          <div id="summary-tab" className="tab-content active">
                            <h3>File Summary</h3>
                            {analysisResults.results.summary && (
                              <div className="summary-content">
                                <div className="summary-stats">
                                  <div className="stat-item">
                                    <span className="stat-label">Rows:</span>
                                    <span className="stat-value">{analysisResults.results.summary.rows}</span>
                                  </div>
                                  <div className="stat-item">
                                    <span className="stat-label">Columns:</span>
                                    <span className="stat-value">{analysisResults.results.summary.columns}</span>
                                  </div>
                                </div>
                                
                                <div className="summary-section">
                                  <h4>Column Names</h4>
                                  <div className="columns-list">
                                    {analysisResults.results.summary.column_names.map((col, index) => (
                                      <div key={index} className="column-name-chip">{col}</div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="summary-section">
                                  <h4>Data Types</h4>
                                  <div className="data-types-grid">
                                    {Object.entries(analysisResults.results.summary.data_types).map(([col, type], index) => (
                                      <div key={index} className="data-type-item">
                                        <div className="column-name">{col}</div>
                                        <div className={`data-type ${type}`}>{type}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="summary-section">
                                  <h4>Sample Data</h4>
                                  <div className="sample-data-container">
                                    <table className="sample-data-table">
                                      <thead>
                                        <tr>
                                          {analysisResults.results.summary.column_names.map((col, index) => (
                                            <th key={index}>{col}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {analysisResults.results.summary.sample_data.map((row, rowIndex) => (
                                          <tr key={rowIndex}>
                                            {analysisResults.results.summary.column_names.map((col, colIndex) => (
                                              <td key={colIndex}>{row[col]}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {analysisResults.results.financial && (
                            <div id="financial-tab" className="tab-content">
                              {renderFinancialAnalysis()}
                            </div>
                          )}
                          
                          {analysisResults.results.commission && (
                            <div id="commission-tab" className="tab-content">
                              {renderCommissionAnalysis()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-data">No analysis results available for this file.</div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
