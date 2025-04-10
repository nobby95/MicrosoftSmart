import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Determine dashboard link based on user role
  const dashboardLink = user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <img 
            src="https://images.unsplash.com/photo-1484981138541-3d074aa97716" 
            alt="MicroFinance Logo"
            className="navbar-logo"
          />
          <span className="brand-text">MicroFinance SaaS</span>
        </Link>
      </div>
      
      <div className="navbar-menu">
        {user && (
          <>
            <Link to={dashboardLink} className="nav-link">
              <i className="fas fa-chart-line"></i>
              <span>Dashboard</span>
            </Link>
            
            {user.role === 'admin' && (
              <>
                <Link to="/admin/dashboard?tab=excel" className="nav-link">
                  <i className="fas fa-file-excel"></i>
                  <span>Excel Analysis</span>
                </Link>
                <Link to="/admin/dashboard?tab=messaging" className="nav-link">
                  <i className="fas fa-comments"></i>
                  <span>Messaging</span>
                </Link>
              </>
            )}
            
            {user.role === 'client' && (
              <>
                <Link to="/client/dashboard?tab=payments" className="nav-link">
                  <i className="fas fa-money-bill-wave"></i>
                  <span>Payments</span>
                </Link>
                <Link to="/client/dashboard?tab=analytics" className="nav-link">
                  <i className="fas fa-chart-pie"></i>
                  <span>Analytics</span>
                </Link>
              </>
            )}
          </>
        )}
      </div>
      
      <div className="navbar-right">
        {user ? (
          <div className="user-dropdown">
            <button className="user-dropdown-btn" onClick={toggleUserMenu}>
              <div className="user-avatar">
                <i className="fas fa-user"></i>
              </div>
              <span className="user-name">{user.first_name} {user.last_name}</span>
              <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'}`}></i>
            </button>
            
            {showUserMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="user-role">{user.role === 'admin' ? 'Administrator' : 'Client'}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <Link to={dashboardLink} className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
                
                <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <i className="fas fa-user-cog"></i>
                  <span>Profile</span>
                </Link>
                
                <div className="dropdown-divider"></div>
                
                <button className="dropdown-item logout-btn" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-outline-primary">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
