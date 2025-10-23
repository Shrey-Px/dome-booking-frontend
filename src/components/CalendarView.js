// CalendarView.js - Updated with Cricket Support
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Clock, User, RefreshCw, List, Grid } from 'lucide-react';
import { useFacility } from './FacilityLoader';
import ApiService from '../services/api';

const CalendarView = ({ onBookingSelect, viewMode = 'calendar', onViewModeChange, selectedDate, setSelectedDate }) => {
  // Get facility context instead of hardcoding
  const { facility, facilitySlug } = useFacility();
  
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(true);
  const calendarRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedMobileCourt, setSelectedMobileCourt] = useState(null);
  const headerRef = React.useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  
  // Get courts from facility instead of hardcoding
  const courts = facility?.courts?.map(court => ({
    id: court.id,
    name: court.name,
    sport: court.sport
  })) || [];

  // Helper function to get sport-specific color
  const getSportColor = (sport) => {
    if (sport === 'Cricket') return '#F97316'; // Orange
    if (sport === 'Pickleball') return '#3B82F6'; // Blue
    return '#4ADE80'; // Green (Badminton default)
  };

  // Helper function to get sport-specific price
  const getSportPrice = (sport) => {
    if (sport === 'Cricket') return '45';
    if (sport === 'Pickleball') return '30';
    return '25'; // Badminton default
  };

  const getTimeSlots = () => {
    if (!facility?.operatingHours) {
      // Fallback to default hours if not available
      const dayOfWeek = selectedDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (isWeekend) {
        // Weekend: 6 AM to 10 PM
        return ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
                '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
                '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];
      } else {
        // Weekday: 8 AM to 8 PM
        return ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
                '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', 
                '6:00 PM', '7:00 PM'];
      }
    }

    // Use local date's day of week, not UTC
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
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

  const handleScroll = (e) => {
    const element = e.target;
    const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 10;
    setShowScrollArrow(!isAtEnd);
  };

  const scrollRight = () => {
    if (calendarRef.current) {
      calendarRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.clientHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load availability when date changes
  useEffect(() => {
    if (facilitySlug) {
      loadAvailability();
    }
  }, [selectedDate, facilitySlug]);

  // Close date picker when clicking outside
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
      loadAvailability();
    };

    const handleRefreshAvailability = () => {
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

  const refreshAvailability = () => {
    loadAvailability();
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

  const handleSlotClick = (court, time) => {
    const time24 = convertTo24Hour(time);
    const isPastSlot = isTimeSlotInPast(time);
    
    if (isPastSlot) {
      alert('Cannot book time slots in the past. Please select a future time slot.');
      return;
    }

    const isAvailable = availability[court.id]?.[time24] === true;
    
    if (!isAvailable) {
      alert('This time slot is not available. Please select another time.');
      return;
    }
    
    if (onBookingSelect) {
      onBookingSelect({
        court,
        time,
        time24,
        date: selectedDate,
        displayTime: time
      });
    }
  };

  const getSlotStatus = (court, time) => {
    const time24 = convertTo24Hour(time);
    const isPastSlot = isTimeSlotInPast(time);
    
    if (isPastSlot) return 'past';
    
    const isAvailable = availability[court.id]?.[time24] === true;
    return isAvailable ? 'available' : 'unavailable';
  };

  const getAvailableSlotsCount = () => {
    let count = 0;
    timeSlots.forEach(time => {
      courts.forEach(court => {
        const status = getSlotStatus(court, time);
        if (status === 'available') count++;
      });
    });
    return count;
  };

  const getCourtAvailableSlots = (courtId) => {
    let count = 0;
    timeSlots.forEach(time => {
      const status = getSlotStatus({ id: courtId }, time);
      if (status === 'available') {
        count++;
      }
    });
    return count;
  };

  const isCourtFullyBooked = (courtId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    const futureSlots = timeSlots.filter(time => {
      if (selectedDateOnly.getTime() === today.getTime()) {
        return !isTimeSlotInPast(time);
      }
      return true;
    });
    
    if (futureSlots.length === 0) {
      return true;
    }
    
    return futureSlots.every(time => {
      const time24 = convertTo24Hour(time);
      const isAvailable = availability[courtId]?.[time24] === true;
      return !isAvailable;
    });
  };

  const isTimeSlotFullyBooked = (time) => {
    const isPastSlot = isTimeSlotInPast(time);
    
    if (isPastSlot) {
      return true;
    }
    
    const time24 = convertTo24Hour(time);
    
    return courts.every(court => {
      const isAvailable = availability[court.id]?.[time24] === true;
      return !isAvailable;
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  // Mobile Court View Component
  const MobileCourtView = () => (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {courts.map(court => {
        const availableSlots = getCourtAvailableSlots(court.id);
        const isFullyBooked = isCourtFullyBooked(court.id);
        const sportPrice = getSportPrice(court.sport);
        
        return (
          <div key={court.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div 
              className="p-4 border-b border-gray-100 flex justify-between items-center"
              onClick={() => setSelectedMobileCourt(selectedMobileCourt === court.id ? null : court.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isFullyBooked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{court.name}</h3>
                  <p className="text-xs text-gray-500">
                    {isFullyBooked ? 'Fully booked' : `${availableSlots} slots available`}
                  </p>
                </div>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-gray-400 transition-transform ${selectedMobileCourt === court.id ? 'rotate-180' : ''}`}
              />
            </div>
            
            {selectedMobileCourt === court.id && (
              <div className="p-3 grid grid-cols-3 gap-2">
                {timeSlots.map(time => {
                  const time24 = convertTo24Hour(time);
                  const status = getSlotStatus(court, time);
                  const isAvailable = availability[court.id]?.[time24] === true;
                  
                  return (
                    <button
                      key={time}
                      onClick={() => status !== 'past' && isAvailable && handleSlotClick(court, time)}
                      disabled={status === 'past' || !isAvailable}
                      className={`
                        p-2 text-xs rounded-md transition-all
                        ${status === 'past' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : isAvailable 
                            ? 'bg-green-50 text-green-700 border border-green-200 active:bg-green-100' 
                            : 'bg-red-50 text-red-700 border border-red-200 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="font-medium">{time}</div>
                      {status !== 'past' && (
                        <div className="text-xs mt-1">
                          {isAvailable ? `$${sportPrice}` : 'Booked'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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

  // Main Render
  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header - Mobile Responsive */}
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
          {/* Mobile Layout */}
          {isMobile ? (
            <div>
              {/* First Row - Logo and Brand */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AppIcon />
                  <div className="font-bold text-lg">
                    D<span style={{ color: '#EF4444' }}>O</span>ME
                  </div>
                </div>
                {onViewModeChange && (
                  <button
                    onClick={() => onViewModeChange('layout')}
                    className="p-2 bg-gray-700 rounded"
                  >
                    <Grid size={16} />
                  </button>
                )}
              </div>
              
              {/* Second Row - Date Navigation */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => changeDate(-1)}
                  className="p-2 bg-gray-700 rounded"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex-1 mx-2 px-3 py-2 bg-gray-700 rounded text-sm"
                >
                  {formatDateMobile(selectedDate)}
                </button>
                
                <button 
                  onClick={() => changeDate(1)}
                  className="p-2 bg-gray-700 rounded"
                >
                  <ChevronRight size={16} />
                </button>
                
                <button
                  onClick={refreshAvailability}
                  disabled={loading}
                  className="p-2 bg-gray-700 rounded ml-2"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ) : (
            // Desktop Layout
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <AppIcon />
                  
                  {onViewModeChange && (
                    <div className="flex bg-gray-700 rounded-lg p-1 ml-2">
                      <button
                        onClick={() => onViewModeChange('calendar')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
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
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
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
                  
                  <div className="date-picker-container relative">
                    <div 
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-700 transition-colors"
                      style={{ 
                        backgroundColor: '#334155',
                        borderColor: '#475569'
                      }}
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Calendar size={16} style={{ color: '#94A3B8' }} />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          changeDate(-1);
                        }}
                        className="p-1 rounded transition-colors hover:bg-gray-600"
                        disabled={loading}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span 
                        className="font-medium px-3 min-w-[200px] text-center"
                        style={{ fontSize: '14px' }}
                      >
                        {formatDate(selectedDate)}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          changeDate(1);
                        }}
                        className="p-1 rounded transition-colors hover:bg-gray-600"
                        disabled={loading}
                      >
                        <ChevronRight size={16} />
                      </button>
                      <ChevronDown size={16} className="ml-2 opacity-60" />
                    </div>

                    {showDatePicker && (
                      <div 
                        className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border z-50"
                        style={{ 
                          width: '320px',
                          borderColor: '#E2E8F0'
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => changeCalendarMonth(-1)}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <ChevronLeft size={20} className="text-gray-600" />
                            </button>
                            <h3 className="font-semibold text-gray-900">
                              {calendarDate.toLocaleDateString('en-US', { 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </h3>
                            <button
                              onClick={() => changeCalendarMonth(1)}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <ChevronRight size={20} className="text-gray-600" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div 
                                key={day}
                                className="text-center text-xs font-medium text-gray-500 py-2"
                              >
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {generateCalendarGrid().map((dayData, index) => (
                              <button
                                key={index}
                                onClick={() => !dayData.isPast && handleDateSelect(dayData.date)}
                                disabled={dayData.isPast}
                                className={`
                                  h-8 w-8 text-sm rounded-md transition-colors
                                  ${dayData.isSelected 
                                    ? 'bg-red-500 text-white' 
                                    : dayData.isToday
                                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      : dayData.isPast
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : dayData.isCurrentMonth
                                          ? 'text-gray-900 hover:bg-gray-100'
                                          : 'text-gray-400 hover:bg-gray-50'
                                  }
                                `}
                              >
                                {dayData.day}
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleDateSelect(new Date())}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Go to Today
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={refreshAvailability}
                    disabled={loading}
                    className="p-2 rounded transition-colors hover:bg-gray-700"
                    title="Refresh availability"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div 
                className="font-bold"
                style={{ 
                  fontSize: '24px',
                  letterSpacing: '0.05em'
                }}
              >
                D<span style={{ color: '#EF4444' }}>O</span>ME
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Facility Name Bar */}
      {!isMobile && (
        <div className="max-w-7xl mx-auto px-6 py-4 bg-white border-b">
          <h1 className="text-2xl font-bold text-gray-900 text-left">
            {facility?.name || 'Loading...'}
          </h1>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        className="overflow-y-auto"
  	style={{ height: `calc(100vh - ${headerHeight}px)` }}
      >

      {/* Mobile Status */}
      {isMobile && (
        <div className="bg-white px-4 py-2 border-b">
          <div className="text-sm text-gray-600">
            {getAvailableSlotsCount()} slots available • {formatCurrentTime()}
          </div>
          {error && <div className="text-xs text-red-500 mt-1">Error loading availability</div>}
        </div>
      )}

      {/* Main Content - Conditional Rendering */}
      {isMobile ? (
        <MobileCourtView />
      ) : (
        // Desktop Calendar Grid
        <div className="max-w-7xl mx-auto relative" style={{ padding: '24px' }}>
  	  {/* Clickable Scroll Arrow */}
  	  {showScrollArrow && (
    	    <button
      	      onClick={scrollRight}
      	      className="absolute right-6 top-1/2 transform -translate-y-1/2 z-30 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-xl transition-all hover:scale-110"
              style={{ marginTop: '-24px' }}
      	      title="Scroll to see more courts"
    	    > 
      	      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
      	      </svg>
    	    </button>
  	  )}

          <div 
    	    ref={calendarRef}
    	    onScroll={handleScroll}
    	    className="rounded-xl overflow-x-auto relative"
    	    style={{ 
      	      backgroundColor: '#FFFFFF',
      	      boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
      	      border: '1px solid #F3F4F6'
            }}
          >

  	  <div 
    	    className="relative"
    	    style={{ 
              minWidth: 'fit-content',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
              border: '1px solid #F3F4F6',
              borderRadius: '12px'
            }}
          > 
            {loading && (
              <div 
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.75)' }}
              >
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: '#EF4444' }}
                ></div>
              </div>
            )}
            
            <div 
              className="border-b"
              style={{ 
    		display: 'grid',
    		gridTemplateColumns: `140px repeat(${courts.length}, 140px)`,
    		background: 'linear-gradient(to right, #F9FAFB, #F3F4F6)',
    		borderColor: '#E5E7EB',
    		minWidth: 'fit-content'
              }}
            >
              <div 
                className="font-medium border-r sticky left-0 z-10 bg-white"
                style={{ 
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  color: '#4B5563',
                  fontSize: '14px'
                }}
              >
                <Clock size={16} className="inline mr-2" />
                Time
              </div>
              {courts.map((court) => {
                const sportColor = getSportColor(court.sport);
                return (
                  <div 
                    key={court.id} 
                    className="text-center border-l"
                    style={{ 
                      padding: '16px',
                      borderColor: '#E5E7EB'
                    }}
                  >
                    <div 
                      className="font-semibold"
                      style={{ 
                        fontSize: '18px',
                        color: '#111827'
                      }}
                    >
                      {court.name}
                    </div>
                    <div 
                      className="flex items-center justify-center mt-1"
                      style={{ 
                        fontSize: '14px',
                        color: '#6B7280'
                      }}
                    >
                      <span 
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ 
                          backgroundColor: isCourtFullyBooked(court.id) ? '#EF4444' : sportColor
                        }}
                      ></span>
                      {court.sport}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
              {timeSlots.map((time) => (
                <div 
                  key={time} 
                  style={{ 
      		    display: 'grid',
      		    gridTemplateColumns: `140px repeat(${courts.length}, 140px)`,
      		    minWidth: 'fit-content'
  		  }}
                >
                  <div 
                    className="border-r font-medium sticky left-0 z-10 bg-white"
                    style={{ 
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E7EB',
                      color: '#4B5563',
                      fontSize: '14px'
                    }}
                  >
                    <div className="flex items-center">
                      {time}
                      <span 
                        className="ml-2 w-2 h-2 rounded-full"
                        style={{ 
                          backgroundColor: isTimeSlotFullyBooked(time) ? '#EF4444' : '#4ADE80' 
                        }}
                      ></span>
                    </div>
                  </div>
                  {courts.map((court) => {
                    const time24 = convertTo24Hour(time);
                    const isPastSlot = isTimeSlotInPast(time);
                    const isAvailable = availability[court.id]?.[time24] === true;
                    const sportColor = getSportColor(court.sport);
                    const sportPrice = getSportPrice(court.sport);
                  
                    return (
                      <div
                        key={`${court.id}-${time}`}
                        className={`border-l transition-all duration-200 ${isPastSlot ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}`}
                        style={{ 
                          padding: '12px',
                          borderLeft: isPastSlot 
                            ? '4px solid #9CA3AF' 
                            : isAvailable 
                              ? '1px solid #E5E7EB' 
                              : '4px solid #DC2626',
                          backgroundColor: isPastSlot 
                            ? '#F9FAFB' 
                            : isAvailable 
                              ? '#FFFFFF' 
                              : '#FEF2F2',
                          minHeight: '60px'
                        }}
                        onClick={() => !isPastSlot && handleSlotClick(court, time)}
                      >
                        {isPastSlot ? (
                          <div className="text-center"></div>
                        ) : isAvailable ? (
                          <div className="text-center">
                            <div 
                              className="font-semibold mb-1"
                              style={{ 
                                fontSize: '12px',
                                color: sportColor
                              }}
                            >
                              AVAILABLE
                            </div>
                            <div 
                              style={{ 
                                fontSize: '10px',
                                color: '#6B7280'
                              }}
                            >
                              ${sportPrice}/hour
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div 
                              className="font-semibold mb-1"
                              style={{ 
                                fontSize: '12px',
                                color: '#B91C1C'
                              }}
                            >
                              BOOKED
                            </div>
                            <div 
                              className="flex items-center justify-center"
                              style={{ 
                                fontSize: '12px',
                                color: '#4B5563'
                              }}
                            >
                              <User size={12} className="mr-1" />
                              Customer
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div 
              className="flex items-center space-x-6"
              style={{ 
                fontSize: '14px',
                color: '#4B5563'
              }}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 border-2 rounded"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D1D5DB'
                  }}
                ></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 border-2 rounded"
                  style={{ 
                    backgroundColor: '#FEF2F2',
                    borderColor: '#EF4444'
                  }}
                ></div>
                <span>Booked</span>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              {facility?.operatingHours?.weekday?.start || '8:00'} - {facility?.operatingHours?.weekday?.end || '20:00'} (Weekdays) • 
              {facility?.operatingHours?.weekend?.start || '6:00'} - {facility?.operatingHours?.weekend?.end || '22:00'} (Weekends)
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default CalendarView;