// src/components/vendor/VendorCalendarView.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import vendorApi from '../../services/vendorApi';

// Simple keyframes + class for the scroll hint
const scrollHintStyles = `
  @keyframes bounce-right {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(6px); }
  }
  .scroll-hint {
    animation: bounce-right 2s infinite;
  }
`;

const VendorCalendarView = ({ selectedDate, onDateChange, courts = [], operatingHours }) => {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);

  // Horizontal scroll container
  const calendarRef = useRef(null);
  const scrollRight = () => {
    if (calendarRef.current) {
      calendarRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // 22 badminton + 2 pickleball fallback (matches customer portal)
  const resolvedCourts = useMemo(() => {
    if (courts && courts.length) return courts;

    const badminton = Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      name: `Court ${i + 1}`,
      sport: 'Badminton',
    }));
    const pickleball = [
      { id: 'P1', name: 'Court P1', sport: 'Pickleball' },
      { id: 'P2', name: 'Court P2', sport: 'Pickleball' },
    ];
    return [...badminton, ...pickleball];
  }, [courts]);

  // Map court "name" -> "id" to line bookings up with the correct column
  const nameToId = useMemo(() => {
    const m = new Map();
    resolvedCourts.forEach(c => {
      m.set(String(c.name).toLowerCase().trim(), String(c.id));
    });
    return m;
  }, [resolvedCourts]);

  // Generate time slots (weekday 8–20, weekend 6–22)
  useEffect(() => {
    const dayOfWeek = selectedDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const openHour = isWeekend ? 6 : 8;
    const closeHour = isWeekend ? 22 : 20;

    const slots = [];
    for (let h = openHour; h < closeHour; h++) {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      slots.push(`${displayHour}:00 ${period}`);
    }
    setTimeSlots(slots);
  }, [selectedDate, operatingHours]);

  useEffect(() => {
    loadCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const result = await vendorApi.getBookings({ date: dateStr });

      const bookingMap = {};
      (result?.data?.bookings || [])
        .filter(b => b.bookingStatus !== 'Cancelled')
        .forEach(b => {
          const courtKeyId = getCourtKeyId(b.courtName);

          // Normalize time to 12h label to match table
          const start12 = typeof b.startTime === 'string' && b.startTime.includes(':')
            ? convert24To12(b.startTime)
            : formatTimeTo12(b.startTime);

          const key = `${courtKeyId}-${start12}`;
          bookingMap[key] = b;
        });

      setBookings(bookingMap);
    } catch (err) {
      console.error('Failed to load vendor bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert incoming booking.courtName -> our column id (1..22, P1, P2)
  const getCourtKeyId = (courtName) => {
    if (!courtName) return '';
    const lc = String(courtName).toLowerCase().trim();

    // Exact name match
    const direct = nameToId.get(lc);
    if (direct) return direct;

    // "Court P1", "P1", "Pickleball Court 1", etc.
    const p = lc.match(/p\s*([0-9]+)/i);
    if (p) return `P${p[1]}`;

    // Badminton "Court 7" -> "7"
    const n = lc.match(/(\d+)/);
    if (n) return String(parseInt(n[1], 10));

    return lc;
  };

  const convert24To12 = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${period}`;
    };

  const formatTimeTo12 = (value) => {
    try {
      const dt = new Date(value);
      return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return value;
    }
  };

  const changeDate = (days) => {
    const nd = new Date(selectedDate);
    nd.setDate(selectedDate.getDate() + days);
    onDateChange(nd);
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Slot renderer (centers text; blue for Pickleball, green for Badminton)
  const renderSlot = (court, time) => {
    const key = `${court.id}-${time}`;
    const booking = bookings[key];

    if (booking) {
      return (
        <div className="h-full bg-red-100 border-l-4 border-red-500 p-2 hover:bg-red-200 transition-colors cursor-pointer relative group flex items-center">
          <div>
            <div className="text-xs font-semibold text-red-800">BOOKED</div>
            <div className="text-xs text-red-700 truncate">{booking.customerName}</div>
          </div>

          {/* Hover tooltip */}
          <div className="absolute hidden group-hover:block bg-gray-900 text-white p-3 rounded-lg shadow-lg z-10 left-0 top-full mt-1 min-w-[200px]">
            <div className="text-sm font-semibold mb-2">{booking.customerName}</div>
            <div className="text-xs space-y-1">
              <div>📧 {booking.customerEmail}</div>
              {booking.customerPhone && <div>📞 {booking.customerPhone}</div>}
              <div>💰 ${booking.totalPrice}</div>
              <div className="mt-2 pt-2 border-t border-gray-700">Status: {booking.bookingStatus}</div>
            </div>
          </div>
        </div>
      );
    }

    // Available state — centered + color by sport
    const availableColor = court.sport === 'Pickleball' ? '#3B82F6' : '#10B981';
    return (
      <div className="h-full bg-white hover:bg-gray-50 transition-colors flex items-center justify-center">
        <div className="text-xs font-medium" style={{ color: availableColor }}>Available</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Keyframe styles for the scroll hint */}
      <style>{scrollHintStyles}</style>

      {/* Header */}
      <div className="bg-gray-700 text-white p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-600 rounded transition-colors">
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-300">Vendor Calendar View</p>
          </div>

          <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-600 rounded transition-colors">
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
          <div
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30 scroll-hint cursor-pointer"
            onClick={scrollRight}
            title="Scroll to see more courts"
            style={{
              backgroundColor: 'rgba(55, 65, 81, 0.9)',
              color: 'white',
              padding: '12px 8px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '20px', lineHeight: 1 }}>▶</div>
          </div>
        )}

        <div ref={calendarRef} className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b sticky left-0 bg-gray-50 z-10">
                  TIME
                </th>
                {resolvedCourts.map((court) => (
                  <th key={court.id} className="px-4 py-3 text-center border-b min-w-[120px]">
                    <div className="text-sm font-semibold text-gray-900">{court.name}</div>
                    <div className="text-xs text-gray-500">{court.sport}</div>
                    <div
                      className="text-xs"
                      style={{ color: court.sport === 'Pickleball' ? '#3B82F6' : '#10B981' }}
                    >
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

                  {resolvedCourts.map((court) => (
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
            ? '06:00 - 22:00 (Weekdays) • 06:00 - 22:00 (Weekend)'
            : '08:00 - 20:00 (Weekday) • 06:00 - 22:00 (Weekend)'}
        </div>
      </div>
    </div>
  );
};

export default VendorCalendarView;