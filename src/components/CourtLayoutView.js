// src/components/CourtLayoutView.js - Vision Badminton Exact Layout
import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFacility } from './FacilityLoader';
import ApiService from '../services/api';

const CourtLayoutView = ({ onBookingSelect, selectedDate, setSelectedDate }) => {
  const { facility, facilitySlug } = useFacility();
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (facilitySlug) {
      loadAvailability();
    }
  }, [selectedDate, facilitySlug]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await ApiService.getAvailability(facilitySlug, dateStr);
      
      if (data && data.availability) {
        setAvailability(data.availability);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
  };

  const getAvailableSlots = (courtId) => {
    const courtAvailability = availability[courtId] || {};
    return Object.values(courtAvailability).filter(isAvailable => isAvailable).length;
  };

  const handleCourtClick = (court) => {
    if (onBookingSelect) {
      onBookingSelect({ court, date: selectedDate });
    }
  };

  // Get court by ID from facility
  const getCourtById = (courtId) => {
    return facility?.courts?.find(c => c.id === courtId || c.name === courtId);
  };

  const renderCourt = (courtIdentifier, emptySpace = false) => {
    // Handle empty spaces in grid
    if (emptySpace) {
      return <div key={`empty-${Math.random()}`} />;
    }

    const court = getCourtById(courtIdentifier);
    
    if (!court) return null;

    const availableSlots = getAvailableSlots(court.id);
    const isPickleball = court.sport === 'Pickleball';
    const price = court.pricing?.courtRental || 25;

    return (
      <div
        key={court.id}
        onClick={() => handleCourtClick(court)}
        className="cursor-pointer transition-all hover:shadow-xl hover:scale-105"
        style={{
          border: `3px solid ${isPickleball ? '#3B82F6' : '#10B981'}`,
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: '#FFFFFF',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}
      >
        {/* Sport Badge */}
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor: isPickleball ? '#DBEAFE' : '#D1FAE5',
            color: isPickleball ? '#1E40AF' : '#065F46'
          }}
        >
          {isPickleball ? '🎾' : '🏸'}
        </div>

        {/* Court Number */}
        <div>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {court.name}
          </h3>
          <div className="text-sm text-gray-600 font-medium">
            {court.sport}
          </div>
        </div>

        {/* Availability & Price */}
        <div className="mt-6">
          <div 
            className="text-2xl font-bold mb-2"
            style={{ color: availableSlots > 0 ? (isPickleball ? '#3B82F6' : '#10B981') : '#EF4444' }}
          >
            {availableSlots > 0 ? `${availableSlots} Available` : 'Fully Booked'}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">
              ${price}/hour
            </span>
            <span className="text-sm text-gray-500">
              +tax & fees
            </span>
          </div>
        </div>

        {/* Net Illustration */}
        <div 
          className="mt-4 border-t-2 opacity-20"
          style={{ borderColor: isPickleball ? '#3B82F6' : '#10B981' }}
        />
      </div>
    );
  };

  if (loading && !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facility...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-gray-800 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar size={24} />
              <div>
                <h1 className="text-xl font-bold">{formatDate(selectedDate)}</h1>
                <p className="text-sm text-gray-300">
                  Vision Badminton Centre • 24 Courts
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => changeDate(-1)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <ChevronLeft size={20} />
                <span>Previous</span>
              </button>
              
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors font-semibold"
              >
                Today
              </button>
              
              <button
                onClick={() => changeDate(1)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <span>Next</span>
                <ChevronRight size={20} />
              </button>
              
              <button
                onClick={loadAvailability}
                disabled={loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Refresh availability"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Badminton Courts Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 py-3 z-10">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">🏸 Badminton Courts</h2>
                <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  $25/hour
                </span>
              </div>
              <div className="text-sm text-gray-600">
                22 courts total
              </div>
            </div>

            {/* Row 1: Courts 18, 17, 16 (3 courts) */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt(18)}
              {renderCourt(17)}
              {renderCourt(16)}
              {renderCourt(null, true)} {/* Empty space */}
            </div>

            {/* Row 2: Courts 15, 14, 13 (3 courts) */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt(15)}
              {renderCourt(14)}
              {renderCourt(13)}
              {renderCourt(null, true)} {/* Empty space */}
            </div>

            {/* Row 3: Courts 22, 12, 11, 10 (4 courts) */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt(22)}
              {renderCourt(12)}
              {renderCourt(11)}
              {renderCourt(10)}
            </div>

            {/* Row 4: Courts 21, 9, 8, 7 (4 courts) */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt(21)}
              {renderCourt(9)}
              {renderCourt(8)}
              {renderCourt(7)}
            </div>

            {/* Row 5: Courts 20, 6, 5, 4 (4 courts) */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt(20)}
              {renderCourt(6)}
              {renderCourt(5)}
              {renderCourt(4)}
            </div>

            {/* Row 6: Courts 19, 3, 2, 1 (4 courts) */}
            <div className="grid grid-cols-4 gap-6">
              {renderCourt(19)}
              {renderCourt(3)}
              {renderCourt(2)}
              {renderCourt(1)}
            </div>
          </div>

          {/* Pickleball Courts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 py-3 z-10">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">🎾 Pickleball Courts</h2>
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  $30/hour
                </span>
              </div>
              <div className="text-sm text-gray-600">
                2 courts total
              </div>
            </div>

            {/* Row 7: Court P1 */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {renderCourt('Court P1')}
              {renderCourt(null, true)}
              {renderCourt(null, true)}
              {renderCourt(null, true)}
            </div>

            {/* Row 8: Court P2 */}
            <div className="grid grid-cols-4 gap-6">
              {renderCourt('Court P2')}
              {renderCourt(null, true)}
              {renderCourt(null, true)}
              {renderCourt(null, true)}
            </div>
          </div>

          {/* Legend & Info */}
          <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Court Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Court Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-3 rounded" style={{ borderColor: '#10B981', borderWidth: '3px' }}></div>
                    <span className="text-gray-700">Badminton Courts (22) - $25/hour</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-3 rounded" style={{ borderColor: '#3B82F6', borderWidth: '3px' }}></div>
                    <span className="text-gray-700">Pickleball Courts (2) - $30/hour</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Operating Hours</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Weekdays: 8:00 AM - 8:00 PM</div>
                  <div>Weekends: 6:00 AM - 10:00 PM</div>
                  <div className="mt-3 text-xs text-gray-500">
                    + 1% service fee + 13% tax
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourtLayoutView;