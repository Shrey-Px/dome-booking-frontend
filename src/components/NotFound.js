// src/components/NotFound.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600">
            The facility or page you're looking for doesn't exist.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/vision-badminton')}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            Go to Vision Badminton Centre
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;