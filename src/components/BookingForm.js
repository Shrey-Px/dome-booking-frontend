// components/BookingForm.js - Updated with new pricing structure
import React, { useState } from 'react';
import { User, Mail, Phone, AlertCircle, Loader } from 'lucide-react';
import ApiService from '../services/api';
// At the top of BookingForm.js
import { calculateBookingPrice } from '../utils/pricing';

const BookingForm = ({
  facility,
  facilitySlug,
  selectedDate,
  selectedSlot,
  selectedCourt,
  court,
  paymentData,
  setPaymentData,
  onBack,
  onSubmit,
  loading,
  errors,
  setErrors
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    userId: '',
    discountCode: ''
  });
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  
  // ADD THIS: Determine which court to use
  const courtToUse = selectedCourt || court;

  // Debug logging
  console.log('BookingForm - Court:', courtToUse);
  console.log('BookingForm - Court ID:', courtToUse?.id);
  console.log('BookingForm - Court Pricing:', courtToUse?.pricing);

  console.log('BookingForm - Court Debug:', {
    selectedCourt,
    court,
    courtToUse,
    courtId: courtToUse?.id,
    pricing: courtToUse?.pricing
  });

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) newErrors.customerEmail = 'Email is invalid';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyDiscount = async () => {
    if (!formData.discountCode || !formData.discountCode.trim()) {
      setErrors(prev => ({ ...prev, discount: 'Please enter a discount code' }));
      return;
    }

    try {
      setApplyingDiscount(true);
      setErrors(prev => ({ ...prev, discount: '' }));
  
      const result = await ApiService.applyDiscount(
        facilitySlug,
        formData.discountCode,
        paymentData.courtRental
      );

      console.log('Discount API response:', result);

      // FIXED: Check both result.data and result directly
      const discountData = result.data || result;
    
      if (result.success && discountData.discountAmount) {
        const discountAmount = discountData.discountAmount;
      
        // Use the centralized pricing utility
        const updatedPricing = calculateBookingPrice(facility, 60, discountAmount, courtToUse?.id);

        console.log('Updated pricing:', updatedPricing);

        setPaymentData({
          ...paymentData,
          ...updatedPricing
        });

        setDiscountApplied(true);
      
        // Clear any previous errors
        setErrors(prev => ({ ...prev, discount: '' }));
      }
    } catch (error) {
      console.error('Discount error:', error);
      setErrors(prev => ({ 
        ...prev, 
        discount: error.message || 'Invalid discount code' 
      }));
      setDiscountApplied(false);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
        <button
          onClick={onBack}
          className="text-red-500 hover:text-red-600 font-medium"
        >
          ← Back to Calendar
        </button>
      </div>

      {/* Booking summary with new pricing structure */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Booking Summary</h3>
        <div className="space-y-1">
          <p className="text-gray-700">
            <span className="font-medium">{courtToUse.name}</span> • {courtToUse.sport}
          </p>
          <p className="text-gray-700">
            {formatDate(selectedDate)} • {selectedSlot.displayTime}
          </p>
          <p className="text-gray-700">Duration: 1 hour</p>
          
          {/* Enhanced pricing breakdown */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Court Rental:</span>
              <span>${paymentData.courtRental?.toFixed(2) || '25.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Fee (1%):</span>
              <span>${paymentData.serviceFee?.toFixed(2) || '0.25'}</span>
            </div>
            {(paymentData.discountAmount > 0) && (
              <div className="flex justify-between text-green-600 text-sm">
                <span>Discount Applied:</span>
                <span>-${paymentData.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${paymentData.subtotal?.toFixed(2) || '25.25'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (13% HST):</span>
              <span>${paymentData.tax?.toFixed(2) || '3.28'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total:</span>
              {/* FIXED: Check both property names */}
              <span className="text-red-600">
                ${(paymentData.finalAmount || paymentData.finalTotal)?.toFixed(2) || '28.53'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Full Name *
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              errors.customerName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => handleInputChange('customerEmail', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              errors.customerEmail ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
          />
          {errors.customerEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => handleInputChange('customerPhone', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter your phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID (Optional)
          </label>
          <input
            type="text"
            value={formData.userId}
            onChange={(e) => handleInputChange('userId', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter your user ID if you have one"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Code
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.discountCode}
              onChange={(e) => handleInputChange('discountCode', e.target.value)}
              disabled={discountApplied}
              className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                errors.discountCode ? 'border-red-300' : 'border-gray-300'
              } ${discountApplied ? 'bg-gray-100' : ''}`}
              placeholder="Enter discount code (e.g., WELCOME10)"
            />
            <button
              onClick={handleApplyDiscount}
              disabled={discountLoading || !formData.discountCode.trim() || discountApplied}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
            >
              {discountLoading ? <Loader className="w-4 h-4 animate-spin" /> : discountApplied ? 'Applied' : 'Apply'}
            </button>
          </div>
          {errors.discountCode && (
            <p className="mt-1 text-sm text-red-600">{errors.discountCode}</p>
          )}
          {discountApplied && paymentData.discountAmount > 0 && (
            <p className="mt-1 text-sm text-green-600">
              Discount applied! You saved ${paymentData.discountAmount.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Error message */}
      {errors.submit && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{errors.submit}</p>
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Continue to Payment'
          )}
        </button>
      </div>
    </div>
  );
};

export default BookingForm;