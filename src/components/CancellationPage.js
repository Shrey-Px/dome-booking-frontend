// src/components/CancellationPage.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CancellationModal from './CancellationModal';

const CancellationPage = () => {
  const location = useLocation();
  const [bookingId, setBookingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    
    if (id) {
      setBookingId(id);
      setShowModal(true);
    }
  }, [location]);

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setShowModal(false);
    
    // Trigger a custom event that calendar components can listen to
    window.dispatchEvent(new CustomEvent('bookingCancelled', {
      detail: { bookingId, message }
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    // Optionally redirect to home page
    window.location.href = '/';
  };

  const handleRefreshAvailability = () => {
    // Dispatch custom event for calendar refresh
    window.dispatchEvent(new CustomEvent('refreshAvailability'));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            D<span style={{ color: '#EF4444' }}>O</span>ME Sports
          </h1>
          <p className="text-gray-600">Booking Cancellation</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{successMessage}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-3 text-green-600 hover:text-green-800 underline"
            >
              Return to Home
            </button>
          </div>
        )}

        <CancellationModal
          bookingId={bookingId}
          isOpen={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onRefreshAvailability={handleRefreshAvailability}
        />
      </div>
    </div>
  );
};

export default CancellationPage;