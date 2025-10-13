// components/PaymentView.js - FIXED: Validate booking before payment
import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import ApiService from '../services/api';

const PaymentView = ({
  facilitySlug,
  selectedDate,
  selectedSlot,
  selectedCourt,
  bookingData,
  paymentData,
  onBack,
  onSuccess,
  onReset,
  success
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [errors, setErrors] = useState({});
  const [billingDetails, setBillingDetails] = useState({
    name: bookingData.customerName || '',
    email: bookingData.customerEmail || '',
    phone: bookingData.customerPhone || '',
    address: {
      postal_code: '',
      country: 'CA'
    }
  });

  const totalAmount = paymentData.finalAmount || paymentData.finalTotal;

  console.log('PaymentView initialized with facilitySlug:', facilitySlug);

  // Validate booking availability BEFORE creating payment intent
  useEffect(() => {
    const validateBooking = async () => {
      if (!facilitySlug || success) return;
      
      try {
        setValidating(true);
        console.log('Validating booking availability before payment...');
        
        // Format date
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Check if slot is still available
        const availability = await ApiService.getAvailability(facilitySlug, dateStr);
        const courtAvailability = availability.availability?.[selectedCourt.id];
        
        if (!courtAvailability || !courtAvailability[selectedSlot.time24]) {
          setErrors({ 
            validation: 'This time slot is no longer available. Please select another slot.' 
          });
          setValidating(false);
          return;
        }
        
        console.log('✅ Slot is available, creating payment intent...');
        
        // Create payment intent only after validation
        const result = await ApiService.createPaymentIntent(
          Math.round(totalAmount * 100),
          'cad'
        );
        
        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setValidating(false);
        } else {
          throw new Error('Failed to get payment client secret');
        }
      } catch (error) {
        console.error('Validation or payment intent creation failed:', error);
        setErrors({ 
          validation: error.message || 'Unable to process booking. Please try again.' 
        });
        setValidating(false);
      }
    };

    validateBooking();
  }, [facilitySlug, selectedDate, selectedSlot, selectedCourt, totalAmount, success]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const validateCanadianPostalCode = (postalCode) => {
    const regex = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ ]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
    return regex.test(postalCode);
  };

  const formatCanadianPostalCode = (value) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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
        address: { ...prev.address, [field]: formatted }
      }));
    } else {
      setBillingDetails(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateBillingDetails = () => {
    const newErrors = {};
    
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
      console.error('Stripe not loaded');
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      console.error('Card element not found');
      return;
    }

    const billingErrors = validateBillingDetails();
    if (Object.keys(billingErrors).length > 0) {
      setErrors(billingErrors);
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      console.log('Confirming card payment...');
      
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
        console.error('Payment error:', error);
        setErrors({ payment: error.message });
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded! Creating booking...');
        await createBookingAfterPayment(paymentIntent.id);
      }

    } catch (error) {
      console.error('Payment failed:', error);
      setErrors({ payment: 'Payment processing failed. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const createBookingAfterPayment = async (paymentIntentId) => {
    try {
      const duration = selectedSlot.duration || 60;
      const startTime24 = selectedSlot.time24;
      const [startHour, startMin] = startTime24.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMin + duration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime24 = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const bookingDateString = `${year}-${month}-${day}`;

      const bookingPayload = {
        facilitySlug: facilitySlug,
        courtNumber: selectedCourt.id,
        bookingDate: bookingDateString,
        startTime: startTime24,
        endTime: endTime24,
        duration: duration,
        totalAmount: totalAmount,
        discountCode: bookingData.discountCode || null,
        discountAmount: paymentData.discountAmount || 0,
        source: 'web',
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        userId: bookingData.userId || null
      };

      console.log('📦 Creating booking with payload:', bookingPayload);

      const bookingResult = await ApiService.createBooking(facilitySlug, bookingPayload);
      const bookingId = bookingResult.data?._id || bookingResult._id || bookingResult.id;

      if (!bookingId) {
        throw new Error('Booking created but no ID returned');
      }

      console.log('✅ Booking created:', bookingId);

      await ApiService.confirmPayment({
        bookingId: bookingId,
        paymentIntentId: paymentIntentId
      });

      console.log('✅ Payment confirmed and email sent');

      window.dispatchEvent(new CustomEvent('bookingCreated', { 
        detail: { bookingId, facilitySlug } 
      }));

      onSuccess();

    } catch (bookingError) {
      console.error('❌ Failed to create booking after payment:', bookingError);
      setErrors({ 
        payment: `Payment succeeded but booking creation failed. Please contact support with payment ID: ${paymentIntentId}` 
      });
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' },
      },
      invalid: { color: '#9e2146' },
    },
    hidePostalCode: true,
  };

  // Success View
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
              
              <div className="border-t pt-2 mt-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Court Rental:</span>
                    <span>{formatPrice(paymentData.courtRental)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span>{formatPrice(paymentData.serviceFee)}</span>
                  </div>
                  {paymentData.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount Applied:</span>
                      <span>-{formatPrice(paymentData.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(paymentData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (13% HST):</span>
                    <span>{formatPrice(paymentData.tax)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total Paid:</span>
                  <span className="text-green-600">{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={onReset}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Book Another Court
          </button>
        </div>
      </div>
    );
  }

  // Validation/Loading View
  if (validating) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <Loader className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Validating Booking</h3>
          <p className="text-gray-600">
            Checking availability and preparing payment...
          </p>
        </div>
      </div>
    );
  }

  // Validation Error View
  if (errors.validation) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Unavailable</h3>
          <p className="text-gray-600 mb-6">
            {errors.validation}
          </p>
          <button
            onClick={onBack}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            ← Select Another Slot
          </button>
        </div>
      </div>
    );
  }

  // Payment Form View
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

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Court Rental ({selectedCourt.name})</span>
            <span>{formatPrice(paymentData.courtRental)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Service Fee</span>
            <span>{formatPrice(paymentData.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatDate(selectedDate)} • {selectedSlot.displayTime}</span>
            <span>1 hour</span>
          </div>
          {paymentData.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount applied</span>
              <span>-{formatPrice(paymentData.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(paymentData.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (13% HST)</span>
            <span>{formatPrice(paymentData.tax)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-red-600">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={billingDetails.name}
              onChange={(e) => handleBillingChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter cardholder name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={billingDetails.email}
              onChange={(e) => handleBillingChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 inline mr-2" />
            Card Information & Billing Postal Code
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="p-4 border border-gray-300 rounded-lg">
                <CardElement options={cardElementOptions} />
              </div>
            </div>
            <div className="col-span-1">
              <input
                type="text"
                value={billingDetails.address.postal_code}
                onChange={(e) => handleBillingChange('postal_code', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                  errors.postal_code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="K1A 0A9"
                maxLength={7}
                required
                style={{ height: '56px' }}
              />
            </div>
          </div>
          {errors.postal_code && (
            <p className="mt-2 text-sm text-red-600">{errors.postal_code}</p>
          )}
        </div>

        {errors.payment && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{errors.payment}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing || !clientSecret}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
        >
          {processing ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Processing Payment...
            </>
          ) : (
            `Pay ${formatPrice(totalAmount)}`
          )}
        </button>
      </form>
    </div>
  );
};

export default PaymentView;