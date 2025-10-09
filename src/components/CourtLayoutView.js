// CourtLayoutView.js - Complete Fixed Version with all functions
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Clock, RefreshCw, X, List, Grid } from 'lucide-react';
import { useFacility } from './FacilityLoader';
import ApiService from '../services/api';

const CourtLayoutView = ({ onBookingSelect, selectedDate, setSelectedDate, viewMode = 'layout', onViewModeChange }) => {
  // Get facility context instead of hardcoding
  const { facility, facilitySlug } = useFacility();
  
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Get courts from facility with proper 2D grid positioning
  const courts = facility?.courts?.map((court, index) => ({
    id: court.id,
    name: court.name,
    sport: court.sport,
    position: {
      row: Math.floor(index / 5), // 5 courts per row
      col: index % 5
    }
  })) || [];

  // Get time slots from facility operating hours
  const getTimeSlots = () => {
    if (!facility?.operatingHours) {
      return ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
              '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', 
              '6:00 PM', '7:00 PM'];
    }

    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const hours = isWeekend ? facility.operatingHours.weekend : facility.operatingHours.weekday;
    const [startHour] = hours.start.split(':').map(Number);
    const [endHour] = hours.end.split(':').map(Number);
    
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      slots.push(`${displayHour}:00 ${period}`);
    }
    
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load availability when date or facility changes
  useEffect(() => {
    if (facilitySlug) {
      loadAvailability();
    }
  }, [selectedDate, facilitySlug]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Listen for booking events
  useEffect(() => {
    const handleBookingCancelled = () => {
      console.log('Booking cancelled, refreshing availability...');
      loadAvailability();
    };

    const handleRefreshAvailability = () => {
      console.log('Manual refresh requested...');
      loadAvailability();
    };

    window.addEventListener('bookingCancelled', handleBookingCancelled);
    window.addEventListener('refreshAvailability', handleRefreshAvailability);

    return () => {
      window.removeEventListener('bookingCancelled', handleBookingCancelled);
      window.removeEventListener('refreshAvailability', handleRefreshAvailability);
    };
  }, [selectedDate, facilitySlug]);

  const loadAvailability = async () => {
    if (!facilitySlug) {
      setError('Facility not loaded');
      return;
    }

    setLoading(true);
    setError(null);
  
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Loading availability for facility:', facilitySlug, 'date:', dateStr);
      const data = await ApiService.getAvailability(facilitySlug, dateStr);
    
      if (data && data.availability) {
        setAvailability(data.availability);
        setLastRefresh(new Date());
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
      setError(error.message);
      setAvailability({});
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

  const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateMobile = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
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
      setShowDatePicker(false);
    }
  };

  const handleDateSelect = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date >= today) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  const changeCalendarMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(calendarDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const generateCalendarGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = currentDate.toDateString() === selectedDate.toDateString();
      const isPast = currentDate < today;
      
      days.push({
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        isPast
      });
    }
    
    return days;
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isTimeSlotInPast = (timeSlot) => {
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDateOnly < today) return true;
    if (selectedDateOnly > today) return false;
    
    if (selectedDateOnly.getTime() === today.getTime()) {
      const time24 = convertTo24Hour(timeSlot);
      const [hours, minutes] = time24.split(':').map(Number);
      
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(hours, minutes, 0, 0);
      
      const currentTimePlus15 = new Date(now.getTime() + 15 * 60 * 1000);
      return slotDateTime <= currentTimePlus15;
    }
    
    return false;
  };

  const convertTo24Hour = (time12) => {
    try {
      const [time, period] = time12.split(' ');
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
    } catch (error) {
      console.error('Time conversion error:', error);
      return '00:00';
    }
  };

  const getAvailableTimesForCourt = (court) => {
    const availableTimes = [];
    
    timeSlots.forEach(time => {
      const time24 = convertTo24Hour(time);
      const isPastSlot = isTimeSlotInPast(time);
      const isAvailable = availability[court.id]?.[time24] === true;
      
      if (!isPastSlot && isAvailable) {
        availableTimes.push(time);
      }
    });
    
    return availableTimes;
  };

  const getCourtStatus = (court) => {
    const availableTimes = getAvailableTimesForCourt(court);
    
    if (availableTimes.length === 0) return 'unavailable';
    if (availableTimes.length <= 3) return 'limited';
    return 'available';
  };

  const handleCourtClick = (court) => {
    setSelectedCourt(court);
    setShowCourtModal(true);
  };

  const handleTimeSlotSelect = (time) => {
    const time24 = convertTo24Hour(time);
    
    if (onBookingSelect) {
      onBookingSelect({
        court: selectedCourt,
        time,
        time24,
        date: selectedDate,
        displayTime: time
      });
    }
    
    setShowCourtModal(false);
  };

  // App Icon Component
  const AppIcon = () => (
    <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
      <img 
        src={require('../assets/images/app-icon.png')}
        alt="Dome Logo" 
        className="w-6 h-6 md:w-8 md:h-8 object-contain"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
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

  // Show loading state if facility not loaded
  if (!facility || !facilitySlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facility...</p>
        </div>
      </div>
    );
  }

  // Show error if no courts available
  if (courts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">No courts available for this facility</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gray-800 text-white sticky top-0 z-10 shadow-md" style={{ padding: isMobile ? '12px 16px' : '16px 24px' }}>
        <div className={`${isMobile ? '' : 'max-w-7xl mx-auto'}`}>
          {isMobile ? (
            // Mobile Header
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AppIcon />
                  <div className="font-bold text-lg">
                    D<span style={{ color: '#EF4444' }}>O</span>ME
                  </div>
                </div>
                {onViewModeChange && (
                  <button onClick={() => onViewModeChange('calendar')} className="p-2 bg-gray-700 rounded">
                    <List size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-2 bg-gray-700 rounded">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex-1 mx-2 px-3 py-2 bg-gray-700 rounded text-sm">
                  {formatDateMobile(selectedDate)}
                </button>
                <button onClick={() => changeDate(1)} className="p-2 bg-gray-700 rounded">
                  <ChevronRight size={16} />
                </button>
                <button onClick={loadAvailability} disabled={loading} className="p-2 bg-gray-700 rounded ml-2">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ) : (
            // Desktop Header
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AppIcon />
                <h1 className="text-xl font-bold">{facility.name}</h1>
                
                {onViewModeChange && (
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => onViewModeChange('calendar')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm ${
                        viewMode === 'calendar' ? 'bg-white text-gray-900' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <List size={14} />
                      <span>Calendar</span>
                    </button>
                    <button
                      onClick={() => onViewModeChange('layout')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm ${
                        viewMode === 'layout' ? 'bg-white text-gray-900' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <Grid size={14} />
                      <span>Layout</span>
                    </button>
                  </div>
                )}

                <div className="date-picker-container relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <Calendar size={16} />
                    <span className="text-sm">{formatDateShort(selectedDate)}</span>
                    <ChevronDown size={16} />
                  </button>

                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border z-50" style={{ width: '320px' }}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => changeCalendarMonth(-1)} className="p-1 rounded hover:bg-gray-100">
                            <ChevronLeft size={20} className="text-gray-600" />
                          </button>
                          <h3 className="font-semibold text-gray-900">
                            {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <button onClick={() => changeCalendarMonth(1)} className="p-1 rounded hover:bg-gray-100">
                            <ChevronRight size={20} className="text-gray-600" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarGrid().map((dayData, index) => (
                            <button
                              key={index}
                              onClick={() => !dayData.isPast && handleDateSelect(dayData.date)}
                              disabled={dayData.isPast}
                              className={`h-8 w-8 text-sm rounded-md transition-colors ${
                                dayData.isSelected ? 'bg-red-500 text-white' :
                                dayData.isToday ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                                dayData.isPast ? 'text-gray-300 cursor-not-allowed' :
                                dayData.isCurrentMonth ? 'text-gray-900 hover:bg-gray-100' :
                                'text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {dayData.day}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t">
                          <button onClick={() => handleDateSelect(new Date())} className="text-sm text-blue-600 hover:text-blue-800">
                            Go to Today
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button onClick={loadAvailability} disabled={loading} className="p-2 rounded hover:bg-gray-700 transition-colors">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
          
          {!isMobile && (
            <div className="text-sm text-gray-300 mt-2">
              {courts.length} courts • ${facility.pricing?.courtRental || '25'}/hour • {formatCurrentTime()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Status */}
      {isMobile && (
        <div className="bg-white px-4 py-2 border-b">
          <div className="text-sm text-gray-600">{formatCurrentTime()}</div>
          {error && <div className="text-xs text-red-500 mt-1">Error loading availability</div>}
        </div>
      )}

      {/* Court Layout Grid */}
      <div className={`${isMobile ? 'p-4' : 'max-w-7xl mx-auto p-8'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-5 gap-8'} max-w-6xl mx-auto`}>
          {courts.map((court) => {
            const status = getCourtStatus(court);
            const availableTimes = getAvailableTimesForCourt(court);
            
            return (
              <div
                key={court.id}
                className="cursor-pointer transform transition-all hover:scale-105 hover:shadow-lg"
                onClick={() => handleCourtClick(court)}
              >
                <div 
                  className={`${isMobile ? 'aspect-[3/4]' : 'aspect-[2/3]'} rounded-lg border-4 relative ${isMobile ? 'p-2' : 'p-4'}`}
                  style={{
                    backgroundColor: status === 'available' ? '#F0FDF4' : 
                                   status === 'limited' ? '#FEF3C7' : '#FEF2F2',
                    borderColor: status === 'available' ? '#059669' : 
                                status === 'limited' ? '#F59E0B' : '#DC2626'
                  }}
                >
                  {!isMobile && (
                    <div className="absolute inset-4">
                      <div className="w-full h-full border-2 border-gray-400 relative">
                        <div className="absolute left-0 right-0 border-t-2 border-gray-400" style={{ top: '50%' }}></div>
                        <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '25%' }}></div>
                        <div className="absolute left-0 right-0 border-t border-gray-300" style={{ top: '75%' }}></div>
                        <div className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: '20%' }}></div>
                        <div className="absolute top-0 bottom-0 border-r border-gray-300" style={{ right: '20%' }}></div>
                      </div>
                    </div>
                  )}
                  
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
                
                <div className={`${isMobile ? 'mt-2' : 'mt-3'} text-center`}>
                  <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-lg'} text-gray-900`}>
                    {court.name}
                  </h3>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                    {court.sport}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`} style={{
                    color: status === 'available' ? '#059669' : 
                           status === 'limited' ? '#F59E0B' : '#DC2626'
                  }}>
                    {status === 'available' ? `${availableTimes.length} slots` :
                     status === 'limited' ? `${availableTimes.length} left` :
                     'Full'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`${isMobile ? 'mt-6' : 'mt-8'} flex justify-center`}>
          <div className={`flex items-center ${isMobile ? 'space-x-4 text-xs' : 'space-x-6 text-sm'}`}>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span>Limited</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Fully Booked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Court Time Slot Modal */}
      {showCourtModal && selectedCourt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full'} max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-4 text-white" style={{ backgroundColor: facility.branding?.primaryColor || '#EB3958' }}>
              <h3 className="text-lg font-semibold">{selectedCourt.name}</h3>
              <button onClick={() => setShowCourtModal(false)} className="p-1 hover:bg-white hover:bg-opacity-20 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-center mb-4">
                <p className="text-gray-600">Available times for {formatDateShort(selectedDate)}</p>
              </div>
              
              <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
                {getAvailableTimesForCourt(selectedCourt).map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSlotSelect(time)}
                    className={`${isMobile ? 'p-2' : 'w-full p-3'} text-left rounded-lg border-2 transition-all hover:shadow-md hover:bg-red-500 hover:text-white`}
                    style={{ borderColor: facility.branding?.primaryColor || '#EB3958', color: facility.branding?.primaryColor || '#EB3958' }}
                  >
                    <div className={`flex ${isMobile ? 'flex-col items-center' : 'justify-between items-center'}`}>
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{time}</span>
                      <span className={`${isMobile ? 'text-xs mt-1' : 'text-sm'}`}>${facility.pricing?.courtRental || 25}/hour</span>
                    </div>
                  </button>
                ))}
                
                {getAvailableTimesForCourt(selectedCourt).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available time slots for this court</p>
                    <p className="text-sm mt-2">Try selecting a different date or court</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtLayoutView;