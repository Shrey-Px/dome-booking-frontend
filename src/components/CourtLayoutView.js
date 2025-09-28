// CourtLayoutView.js - Mobile Optimized Version
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Clock, User, RefreshCw, X, List, Grid } from 'lucide-react';

const CourtLayoutView = ({ onBookingSelect, selectedDate, setSelectedDate, viewMode = 'layout', onViewModeChange }) => {
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
  
  // FIXED: Use the correct facility UUID and API endpoint
  const FACILITY_UUID = '68cad6b20a06da55dfb88af5';
  const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'https://dome-booking-backend-production.up.railway.app';
  
  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // FIXED: 10 courts for Strings Badminton Academy with correct names in 5x2 grid
  const courts = [
    { id: 1, name: 'Court 1', sport: 'Badminton', position: { row: 0, col: 0 } },
    { id: 2, name: 'Court 2', sport: 'Badminton', position: { row: 0, col: 1 } },
    { id: 3, name: 'Court 3', sport: 'Badminton', position: { row: 0, col: 2 } },
    { id: 4, name: 'Court 4', sport: 'Badminton', position: { row: 0, col: 3 } },
    { id: 5, name: 'Court 5', sport: 'Badminton', position: { row: 0, col: 4 } },
    { id: 6, name: 'Court 6', sport: 'Badminton', position: { row: 1, col: 0 } },
    { id: 7, name: 'Court 7', sport: 'Badminton', position: { row: 1, col: 1 } },
    { id: 8, name: 'Court 8', sport: 'Badminton', position: { row: 1, col: 2 } },
    { id: 9, name: 'Court 9', sport: 'Badminton', position: { row: 1, col: 3 } },
    { id: 10, name: 'Court 10', sport: 'Badminton', position: { row: 1, col: 4 } }
  ];

  // FIXED: Time slots based on actual operating hours
  const getTimeSlots = () => {
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      return [
        '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
      ];
    } else {
      return [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM'
      ];
    }
  };

  const timeSlots = getTimeSlots();

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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load availability when date changes
  useEffect(() => {
    loadAvailability();
  }, [selectedDate]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  useEffect(() => {
    // Listen for booking cancellations and refresh availability
    const handleBookingCancelled = (event) => {
      console.log('Booking cancelled, refreshing availability...', event.detail);
      loadAvailability(); // This calls your existing loadAvailability function
    };

    const handleRefreshAvailability = () => {
      console.log('Manual refresh requested, refreshing availability...');
      loadAvailability();
    };

    window.addEventListener('bookingCancelled', handleBookingCancelled);
    window.addEventListener('refreshAvailability', handleRefreshAvailability);

    return () => {
      window.removeEventListener('bookingCancelled', handleBookingCancelled);
      window.removeEventListener('refreshAvailability', handleRefreshAvailability);
    };
  }, [selectedDate]); // Include selectedDate dependency to ensure it refreshes for current date

  const isTimeSlotInPast = (timeSlot) => {
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDateOnly < today) {
      return true;
    }
    
    if (selectedDateOnly > today) {
      return false;
    }
    
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

  const loadAvailability = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/api/v1/availability?facility_id=${FACILITY_UUID}&date=${dateStr}&_t=${timestamp}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.availability) {
        setAvailability(data.data.availability);
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
    }).toUpperCase();
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
    const lastDay = new Date(year, month + 1, 0);
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
    
    if (availableTimes.length === 0) {
      return 'unavailable';
    } else if (availableTimes.length <= 3) {
      return 'limited';
    } else {
      return 'available';
    }
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

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header - Mobile Responsive */}
      <div 
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AppIcon />
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
                        {formatDateShort(selectedDate)}
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

      {/* Status Bar */}
      {!isMobile && (
        <div className="max-w-7xl mx-auto px-6 py-3 bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {formatDate(selectedDate)} - Court Layout
              </h1>
              <div className="text-sm text-gray-500 flex items-center space-x-4">
                <span>Current time: {formatCurrentTime()}</span>
                {lastRefresh && <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>}
                {error && <span className="text-red-500">Error: {error}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Status */}
      {isMobile && (
        <div className="bg-white px-4 py-2 border-b">
          <div className="text-sm text-gray-600">
            Current time: {formatCurrentTime()}
          </div>
          {error && <div className="text-xs text-red-500 mt-1">Error loading availability</div>}
        </div>
      )}

      {/* Court Layout Grid - Mobile Responsive */}
      <div className={`${isMobile ? 'p-4' : 'max-w-7xl mx-auto p-8'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-5 gap-8'} max-w-6xl mx-auto`}>
          {courts.map((court) => {
            const status = getCourtStatus(court);
            const availableTimes = getAvailableTimesForCourt(court);
            
            return (
              <div
                key={court.id}
                className="relative cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
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
                        <div 
                          className="absolute left-0 right-0 border-t-2 border-gray-400"
                          style={{ top: '50%', transform: 'translateY(-50%)' }}
                        ></div>
                        <div 
                          className="absolute left-0 right-0 border-t border-gray-300"
                          style={{ top: '25%' }}
                        ></div>
                        <div 
                          className="absolute left-0 right-0 border-t border-gray-300"
                          style={{ top: '75%' }}
                        ></div>
                        <div 
                          className="absolute top-0 bottom-0 border-l border-gray-300"
                          style={{ left: '20%' }}
                        ></div>
                        <div 
                          className="absolute top-0 bottom-0 border-r border-gray-300"
                          style={{ right: '20%' }}
                        ></div>
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
                      <div 
                        className="animate-spin rounded-full h-6 w-6 border-b-2"
                        style={{ borderColor: '#EF4444' }}
                      ></div>
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

      {/* Court Modal - Mobile Responsive */}
      {showCourtModal && selectedCourt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full'} max-h-[80vh] overflow-y-auto`}>
            <div 
              className="flex items-center justify-between p-4 text-white"
              style={{ backgroundColor: '#EB3958' }}
            >
              <h3 className="text-lg font-semibold">{selectedCourt.name}</h3>
              <button
                onClick={() => setShowCourtModal(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-center mb-4">
                <p className="text-gray-600">
                  Available times for {formatDateShort(selectedDate)}
                </p>
              </div>
              
              <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
                {getAvailableTimesForCourt(selectedCourt).map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSlotSelect(time)}
                    className={`${isMobile ? 'p-2' : 'w-full p-3'} text-left rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:bg-red-500 hover:text-white`}
                    style={{
                      borderColor: '#EB3958',
                      color: '#EB3958',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <div className={`flex ${isMobile ? 'flex-col items-center' : 'justify-between items-center'}`}>
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{time}</span>
                      <span className={`${isMobile ? 'text-xs mt-1' : 'text-sm'}`}>$25/hour</span>
                    </div>
                  </button>
                ))}
                
                {getAvailableTimesForCourt(selectedCourt).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available time slots for this court on {formatDateShort(selectedDate)}</p>
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