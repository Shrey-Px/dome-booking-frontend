// src/App.js - Updated with multi-tenant routing
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import BookingPortal from './components/BookingPortal';
import CancellationPage from './components/CancellationPage';
import FacilityLoader from './components/FacilityLoader';
import NotFound from './components/NotFound';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Root redirect to vision-badminton for backward compatibility */}
          <Route path="/" element={<Navigate to="/vision-badminton" replace />} />
          
          {/* Legacy routes - redirect to facility-specific URLs */}
          <Route path="/cancel-booking" element={<Navigate to="/vision-badminton/cancel-booking" replace />} />
          
          {/* Multi-tenant facility routes */}
          <Route path="/:facilitySlug" element={<FacilityLoader><BookingPortal /></FacilityLoader>} />
          <Route path="/:facilitySlug/cancel-booking" element={<FacilityLoader><CancellationPage /></FacilityLoader>} />
          
          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;