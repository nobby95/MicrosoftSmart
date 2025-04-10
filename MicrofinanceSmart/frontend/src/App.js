import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Authentication Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Dashboard Components
import AdminDashboard from './components/dashboard/AdminDashboard';
import ClientDashboard from './components/dashboard/ClientDashboard';

// Common Components
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// Services
import { getCurrentUser, logout } from './services/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Add loading state
  if (loading) {
    return <div className="app-loader">Loading...</div>;
  }

  const handleLogin = (userData) => {
    setUser(userData);
    toast.success('Login successful!');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      toast.info('You have been logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  // Protected route component
  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  // Check if the current route is auth related
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app">
      <ToastContainer position="top-right" autoClose={3000} />

      {!isAuthRoute && <Navbar user={user} onLogout={handleLogout} />}

      <div className={`main-content ${!isAuthRoute ? 'with-sidebar' : ''}`}>
        {!isAuthRoute && user && <Sidebar user={user} />}

        <div className="content-wrapper">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } />
            <Route path="/register" element={
              user ? <Navigate to="/" /> : <Register />
            } />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                {user?.role === 'admin' ? 
                  <Navigate to="/admin/dashboard" /> : 
                  <Navigate to="/client/dashboard" />
                }
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Client Routes */}
            <Route path="/client/dashboard" element={
              <ProtectedRoute requiredRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
