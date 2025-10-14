// src/services/api.js - Updated with multi-tenant support
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dome-booking-backend-production.up.railway.app/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.currentFacility = null;
  }

  setFacility(facilitySlug) {
    this.currentFacility = facilitySlug;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // console.log('API Request:', url);
    // console.log('Request options:', options);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
      ...options,
    };

    // Add facility slug to headers if available
    if (this.currentFacility) {
      config.headers['x-facility-slug'] = this.currentFacility;
    }
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // console.log('Response status:', response.status);
      
      const responseText = await response.text();
      // console.log('Raw response text:', responseText);
      
      if (!response.ok) {
        console.error('HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || `HTTP error! status: ${response.status}` };
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      // console.log('Parsed response data:', data);
      return data;
      
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Facility Management
  async getFacilities() {
    const result = await this.request('/facilities');
    return result.data || result;
  }

  async getFacility(slug) {
    const result = await this.request(`/facilities/${slug}`);
    return result.data || result;
  }

  // Time conversion utilities
  convertTo12Hour(time24) {
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Time conversion error:', error);
      return time24;
    }
  }

  convertTo24Hour(time12) {
    try {
      const [time, period] = time12.split(' ');
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (error) {
      console.error('Time conversion error:', error);
      return time12;
    }
  }

  // Availability - Updated to use facility from context
  async getAvailability(facilitySlug, date) {
    try {
      // console.log('Getting availability...');
      // console.log('Facility slug:', facilitySlug);
      
      // Ensure date is in YYYY-MM-DD format
      let dateStr;
      if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
        }
        dateStr = date;
      } else {
        throw new Error(`Invalid date type: ${typeof date}`);
      }
      
      // console.log('Formatted date string:', dateStr);
      
      const timestamp = new Date().getTime();
      const url = `/availability?facility=${facilitySlug}&date=${dateStr}&_t=${timestamp}`;
      
      // console.log('Final URL:', this.baseURL + url);
      
      const result = await this.request(url);
      // console.log('Availability result:', result);
      
      return result.data || result;
      
    } catch (error) {
      console.error('getAvailability failed:', error);
      throw error;
    }
  }

  // Transform backend availability to frontend format
  async getBookings(facilitySlug, date) {
    const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    try {
      // console.log('Loading bookings for facility:', facilitySlug, 'date:', dateString);
      
      const result = await this.getAvailability(facilitySlug, dateString);
      
      if (!result || !result.availability) {
        // console.log('No availability data found');
        return {};
      }
      
      const bookings = {};
      
      // Transform backend format to frontend format
      Object.keys(result.availability).forEach(courtId => {
        const courtSlots = result.availability[courtId];
        
        Object.keys(courtSlots).forEach(time24 => {
          const isAvailable = courtSlots[time24];
          
          // If slot is NOT available (false), it's booked
          if (!isAvailable) {
            const time12 = this.convertTo12Hour(time24);
            const key = `Court ${courtId}-${time12}`;
            
            bookings[key] = {
              id: `booking-${courtId}-${time24}`,
              status: 'booked',
              user: 'Customer',
              email: 'customer@example.com',
              duration: 60,
              sport: 'Badminton'
            };
          }
        });
      });
      
      // console.log('Transformed bookings:', bookings);
      return bookings;
      
    } catch (error) {
      console.error('Failed to load bookings:', error);
      return {};
    }
  }

  // Booking - Updated to include facility slug
  async createBooking(facilitySlug, bookingData) {
    console.log('Creating booking with data:', bookingData);
    console.log('Facility slug:', facilitySlug);
    
    const backendBookingData = {
      facilitySlug: facilitySlug, // Add facility slug
      facilityId: bookingData.facilityId,
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      customerPhone: bookingData.customerPhone || '555-0123',
      userId: bookingData.userId || null,
      courtNumber: parseInt(bookingData.courtNumber || bookingData.courtId),
      bookingDate: bookingData.bookingDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      duration: parseInt(bookingData.duration || 60),
      totalAmount: parseFloat(bookingData.totalAmount),
      discountCode: bookingData.discountCode || null,
      discountAmount: parseFloat(bookingData.discountAmount || 0),
      source: 'web'
    };
    
    console.log('📤 Sending to backend:', backendBookingData);
    
    const result = await this.request('/tenant/booking/create-booking', {
      method: 'POST',
      body: backendBookingData,
    });
    
    // console.log('Booking created:', result);
    return result.data || result;
  }

  async applyDiscount(facilitySlug, discountCode, amount) {
    // console.log('Applying discount:', { facilitySlug, discountCode, amount });
    const result = await this.request('/discount/apply-discount', {
      method: 'POST',
      body: { code: discountCode, amount, facilitySlug },
    });
    // console.log('Discount result:', result);
    return result;
  }

  async createPaymentIntent(amount, currency = 'cad') {
    const result = await this.request('/payment/create-payment-intent', {
      method: 'POST',
      body: { amount, currency },
    });
    return result;
  }

  async processPayment(paymentData) {
    const result = await this.request('/payment/process-payment', {
      method: 'POST',
      body: paymentData,
    });
    return result.data || result;
  }

  async getBookingDetails(bookingId) {
    try {
      const result = await this.request(`/booking/${bookingId}`);
      return result.data || result;
    } catch (error) {
      console.error('Failed to get booking details:', error);
      throw error;
    }
  }

  async confirmPayment(paymentData) {
    const result = await this.request('/booking/confirm-payment', {
      method: 'POST',
      body: paymentData,
    });
    return result.data || result;
  }

  async getCancellationDetails(bookingId) {
    const result = await this.request(`/cancellation/${bookingId}`);
    return result.data || result;
  }

  async cancelBooking(bookingId) {
    const result = await this.request(`/cancellation/${bookingId}/cancel`, {
      method: 'POST'
    });
    return result.data || result;
  }
}

export default new ApiService();