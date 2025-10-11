// src/components/CourtLayoutView.js - Vision Badminton Exact Layout
import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFacility } from './FacilityLoader';
import ApiService from '../services/api';

const CourtLayoutView = ({ onBookingSelect, selectedDate, setSelectedDate, viewMode, onViewModeChange }) => {
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
    
    // Determine status (changed threshold to 6)
    const status = availableSlots > 6 ? 'available' : 
                   availableSlots > 0 ? 'limited' : 
                   'full';
  
    return (
      <div
        key={court.id}
        onClick={() => handleCourtClick(court)}
        className="cursor-pointer transform transition-all hover:scale-105 hover:shadow-lg"
      >
        <div 
          className="aspect-[2/3] rounded-lg border-4 relative p-3"
          style={{
            maxWidth: '180px',
            margin: '0 auto',
            backgroundColor: status === 'available' ? '#F0FDF4' : 
                           status === 'limited' ? '#FEF3C7' : '#FEF2F2',
            borderColor: isPickleball ? '#3B82F6' : 
                        status === 'available' ? '#059669' : 
                        status === 'limited' ? '#F59E0B' : '#DC2626'
          }}
        >
          {/* Court Net Lines */}
          <div className="absolute inset-4">
            <div className="w-full h-full border-2 border-gray-400 relative">
              {/* Center line */}
              <div className="absolute left-0 right-0 border-t-2 border-gray-400" style={{ top: '50%' }}></div>
              {/* Service lines */}
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '25%' }}></div>
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '75%' }}></div>
              {/* Side lines */}
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '20%' }}></div>
              <div className="absolute top-0 bottom-0 border-r border-gray-300" style={{ right: '20%' }}></div>
            </div>
          </div>
          
          {/* Status Indicator Circle */}
          <div 
            className="absolute top-2 right-2 w-4 h-4 rounded-full"
            style={{
              backgroundColor: status === 'available' ? '#059669' : 
                             status === 'limited' ? '#F59E0B' : '#DC2626'
            }}
          ></div>
          
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
            </div>
          )}
        </div>
        
        {/* Court Info Below */}
        <div className="mt-3 text-center">
          <h3 className="font-semibold text-lg text-gray-900">
            {court.name}
          </h3>
          <p className="text-sm text-gray-600">
            {court.sport}
          </p>
          <p 
            className="text-sm font-medium"
            style={{
              color: status === 'available' ? '#059669' : 
                     status === 'limited' ? '#F59E0B' : '#DC2626'
            }}
          >
            {status === 'available' ? `${availableSlots} slots` :
             status === 'limited' ? `${availableSlots} left` :
             'Full'}
          </p>
        </div>
      </div>
    );
  };

  const renderPickleballCourt = (courtIdentifier) => {
    const court = getCourtById(courtIdentifier);
    
    if (!court) return null;
  
    const availableSlots = getAvailableSlots(court.id);
    const status = availableSlots > 6 ? 'available' : 
                   availableSlots > 0 ? 'limited' : 
                   'full';
  
    return (
      <div
        key={court.id}
        onClick={() => handleCourtClick(court)}
        className="cursor-pointer transform transition-all hover:scale-105 hover:shadow-lg"
      >
        {/* Horizontal layout - swap aspect ratio */}
        <div 
          className="aspect-[3/2] rounded-lg border-4 relative p-3"
          style={{
            maxWidth: '240px',
            margin: '0 auto',
            backgroundColor: status === 'available' ? '#F0FDF4' : 
                           status === 'limited' ? '#FEF3C7' : '#FEF2F2',
            borderColor: '#3B82F6'
          }}
        >
          {/* Horizontal Court Net Lines */}
          <div className="absolute inset-4">
            <div className="w-full h-full border-2 border-gray-400 relative">
              {/* Center line - vertical for horizontal court */}
              <div className="absolute top-0 bottom-0 border-l-2 border-gray-400" style={{ left: '50%' }}></div>
              {/* Service lines - vertical */}
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '25%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '75%' }}></div>
              {/* Side lines - horizontal */}
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '20%' }}></div>
              <div className="absolute left-0 right-0 border-b border-gray-300" style={{ bottom: '20%' }}></div>
            </div>
          </div>
          
          {/* Status Indicator Circle */}
          <div 
            className="absolute top-2 right-2 w-4 h-4 rounded-full"
            style={{
              backgroundColor: status === 'available' ? '#059669' : 
                             status === 'limited' ? '#F59E0B' : '#DC2626'
            }}
          ></div>
          
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
            </div>
          )}
        </div>
        
        {/* Court Info Below */}
        <div className="mt-3 text-center">
          <h3 className="font-semibold text-lg text-gray-900">
            {court.name}
          </h3>
          <p className="text-sm text-gray-600">
            {court.sport}
          </p>
          <p 
            className="text-sm font-medium"
            style={{
              color: status === 'available' ? '#059669' : 
                     status === 'limited' ? '#F59E0B' : '#DC2626'
            }}
          >
            {status === 'available' ? `${availableSlots} slots` :
             status === 'limited' ? `${availableSlots} left` :
             'Full'}
          </p>
        </div>
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
              {/* Logo - Match Calendar View Exactly */}
              <div className="flex items-center">
                <svg className="w-10 h-10 text-red-500 mr-2" viewBox="0 0 100 100" fill="currentColor">
                  <polygon points="20,80 50,20 80,80" />
                </svg>
                <div>
                  <div className="text-xl font-bold">
                    D<span className="text-red-500">O</span>ME
                  </div>
                  <div className="text-xs text-gray-300">Sports Booking</div>
                </div>
              </div>
  
              {/* View Toggle - Match Calendar View Icons Exactly */}
              {onViewModeChange && (
                <div className="flex bg-gray-700 rounded-lg p-1 ml-4">
                  <button
                    onClick={() => onViewModeChange('calendar')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-white text-gray-900'
                        : 'text-white hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Calendar</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('layout')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      viewMode === 'layout'
                        ? 'bg-white text-gray-900'
                        : 'text-white hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Layout</span>
                  </button>
                </div>
              )}
  
              {/* Facility Name */}
              <div className="text-lg font-semibold ml-4">
                Vision Badminton Centre
              </div>
            </div>
  
            {/* Date Navigation */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => changeDate(-1)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors font-semibold text-sm"
              >
                Today
              </button>
              
              <button
                onClick={() => changeDate(1)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
              
              <button
                onClick={loadAvailability}
                disabled={loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Refresh availability"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
  
          {/* Date Display Below */}
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-300 mt-1">
              22 Badminton Courts • 2 Pickleball Courts
            </p>
          </div>
        </div>
      </div>  
          {/* Date Display Below */}
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-300 mt-1">
              22 Badminton Courts • 2 Pickleball Courts
            </p>
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
            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(null, true)} {/* Empty space */}
              {renderCourt(18)}
              {renderCourt(17)}
              {renderCourt(16)}
            </div>

            {/* Row 2: Courts 15, 14, 13 (3 courts) */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(null, true)} {/* Empty space */}
              {renderCourt(15)}
              {renderCourt(14)}
              {renderCourt(13)}
            </div>

            {/* Row 3: Courts 22, 12, 11, 10 (4 courts) */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(22)}
              {renderCourt(12)}
              {renderCourt(11)}
              {renderCourt(10)}
            </div>

            {/* Row 4: Courts 21, 9, 8, 7 (4 courts) */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(21)}
              {renderCourt(9)}
              {renderCourt(8)}
              {renderCourt(7)}
            </div>

            {/* Row 5: Courts 20, 6, 5, 4 (4 courts) */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(20)}
              {renderCourt(6)}
              {renderCourt(5)}
              {renderCourt(4)}
            </div>

            {/* Row 6: Courts 19, 3, 2, 1 (4 courts) */}
            <div className="grid grid-cols-4 gap-4">
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

	    {/* Pickleball Courts - Vertical Stack (2 rows, 1 column) */}
	    <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
  	      {renderPickleballCourt('Court P1')}
  	      {renderPickleballCourt('Court P2')}
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