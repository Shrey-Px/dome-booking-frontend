// services/api.js - Fixed API Service with facilitySlug
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://dome-booking-backend-production.up.railway.app/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.facilitySlug = null;
  }

  setFacilitySlug(slug) {
    this.facilitySlug = slug;
    console.log('ApiService: Facility slug set to', slug);
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    console.log(`API ${method} ${endpoint}`, data ? { payload: data } : '');

    try {
      const response = await fetch(url, config);
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        
        const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Facility endpoints
  async getFacility(slug) {
    console.log('Getting facility:', slug);
    const response = await this.request('GET', `/facilities/${slug}`);
    return response.data || response;
  }

  async getAvailability(facilitySlug, date) {
    console.log('Getting availability:', { facilitySlug, date });
    const response = await this.request('GET', `/availability/${facilitySlug}?date=${date}`);
    return response;
  }

  // Booking endpoints - ALL use facilitySlug
  async createBooking(facilitySlug, bookingData) {
    console.log('Creating booking with facilitySlug:', facilitySlug);
    console.log('Booking data:', bookingData);
    
    // Ensure facilitySlug is in the payload
    const payload = {
      ...bookingData,
      facilitySlug: facilitySlug
    };
    
    console.log('Final payload:', payload);
    
    return this.request('POST', '/booking/create-booking', payload);
  }

  async confirmPayment(data) {
    console.log('Confirming payment:', data);
    return this.request('POST', '/booking/confirm-payment', data);
  }

  async getBooking(id) {
    return this.request('GET', `/booking/${id}`);
  }

  async cancelBooking(id) {
    return this.request('POST', `/booking/${id}/cancel`);
  }

  async getCancellationDetails(id) {
    return this.request('GET', `/booking/${id}/cancel`);
  }

  // Payment endpoints
  async createPaymentIntent(amount, currency = 'cad') {
    console.log('Creating payment intent:', { amount, currency });
    return this.request('POST', '/payment/create-intent', {
      amount,
      currency
    });
  }

  // Discount endpoints
  async validateDiscount(code, facilitySlug) {
    console.log('Validating discount:', { code, facilitySlug });
    return this.request('POST', `/discounts/validate`, {
      code,
      facilitySlug
    });
  }
}

export default new ApiService();