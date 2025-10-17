// src/services/vendorApi.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dome-booking-backend-production.up.railway.app/api/v1';

class VendorApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('vendorToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('vendorToken', token);
    } else {
      localStorage.removeItem('vendorToken');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('vendorToken');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorData');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/vendor${endpoint}`;

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...(options || {})
    };

    // auth header
    const token = this.getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    // only stringify if body is a plain object (not already a string/FormData)
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/vendor/login';
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  }

  // Authentication
  async login(email, password) {
    const result = await this.request('/login', {
      method: 'POST',
      body: { email, password }
    });
    
    if (result.success && result.data.token) {
      this.setToken(result.data.token);
      localStorage.setItem('vendorData', JSON.stringify(result.data.vendor));
    }
    
    return result;
  }

  // Add this method to vendorApi service:
  async getFacilityCourts() {
    return await this.request('/courts');
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getProfile() {
    return await this.request('/profile');
  }

  // Bookings
  async getBookings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/bookings${queryString ? '?' + queryString : ''}`);
  }

  async getBookingDetails(bookingId) {
    return await this.request(`/bookings/${bookingId}`);
  }

  async getStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/stats${queryString ? '?' + queryString : ''}`);
  }

  // Add these methods to the vendorApi object

  async cancelBooking(bookingId) {
    return await this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PUT'
    });
  }

  async createBooking(bookingData) {
    return await this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  // Helper to get stored vendor data
  getVendorData() {
    const data = localStorage.getItem('vendorData');
    return data ? JSON.parse(data) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new VendorApiService();