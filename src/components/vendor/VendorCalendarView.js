import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import vendorApi from '../../services/vendorApi';

const VendorCalendarView = ({ selectedDate, onDateChange, courts = [] }) => {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);

  const resolvedCourts = useMemo(() => (
    courts && courts.length
      ? courts
      : Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `Court ${i + 1}`,
          sport: 'Badminton'
        }))
  ), [courts]);

  // Generate time slots based on selected date
  useEffect(() => {
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let openHour, closeHour;
    
    if (isWeekend) {
      // Weekend: 6 AM - 10 PM
      openHour = 6;
      closeHour = 22;
    } else {
      // Weekday: 8 AM - 8 PM
      openHour = 8;
      closeHour = 20;
    }

    // Generate hourly slots in 12-hour format
    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      slots.push(`${displayHour}:00 ${period}`);
    }

    // console.log('Time slots generated:', { date: selectedDate.toDateString(), isWeekend, slots });
    setTimeSlots(slots);
  }, [selectedDate]);

  useEffect(() => {
    loadCalendarData();
  }, [selectedDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // console.log('Fetching bookings for date:', dateStr);
      const result = await vendorApi.getBookings({ date: dateStr });
      
      // console.log('Loaded bookings:', result.data.bookings);
      
      // Create a map of bookings by court and time
      // FILTER OUT CANCELLED BOOKINGS
      const bookingMap = {};
      result.data.bookings
        .filter(booking => booking.bookingStatus !== 'Cancelled')
        .forEach(booking => {
          const courtNum = extractCourtNumber(booking.courtName);
        
          // Convert the booking start time to 12-hour format for matching
          let startTime12Hour;
          if (typeof booking.startTime === 'string' && booking.startTime.includes(':')) {
            startTime12Hour = convert24HourTo12Hour(booking.startTime);
          } else {
            startTime12Hour = formatTimeTo12Hour(booking.startTime);
          }
        
          const key = `${courtNum}-${startTime12Hour}`;
          bookingMap[key] = booking;
        
          // console.log(`Booking mapped: ${key}`, booking);
        });
      
      // console.log('Booking map:', bookingMap);
      setBookings(bookingMap);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractCourtNumber = (courtName) => {
    const match = courtName.match(/\d+/);
    return match ? match[0] : courtName;
  };

  const convert24HourTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTimeTo12Hour = (timeValue) => {
    try {
      const date = new Date(timeValue);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeValue;
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    onDateChange(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderSlot = (court, time) => {
    const key = `${court.id}-${time}`;
    const booking = bookings[key];

    if (booking) {
      return (
        <div
          className="h-full bg-red-100 border-l-4 border-red-500 p-2 hover:bg-red-200 transition-colors cursor-pointer relative group"
        >
          <div className="text-xs font-semibold text-red-800">BOOKED</div>
          <div className="text-xs text-red-700 truncate">{booking.customerName}</div>
          
          {/* Hover tooltip */}
          <div className="absolute hidden group-hover:block bg-gray-900 text-white p-3 rounded-lg shadow-lg z-10 left-0 top-full mt-1 min-w-[200px]">
            <div className="text-sm font-semibold mb-2">{booking.customerName}</div>
            <div className="text-xs space-y-1">
              <div>📧 {booking.customerEmail}</div>
              {booking.customerPhone && <div>📞 {booking.customerPhone}</div>}
              <div>💰 ${booking.totalPrice}</div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                Status: {booking.bookingStatus}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full bg-white p-2 hover:bg-gray-50 transition-colors">
        <div className="text-xs text-green-600 font-medium">Available</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-700 text-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-600 rounded transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-300">Vendor Calendar View</p>
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-600 rounded transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex justify-center mt-3">
          <button
            onClick={() => onDateChange(new Date())}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        {resolvedCourts.length > 10 && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-gray-800 text-white p-2 rounded-l-lg shadow-lg pointer-events-none">
            <span className="text-xs">→ Scroll for more courts</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b sticky left-0 bg-gray-50 z-10">
                  TIME
                </th>
                {resolvedCourts.map(court => (
                  <th key={court.id} className="px-4 py-3 text-center border-b min-w-[120px]">
                    <div className="text-sm font-semibold text-gray-900">{court.name}</div>
                    <div className="text-xs text-gray-500">{court.sport}</div>
                    <div className="text-xs" style={{ color: court.sport === 'Pickleball' ? '#3B82F6' : '#10B981' }}>
                      ${court.sport === 'Pickleball' ? '30' : '25'}/hr
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-medium text-gray-700 border-r sticky left-0 bg-white z-10">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>{time}</span>
                  </div>
                </td>
                {resolvedCourts.map(court => (
                  <td key={court.id} className="p-0 border-r h-16">
                    {renderSlot(court, time)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white border-2 border-gray-300"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-500"></div>
            <span className="text-gray-600">Booked</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {selectedDate.getDay() === 0 || selectedDate.getDay() === 6 
            ? '06:00 - 22:00 (Weekdays) •06:00 - 22:00 (Weekend)' 
            : '08:00 - 20:00 (Weekday) • 06:00 - 22:00 (Weekend)'}
        </div>
      </div>
    </div>
  );
};

export default VendorCalendarView;