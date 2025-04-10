import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  // Check if the current route is active
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <i className={`fas fa-${collapsed ? 'angle-right' : 'angle-left'}`}></i>
        </button>
      </div>
      
      <div className="sidebar-content">
        {user.role === 'admin' ? (
          <div className="sidebar-menu">
            <div className="menu-header">ADMIN MENU</div>
            <ul className="menu-items">
              <li className={isActive('/admin/dashboard') ? 'active' : ''}>
                <Link to="/admin/dashboard">
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={location.search === '?tab=analytics' ? 'active' : ''}>
                <Link to="/admin/dashboard?tab=analytics">
                  <i className="fas fa-chart-bar"></i>
                  <span>Analytics</span>
                </Link>
              </li>
              <li className={location.search === '?tab=excel' ? 'active' : ''}>
                <Link to="/admin/dashboard?tab=excel">
                  <i className="fas fa-file-excel"></i>
                  <span>Excel Analysis</span>
                </Link>
              </li>
              <li className={location.search === '?tab=messaging' ? 'active' : ''}>
                <Link to="/admin/dashboard?tab=messaging">
                  <i className="fas fa-comments"></i>
                  <span>Client Messaging</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/users">
                  <i className="fas fa-users"></i>
                  <span>User Management</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/loans">
                  <i className="fas fa-money-bill-alt"></i>
                  <span>Loan Management</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/reports">
                  <i className="fas fa-file-alt"></i>
                  <span>Reports</span>
                </Link>
              </li>
            </ul>
          </div>
        ) : (
          <div className="sidebar-menu">
            <div className="menu-header">CLIENT MENU</div>
            <ul className="menu-items">
              <li className={isActive('/client/dashboard') && !location.search ? 'active' : ''}>
                <Link to="/client/dashboard">
                  <i className="fas fa-home"></i>
                  <span>Overview</span>
                </Link>
              </li>
              <li className={location.search === '?tab=payments' ? 'active' : ''}>
                <Link to="/client/dashboard?tab=payments">
                  <i className="fas fa-credit-card"></i>
                  <span>Payments</span>
                </Link>
              </li>
              <li className={location.search === '?tab=analytics' ? 'active' : ''}>
                <Link to="/client/dashboard?tab=analytics">
                  <i className="fas fa-chart-pie"></i>
                  <span>Analytics</span>
                </Link>
              </li>
              <li>
                <Link to="/client/loans">
                  <i className="fas fa-hand-holding-usd"></i>
                  <span>My Loans</span>
                </Link>
              </li>
              <li>
                <Link to="/client/apply">
                  <i className="fas fa-file-invoice-dollar"></i>
                  <span>Apply for Loan</span>
                </Link>
              </li>
              <li>
                <Link to="/client/messages">
                  <i className="fas fa-envelope"></i>
                  <span>Messages</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
        
        <div className="sidebar-footer">
          <div className="user-info">
            {!collapsed && (
              <>
                <div className="user-name">{user.first_name} {user.last_name}</div>
                <div className="user-role">{user.role === 'admin' ? 'Administrator' : 'Client'}</div>
              </>
            )}
            <div className="user-avatar">
              <i className="fas fa-user"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
