import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, FileText } from 'lucide-react';
import vendorApi from '../../services/vendorApi';

const CreateBookingModal = ({ isOpen, onClose, selectedDate, courts, onBookingCreated }) => {
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    courtName: '',
    date: formatDateForInput(selectedDate),
    startTime: '',
    endTime: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);

  // Generate time slots based on selected date (weekday vs weekend)
  useEffect(() => {
    if (!formData.date) return;

    const selectedDateObj = new Date(formData.date + 'T00:00:00');
    const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
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

    // console.log('Generating time slots:', { date: formData.date, isWeekend, openHour, closeHour });

    // Generate hourly slots
    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }

    // console.log('Time slots generated:', slots);
    setTimeSlots(slots);
  }, [formData.date]);

  // Update date when selectedDate prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: formatDateForInput(selectedDate)
    }));
  }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.courtName || !formData.date || !formData.startTime || 
          !formData.customerName || !formData.customerEmail) {
        throw new Error('Please fill in all required fields');
      }

      // Extract court number correctly
      let courtNumber, courtName;
      const selectedCourt = courts.find(c => c.name === formData.courtName);
    
      if (selectedCourt) {
        courtNumber = selectedCourt.id;
        // Standardize court names for database
        if (selectedCourt.sport === 'Pickleball') {
          // Use "Court 23" format for consistency
          courtName = `Court ${courtNumber}`;
        } else {
          courtName = selectedCourt.name;
        }
      } else {
        courtNumber = parseInt(formData.courtName.match(/\d+/)?.[0] || 0);
        courtName = formData.courtName;
      }

      // Calculate end time (1 hour after start)
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const endHour = (startHour + 1).toString().padStart(2, '0');
      const endTime = `${endHour}:00`;

      const bookingData = {
        courtName: courtName,
        courtNumber: courtNumber,
        date: formData.date,
        startTime: formData.startTime,
        endTime: endTime,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone || '',
        notes: formData.notes || ''
      };

      // console.log('Submitting booking:', bookingData);

      await vendorApi.createBooking(bookingData);
      
      onBookingCreated();
      onClose();
      
      // Reset form
      setFormData({
        courtName: '',
        date: formatDateForInput(selectedDate),
        startTime: '',
        endTime: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: ''
      });
    } catch (err) {
      console.error('Create booking error:', err);
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get day type for display
  const selectedDateObj = new Date(formData.date + 'T00:00:00');
  const dayOfWeek = selectedDateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayType = isWeekend ? 'Weekend' : 'Weekday';
  const hours = isWeekend ? '6:00 AM - 10:00 PM' : '8:00 AM - 8:00 PM';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Court Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline mr-2" size={16} />
              Court *
            </label>
            <select
              value={formData.courtName}
              onChange={(e) => {
                const selectedCourt = courts.find(c => c.name === e.target.value);
                setFormData({ 
                  ...formData, 
                  courtName: e.target.value,
                  courtId: selectedCourt?.id,
                  sport: selectedCourt?.sport 
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select a court</option>
              {courts.map((court) => (
                <option key={court.id || court.name} value={court.name}>
                  {court.name} - {court.sport || 'Badminton'} (${court.sport === 'Pickleball' ? '30' : '25'}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline mr-2" size={16} />
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value, startTime: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {dayType} Hours: {hours}
            </p>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline mr-2" size={16} />
              Start Time *
            </label>
            <select
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Duration: 1 hour</p>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline mr-2" size={16} />
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Customer Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline mr-2" size={16} />
              Customer Email *
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="john@example.com"
              required
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline mr-2" size={16} />
              Customer Phone
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="555-0123"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline mr-2" size={16} />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows="3"
              placeholder="Any special notes or requirements..."
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBookingModal;