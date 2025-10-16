// src/components/CourtLayoutView.js - With Time Slot Selection Modal
import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ChevronLeft, ChevronRight, List, Grid, X, Clock } from 'lucide-react';
import { useFacility } from './FacilityLoader';
import ApiService from '../services/api';
import appIcon from '../assets/images/app-icon.png';

const CourtLayoutView = ({ onBookingSelect, selectedDate, setSelectedDate, viewMode, onViewModeChange }) => {
  const { facility, facilitySlug } = useFacility();
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const headerRef = React.useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  
  // ✅ NEW: Time slot selection modal state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const getCourtById = (courtIdentifier) => {
    if (!facility?.courts) return null;
    
    if (typeof courtIdentifier === 'number') {
      return facility.courts.find(c => c.id === courtIdentifier);
    }
    
    if (typeof courtIdentifier === 'string') {
      return facility.courts.find(c => c.name === courtIdentifier);
    }
    
    return null;
  };

  // ✅ NEW: Get available time slots for a court
  const getAvailableTimeSlots = (courtId) => {
    const courtAvailability = availability[courtId] || {};
    const slots = [];
    
    Object.entries(courtAvailability).forEach(([time24, isAvailable]) => {
      if (isAvailable) {
        const time12 = convertTo12Hour(time24);
        slots.push({ time24, time12 });
      }
    });
    
    return slots.sort((a, b) => a.time24.localeCompare(b.time24));
  };

  // ✅ NEW: Convert 24-hour to 12-hour format
  const convertTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // ✅ UPDATED: Open time slot modal when court is clicked
  const handleCourtClick = (court) => {
    setSelectedCourtForBooking(court);
    setShowTimeModal(true);
  };

  // ✅ NEW: Handle time slot selection
  const handleTimeSlotSelect = (timeSlot) => {
    if (onBookingSelect && selectedCourtForBooking) {
      onBookingSelect({
        court: selectedCourtForBooking,
        date: selectedDate,
        time: timeSlot.time12,
        time24: timeSlot.time24,
        displayTime: timeSlot.time12
      });
    }
    setShowTimeModal(false);
    setSelectedCourtForBooking(null);
  };

  const AppIcon = ({ isMobile = false }) => (
    <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
      <img
        src={appIcon}
        alt="Dome Logo"
        className="w-6 h-6 md:w-8 md:h-8 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'flex';
        }}
      />
      <div
        className="w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bold text-white"
        style={{
          backgroundColor: '#EF4444',
          fontSize: isMobile ? '10px' : '12px',
          letterSpacing: '0.5px',
          display: 'none'
        }}
      >
        D
      </div>
    </div>
  );

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

  const renderCourt = (courtIdentifier, emptySpace = false) => {
    if (emptySpace) {
      return <div key={`empty-${Math.random()}`} />;
    }
  
    const court = getCourtById(courtIdentifier);
    
    if (!court) {
      console.warn('Court not found:', courtIdentifier);
      return null;
    }
  
    const availableSlots = getAvailableSlots(court.id);
    const isPickleball = court.sport === 'Pickleball';
    
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
          <div className="absolute inset-4">
            <div className="w-full h-full border-2 border-gray-400 relative">
              <div className="absolute left-0 right-0 border-t-2 border-gray-400" style={{ top: '50%' }}></div>
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '25%' }}></div>
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '75%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '20%' }}></div>
              <div className="absolute top-0 bottom-0 border-r border-gray-300" style={{ right: '20%' }}></div>
            </div>
          </div>
          
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
    
    if (!court) {
      console.warn('Pickleball court not found:', courtIdentifier);
      return null;
    }
  
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
          <div className="absolute inset-4">
            <div className="w-full h-full border-2 border-gray-400 relative">
              <div className="absolute top-0 bottom-0 border-l-2 border-gray-400" style={{ left: '50%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '25%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '75%' }}></div>
              <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '20%' }}></div>
              <div className="absolute left-0 right-0 border-b border-gray-300" style={{ bottom: '20%' }}></div>
            </div>
          </div>
          
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
    <div className="h-screen overflow-hidden" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header - Same as before */}
      <div
        ref={headerRef}
        className="text-white sticky top-0 z-10"
        style={{
          backgroundColor: '#1E293B',
          padding: isMobile ? '12px 16px' : '16px 24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className={`${isMobile ? '' : 'max-w-7xl mx-auto'}`}>
          {isMobile ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AppIcon isMobile />
                  <div className="font-bold text-lg">
                    D<span style={{ color: '#EF4444' }}>O</span>ME
                  </div>
                </div>
                {onViewModeChange && (
                  <button
                    onClick={() => onViewModeChange('calendar')}
                    className="p-2 bg-gray-700 rounded"
                  >
                    <List size={16} />
                  </button>
                )}
              </div>
  
              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-2 bg-gray-700 rounded">
                  <ChevronLeft size={16} />
                </button>
  
                <div className="flex-1 mx-2 px-3 py-2 bg-gray-700 rounded text-sm text-center">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
  
                <button onClick={() => changeDate(1)} className="p-2 bg-gray-700 rounded">
                  <ChevronRight size={16} />
                </button>
  
                <button
                  onClick={loadAvailability}
                  className="p-2 bg-gray-700 rounded ml-2"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <AppIcon />

                  {onViewModeChange && (
                    <div className="flex bg-gray-700 rounded-lg p-1 ml-2">
                      <button
                        onClick={() => onViewModeChange('calendar')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium ${
                          viewMode === 'calendar'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-gray-600'
                        }`}
                      >
                        <List size={14} />
                        <span>Calendar</span>
                      </button>
                      <button
                        onClick={() => onViewModeChange('layout')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium ${
                          viewMode === 'layout'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-gray-600'
                        }`}
                      >
                        <Grid size={14} />
                        <span>Layout</span>
                      </button>
                    </div>
                  )}

                  <div
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: '#334155', borderColor: '#475569' }}
                  >
                    <Calendar size={16} style={{ color: '#94A3B8' }} />
                    <button onClick={() => changeDate(-1)} className="p-1 rounded hover:bg-gray-600">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="font-medium px-3 min-w-[200px] text-center" style={{ fontSize: '14px' }}>
                      {formatDate(selectedDate)}
                    </span>
                    <button onClick={() => changeDate(1)} className="p-1 rounded hover:bg-gray-600">
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <button
                    onClick={loadAvailability}
                    className="p-2 rounded hover:bg-gray-700"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div
                className="font-bold"
                style={{ fontSize: '24px', letterSpacing: '0.05em' }}
              >
                D<span style={{ color: '#EF4444' }}>O</span>ME
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <div className="max-w-7xl mx-auto px-6 py-4 bg-white border-b">
          <h1 className="text-2xl font-bold text-gray-900 text-left">
            {facility?.name || 'Vision Badminton Centre'}
          </h1>
        </div>
      )}

      {/* Court Layout - Same as before */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 100px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Badminton Courts */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 py-3 z-10">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">🏸 Badminton Courts</h2>
                <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  $25/hour
                </span>
              </div>
              <div className="text-sm text-gray-600">22 courts total</div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(null, true)}
              {renderCourt(18)}
              {renderCourt(17)}
              {renderCourt(16)}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(null, true)}
              {renderCourt(15)}
              {renderCourt(14)}
              {renderCourt(13)}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(22)}
              {renderCourt(12)}
              {renderCourt(11)}
              {renderCourt(10)}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(21)}
              {renderCourt(9)}
              {renderCourt(8)}
              {renderCourt(7)}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {renderCourt(20)}
              {renderCourt(6)}
              {renderCourt(5)}
              {renderCourt(4)}
            </div>

            <div className="grid grid-cols-4 gap-4">
              {renderCourt(19)}
              {renderCourt(3)}
              {renderCourt(2)}
              {renderCourt(1)}
            </div>
          </div>

          {/* Pickleball Courts */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 py-3 z-10">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900">🎾 Pickleball Courts</h2>
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  $30/hour
                </span>
              </div>
              <div className="text-sm text-gray-600">2 courts total</div>
            </div>

            <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
              {renderPickleballCourt('Court P1')}
              {renderPickleballCourt('Court P2')}
            </div>
          </div>

          {/* Legend */}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Time Slot Selection Modal */}
      {showTimeModal && selectedCourtForBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Select Time Slot</h2>
                <p className="text-gray-600 mt-1">
                  {selectedCourtForBooking.name} • {selectedCourtForBooking.sport}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTimeModal(false);
                  setSelectedCourtForBooking(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {getAvailableTimeSlots(selectedCourtForBooking.id).length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg">No available time slots for this date</p>
                  <p className="text-gray-500 text-sm mt-2">Please select a different date or court</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {getAvailableTimeSlots(selectedCourtForBooking.id).map((slot) => (
                    <button
                      key={slot.time24}
                      onClick={() => handleTimeSlotSelect(slot)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-center"
                    >
                      <div className="font-semibold text-gray-900">{slot.time12}</div>
                      <div className="text-xs text-gray-500 mt-1">1 hour</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtLayoutView;