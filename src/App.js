// src/App.js - Updated with Error Boundary and better structure
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import BookingPortal from './components/BookingPortal';
import CancellationPage from './components/CancellationPage';
import FacilityLoader from './components/FacilityLoader';
import NotFound from './components/NotFound';

function App() {
  return (
    <ErrorBoundary fallbackMessage="We're experiencing technical difficulties. Please try reloading the page.">
      <Router>
        <div className="App">
          <Routes>
            {/* Root redirect to vision-badminton for backward compatibility */}
            <Route path="/" element={<Navigate to="/vision-badminton" replace />} />
            
            {/* Legacy routes - redirect to facility-specific URLs */}
            <Route 
              path="/cancel-booking" 
              element={<Navigate to="/vision-badminton/cancel-booking" replace />} 
            />
            
            {/* Multi-tenant facility routes with error boundaries */}
            <Route 
              path="/:facilitySlug" 
              element={
                <ErrorBoundary fallbackMessage="There was an error loading the booking portal.">
                  <FacilityLoader>
                    <BookingPortal />
                  </FacilityLoader>
                </ErrorBoundary>
              } 
            />
            
            <Route 
              path="/:facilitySlug/cancel-booking" 
              element={
                <ErrorBoundary fallbackMessage="There was an error loading the cancellation page.">
                  <FacilityLoader>
                    <CancellationPage />
                  </FacilityLoader>
                </ErrorBoundary>
              } 
            />
            
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;