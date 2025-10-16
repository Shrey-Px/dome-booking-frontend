// src/components/vendor/VendorDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Clock, 
  LogOut, RefreshCw, ChevronLeft, ChevronRight,
  Search, Download, Plus, X
} from 'lucide-react';
import vendorApi from '../../services/vendorApi';
import VendorCalendarView from './VendorCalendarView';
import CreateBookingModal from './CreateBookingModal';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  // Replace the hardcoded courts array with:
  const [courts, setCourts] = useState([]);
  const [facilityConfig, setFacilityConfig] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const vendorData = vendorApi.getVendorData();
      setVendor(vendorData);

      // Fetch facility courts configuration
      const courtsResult = await vendorApi.getFacilityCourts();
      if (courtsResult.data.courts) {
        setCourts(courtsResult.data.courts);
        setFacilityConfig(courtsResult.data);
      }
      
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
  
      const statsResult = await vendorApi.getStats({ date: dateStr });
      setStats(statsResult.data);
      
      const bookingsResult = await vendorApi.getBookings({ date: dateStr });
      setBookings(bookingsResult.data.bookings);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await vendorApi.logout();
    navigate('/vendor/login');
  };

  const handleCancelBooking = async (bookingId, customerName) => {
    if (!window.confirm(`Cancel booking for ${customerName}? The customer will be notified via email.`)) {
      return;
    }

    setCancellingBooking(bookingId);
    try {
      await vendorApi.cancelBooking(bookingId);
      alert('Booking cancelled successfully. Customer has been notified.');
      loadDashboardData();
    } catch (error) {
      alert('Failed to cancel booking: ' + (error.message || 'Unknown error'));
    } finally {
      setCancellingBooking(null);
    }
  };

  const handleBookingCreated = () => {
    loadDashboardData();
    alert('Booking created successfully. Confirmation email sent to customer.');
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeValue) => {
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }
    try {
      return new Date(timeValue).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeValue;
    }
  };

  // Add this helper function near the top with other functions
  const isPastBooking = (bookingDate, startTime) => {
    try {
      // Parse the booking date and time
      let bookingDateTime;
      
      if (typeof startTime === 'string' && startTime.includes(':')) {
        // String format: "2025-10-10" and "11:00"
        const [year, month, day] = bookingDate.split('-').map(Number);
        const [hours, minutes] = startTime.split(':').map(Number);
        bookingDateTime = new Date(year, month - 1, day, hours, minutes);
      } else {
        // Date object format
        bookingDateTime = new Date(startTime);
      }
      
      // Compare with current time
      return bookingDateTime < new Date();
    } catch (error) {
      console.error('Error checking if booking is past:', error);
      return false; // If error, allow cancellation
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      booking.bookingStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Court', 'Date', 'Time', 'Customer Name', 'Email', 'Phone', 'Amount', 'Status'];
    const rows = filteredBookings.map(b => [
      b.courtName,
      b.bookingDate,
      `${formatTime(b.startTime)} - ${formatTime(b.endTime)}`,
      b.customerName,
      b.customerEmail,
      b.customerPhone || '',
      b.totalPrice,
      b.bookingStatus
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${selectedDate.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading && !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                D<span className="text-red-500">O</span>ME Vendor Dashboard
              </h1>
              <span className="text-sm text-gray-500">
                {vendor?.name} • {vendor?.facilitySlug}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Create Booking Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: '#EB3958', color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f4a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EB3958'}
              >
                <Plus size={18} />
                <span>Create Booking</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayBookings}</p>
                </div>
                <Calendar className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.monthBookings}</p>
                </div>
                <Users className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Viewing Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedDate).split(',')[0]}</p>
                </div>
                <Clock className="w-12 h-12 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
            {/* View Toggle Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              > 
                Calendar View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}  
              > 
                Table View
              </button>
            </div>

            {/* Search, Filters, and Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              > 
                <option value="all">All Status</option>
                <option value="Booked">Booked</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button
                onClick={loadDashboardData}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Refresh"
              > 
                <RefreshCw size={18} />
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-300"
                disabled={filteredBookings.length === 0}
              > 
                <Download size={18} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar or Table View */}
        {viewMode === 'calendar' ? (
          <VendorCalendarView 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No bookings found for this date
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.courtName}</div>
                          <div className="text-xs text-gray-500">{booking.sport || 'Badminton'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{booking.customerEmail}</div>
                          {booking.customerPhone && (
                            <div className="text-sm text-gray-500">{booking.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${booking.totalPrice}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.bookingStatus === 'Booked' ? 'bg-green-100 text-green-800' :
                            booking.bookingStatus === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            booking.bookingStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.bookingStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {booking.bookingStatus !== 'Cancelled' && 
                           booking.bookingStatus !== 'Completed' && 
                           !isPastBooking(booking.bookingDate, booking.startTime) ? (
                            <button
                              onClick={() => handleCancelBooking(booking._id, booking.customerName)}
                              disabled={cancellingBooking === booking._id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              {cancellingBooking === booking._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X size={16} className="mr-1" />
                                  Cancel
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              {booking.bookingStatus === 'Cancelled' ? 'Cancelled' :
                               booking.bookingStatus === 'Completed' ? 'Completed' :
                               'Past booking'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedDate={selectedDate}
        courts={courts}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
};

export default VendorDashboard;