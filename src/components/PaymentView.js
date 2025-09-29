// components/PaymentView.js - Updated with new pricing structure
import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Check, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import ApiService from '../services/api';

const PaymentView = ({
  facility,
  selectedDate,
  selectedSlot,
  selectedCourt,
  bookingData,
  paymentData,
  onBack,
  onSuccess,
  onReset,
  success,
  loading,
  errors,
  setErrors
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [billingDetails, setBillingDetails] = useState({
    name: bookingData.customerName || '',
    email: bookingData.customerEmail || '',
    phone: bookingData.customerPhone || '',
    address: {
      postal_code: '',
      country: 'CA'
    }
  });

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Create payment intent when component mounts
  useEffect(() => {
    if (!success && paymentData.finalAmount > 0) {
      createPaymentIntent();
    }
  }, [paymentData.finalAmount, success]);

  const createPaymentIntent = async () => {
    try {
      const result = await ApiService.createPaymentIntent(
        Math.round(paymentData.finalAmount * 100), // Convert to cents
        'cad'
      );
      setClientSecret(result.clientSecret);
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      setErrors(prev => ({ ...prev, payment: 'Failed to initialize payment. Please try again.' }));
    }
  };

  // Canadian postal code validation
  const validateCanadianPostalCode = (postalCode) => {
    const canadianPostalRegex = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ ]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
    return canadianPostalRegex.test(postalCode);
  };

  // Format Canadian postal code
  const formatCanadianPostalCode = (value) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Add space after 3rd character if length > 3
    if (cleaned.length > 3) {
      return cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6);
    }
    return cleaned;
  };

  const handleBillingChange = (field, value) => {
    if (field === 'postal_code') {
      const formatted = formatCanadianPostalCode(value);
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: formatted
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateBillingDetails = () => {
    const newErrors = {};
    
    // Only validate postal code as required (for card billing)
    if (!billingDetails.address.postal_code.trim()) {
      newErrors.postal_code = 'Card billing postal code is required';
    } else if (!validateCanadianPostalCode(billingDetails.address.postal_code)) {
      newErrors.postal_code = 'Please enter a valid Canadian postal code (e.g., K1A 0A9)';
    }
    
    return newErrors;
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);

    if (card == null) {
      return;
    }

    // Validate billing details
    const billingErrors = validateBillingDetails();
    if (Object.keys(billingErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...billingErrors }));
      return;
    }

    setProcessing(true);
    setErrors(prev => ({ ...prev, payment: '', postal_code: '' }));

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            phone: billingDetails.phone,
            address: {
              postal_code: billingDetails.address.postal_code,
              country: 'CA'
            }
          },
        }
      });

      if (error) {
        setErrors(prev => ({ ...prev, payment: error.message }));
      } else if (paymentIntent.status === 'succeeded') {
        // Payment successful, finalize booking
        await finalizeBooking(paymentIntent.id);
        onSuccess();
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setErrors(prev => ({ ...prev, payment: 'Payment failed. Please try again.' }));
    } finally {
      setProcessing(false);
    }
  };

  const finalizeBooking = async (paymentIntentId) => {
    try {
      // Calculate end time
      const duration = 60;
      const startTime24 = selectedSlot.time24;
      const [startHour, startMin] = startTime24.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMin + duration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime24 = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    
      console.log('Creating booking after successful payment...');
    
      // CREATE BOOKING NOW (after payment success)
      const bookingPayload = {
        facilityId: facility.venueId.toString(),
        courtNumber: selectedCourt.id,
        bookingDate: selectedDate.toISOString().split('T')[0],
        startTime: startTime24,
        endTime: endTime24,
        duration: duration,
        totalAmount: paymentData.finalAmount,
        discountCode: bookingData.discountCode || null,
        discountAmount: paymentData.discountAmount || 0,
        source: 'web',
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        userId: bookingData.userId || null
      };

      console.log('Booking payload:', bookingPayload);

      const result = await ApiService.createBooking(facilitySlug, bookingPayload);
      const bookingId = result.data?._id || result._id || result.id;
    
      console.log('Booking created with ID:', bookingId);
    
      // Now confirm payment and send email
      await ApiService.confirmPayment({
        bookingId: bookingId,
        paymentIntentId: paymentIntentId
      });
     
      console.log('Payment confirmed and email sent');
    } catch (error) {
      console.error('Failed to finalize booking:', error);
      // Don't fail the payment flow if this fails
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    // Hide the postal code field in CardElement since we'll handle it separately
    hidePostalCode: true,
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
          <p className="text-gray-600 mb-6">
            Your court has been successfully booked. You'll receive a confirmation email shortly.
          </p>
          
          {/* Booking Details with new pricing structure */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
            <h4 className="font-semibold text-gray-900 mb-4 text-center">Booking Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Court:</span>
                <span className="font-medium">{selectedCourt.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{selectedSlot.displayTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">1 hour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{bookingData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{bookingData.customerEmail}</span>
              </div>
              {bookingData.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{bookingData.customerPhone}</span>
                </div>
              )}
              
              {/* Enhanced payment breakdown */}
              <div className="border-t pt-2 mt-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Court Rental:</span>
                    <span>CAD ${paymentData.courtRental?.toFixed(2) || '25.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee (1%):</span>
                    <span>CAD ${paymentData.serviceFee?.toFixed(2) || '0.25'}</span>
                  </div>
                  {paymentData.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount Applied:</span>
                      <span>-CAD ${paymentData.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>CAD ${paymentData.subtotal?.toFixed(2) || '25.25'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (13% HST):</span>
                    <span>CAD ${paymentData.tax?.toFixed(2) || '3.28'}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total Paid:</span>
                  <span className="text-green-600">CAD ${paymentData.finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Please arrive 10 minutes before your scheduled time.
            </p>
            <button
              onClick={onReset}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Book Another Court
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <button
          onClick={onBack}
          className="text-red-500 hover:text-red-600 font-medium"
        >
          ← Back to Details
        </button>
      </div>

      {/* Enhanced Order Summary with new pricing structure */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Court Rental ({selectedCourt.name})</span>
            <span>CAD ${paymentData.courtRental?.toFixed(2) || '25.00'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Service Fee (1% of court rental)</span>
            <span>CAD ${paymentData.serviceFee?.toFixed(2) || '0.25'}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatDate(selectedDate)} • {selectedSlot.displayTime}</span>
            <span>1 hour</span>
          </div>
          {paymentData.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount applied</span>
              <span>-CAD ${paymentData.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>CAD ${paymentData.subtotal?.toFixed(2) || '25.25'}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (13% HST)</span>
            <span>CAD ${paymentData.tax?.toFixed(2) || '3.28'}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-red-600">CAD ${paymentData.finalAmount?.toFixed(2) || '28.53'}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handlePayment} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Payment Information</p>
              <p>Enter your card details and postal code to complete your booking.</p>
            </div>
          </div>
        </div>

        {/* Basic Contact Info (pre-filled from booking form) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={billingDetails.name}
              onChange={(e) => handleBillingChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter cardholder name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={billingDetails.email}
              onChange={(e) => handleBillingChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>
        </div>

        {/* Card Information - Compressed Layout */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 inline mr-2" />
              Card Information & Billing Postal Code
            </label>
            <div className="grid grid-cols-3 gap-4">
              {/* Card Information - Takes up 2/3 of the width */}
              <div className="col-span-2">
                <div className="p-4 border border-gray-300 rounded-lg">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>
              
              {/* Postal Code - Takes up 1/3 of the width */}
              <div className="col-span-1">
                <input
                  type="text"
                  value={billingDetails.address.postal_code}
                  onChange={(e) => handleBillingChange('postal_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.postal_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="K1A 0A9"
                  maxLength={7}
                  required
                  style={{ height: '56px' }} // Match the height of the card element container
                />
              </div>
            </div>
            
            {/* Error message and help text */}
            <div className="mt-2">
              {errors.postal_code && (
                <p className="text-sm text-red-600">{errors.postal_code}</p>
              )}
              <p className="text-xs text-gray-500">
                Enter your card details and the postal code associated with your credit card
              </p>
            </div>
          </div>
        </div>

        {errors.payment && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{errors.payment}</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>Your payment information is encrypted and secure. We use Stripe for payment processing. All amounts are in Canadian Dollars (CAD).</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || processing || loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
        >
          {processing || loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Processing Payment...
            </>
          ) : (
            `Pay CAD ${paymentData.finalAmount?.toFixed(2) || '28.53'}`
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By completing this purchase you agree to our terms of service and cancellation policy.
        </p>
      </div>
    </div>
  );
};

export default PaymentView;