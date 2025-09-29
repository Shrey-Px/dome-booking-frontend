// src/components/FacilityLoader.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';

// Create Facility Context
const FacilityContext = createContext();

// Custom hook to use facility context
export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};

// Facility Loader Component
const FacilityLoader = ({ children }) => {
  const { facilitySlug } = useParams();
  const navigate = useNavigate();
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFacility();
  }, [facilitySlug]);

  const loadFacility = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading facility:', facilitySlug);
      
      const facilityData = await ApiService.getFacility(facilitySlug);
      
      console.log('Facility loaded:', facilityData);
      setFacility(facilityData);
      
      // Update document title
      document.title = `${facilityData.name} - DOME Booking`;
      
      // Apply facility branding
      if (facilityData.branding) {
        document.documentElement.style.setProperty('--primary-color', facilityData.branding.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', facilityData.branding.secondaryColor);
      }
      
    } catch (err) {
      console.error('Failed to load facility:', err);
      setError(err.message);
      
      // Redirect to 404 or facility list if facility not found
      if (err.message.includes('not found')) {
        navigate('/not-found', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facility information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Facility Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FacilityContext.Provider value={{ facility, facilitySlug, refreshFacility: loadFacility }}>
      {children}
    </FacilityContext.Provider>
  );
};

export default FacilityLoader;