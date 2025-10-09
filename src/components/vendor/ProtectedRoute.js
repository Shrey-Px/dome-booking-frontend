// src/components/vendor/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import vendorApi from '../../services/vendorApi';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = vendorApi.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;