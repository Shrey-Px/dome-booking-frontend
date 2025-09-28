// src/components/CancellationModal.js
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, Clock, MapPin } from 'lucide-react';
import ApiService from '../services/api';

const CancellationModal = ({ bookingId, isOpen, onClose, onSuccess, onRefreshAvailability }) => {
  const [booking, setBooking] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoursUntilBooking, setHoursUntilBooking] = useState(0);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBookingDetails();
    }
  }, [isOpen, bookingId]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ApiService.getCancellationDetails(bookingId);
      setBooking(data.booking);
      setCanCancel(data.canCancel);
      setHoursUntilBooking(data.hoursUntilBooking);
    } catch (err) {
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancellation = async () => {
    try {
      setLoading(true);
      setError(null);

      await ApiService.cancelBooking(bookingId);
      
      // Call the refresh callback if provided
      if (onRefreshAvailability) {
        onRefreshAvailability();
      }
      
      onSuccess('Booking cancelled successfully! A confirmation email has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const formatBookingDate = (dateValue) => {
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const formatBookingTime = (timeValue) => {
    try {
      if (timeValue instanceof Date || typeof timeValue === 'string') {
        const date = new Date(timeValue);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
      }
      return timeValue;
    } catch (error) {
      console.error('Time formatting error:', error);
      return 'Invalid time';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#1E293B' }}>
          <h3 className="text-lg font-semibold text-white">Cancel Booking</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading booking details...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {booking && !loading && (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin size={16} className="mr-2" />
                    <span>{booking.fieldName || `Court ${booking.courtNumber}`} - Vision Badminton Centre</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2" />
                    <span>{formatBookingDate(booking.bookingDate || booking.startTime)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span>
                      {formatBookingTime(booking.startTime)} - {formatBookingTime(booking.endTime)}
                    </span>
                  </div>
                </div>
              </div>
              
              {canCancel ? (
                <div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle size={20} className="text-yellow-500 mr-2" />
                      <div>
                        <p className="text-yellow-700 font-medium">Confirm Cancellation</p>
                        <p className="text-yellow-600 text-sm">
                          Are you sure you want to cancel this booking? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      No, Keep Booking
                    </button>
                    <button
                      onClick={handleCancellation}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle size={20} className="text-red-500 mr-2" />
                    <div>
                      <p className="text-red-700 font-medium">Cannot Cancel Booking</p>
                      <p className="text-red-600 text-sm">
                        This booking cannot be cancelled as it's within 24 hours of the scheduled time.
                        {hoursUntilBooking > 0 && (
                          <span> Time until booking: {Math.floor(hoursUntilBooking)} hours {Math.floor((hoursUntilBooking % 1) * 60)} minutes.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;