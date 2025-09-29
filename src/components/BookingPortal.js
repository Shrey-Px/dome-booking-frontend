// src/components/BookingPortal.js - Updated with multi-tenant support
import React, { useState, useEffect } from 'react';
import { useFacility } from './FacilityLoader';
import CalendarView from './CalendarView';
import CourtLayoutView from './CourtLayoutView';
import BookingForm from './BookingForm';
import PaymentView from './PaymentView';
import ProgressIndicator from './ProgressIndicator';
import ApiService from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const BookingPortal = () => {
  // Get facility from context
  const { facility, facilitySlug } = useFacility();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentView, setCurrentView] = useState('calendar');
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    userId: '',
    discountCode: ''
  });
  const [paymentData, setPaymentData] = useState({
    courtRental: 25.00,
    serviceFee: 0.25,
    discountAmount: 0,
    subtotal: 25.25,
    tax: 3.28,
    totalAmount: 28.53,
    finalAmount: 28.53
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Set facility in API service when it changes
  useEffect(() => {
    if (facilitySlug) {
      ApiService.setFacility(facilitySlug);
    }
  }, [facilitySlug]);

  // Update pricing when facility loads
  useEffect(() => {
    if (facility) {
      const courtRental = facility.pricing.courtRental;
      const serviceFee = courtRental * (facility.pricing.serviceFeePercentage / 100);
      const subtotal = courtRental + serviceFee;
      const tax = subtotal * (facility.pricing.taxPercentage / 100);
      const finalTotal = subtotal + tax;
      
      setPaymentData({
        courtRental: parseFloat(courtRental.toFixed(2)),
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        discountAmount: 0,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        totalAmount: parseFloat(finalTotal.toFixed(2)),
        finalAmount: parseFloat(finalTotal.toFixed(2))
      });
    }
  }, [facility]);

  const handleSlotSelect = (slotData) => {
    console.log('Slot selected in portal:', slotData);
    
    setSelectedCourt(slotData.court);
    setSelectedSlot({
      time: slotData.time,
      time24: slotData.time24,
      displayTime: slotData.displayTime,
      duration: 60
    });
    setSelectedDate(slotData.date);
    
    // Calculate pricing with facility-specific rates
    const courtRental = facility.pricing.courtRental;
    const serviceFee = courtRental * (facility.pricing.serviceFeePercentage / 100);
    const subtotal = courtRental + serviceFee;
    const tax = subtotal * (facility.pricing.taxPercentage / 100);
    const finalTotal = subtotal + tax;
    
    setPaymentData({
      courtRental: parseFloat(courtRental.toFixed(2)),
      serviceFee: parseFloat(serviceFee.toFixed(2)),
      discountAmount: 0,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      totalAmount: parseFloat(finalTotal.toFixed(2)),
      finalAmount: parseFloat(finalTotal.toFixed(2))
    });

    console.log('Pricing calculated for facility:', {
      facilityName: facility.name,
      courtRental,
      serviceFee,
      subtotal,
      tax,
      finalTotal
    });

    setCurrentStep(2);
  };

  const handleBookingSubmit = async (formData) => {
    try {
      setLoading(true);
      console.log('Submitting booking for facility:', facility.name);
      console.log('Facility slug:', facilitySlug);
      
      // Calculate end time
      const duration = formData.duration || 60;
      const startTime24 = selectedSlot.time24;
      const [startHour, startMin] = startTime24.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMin + duration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime24 = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      const bookingPayload = {
        facilityId: facility.venueId.toString(),
        courtNumber: selectedCourt.id,
        bookingDate: selectedDate.toISOString().split('T')[0],
        startTime: startTime24,
        endTime: endTime24,
        duration: duration,
        totalAmount: paymentData.finalAmount,
        discountCode: formData.discountCode,
        discountAmount: paymentData.discountAmount,
        source: 'web',
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        userId: formData.userId
      };

      console.log('Sending booking payload:', bookingPayload);
      const result = await ApiService.createBooking(facilitySlug, bookingPayload);
      
      setBookingData({ 
        ...formData, 
        id: result.data?._id || result._id || result.id
      });
      
      console.log('Booking created, moving to payment');
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Booking creation failed:', error);
      setErrors(prev => ({ ...prev, submit: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
  };

  const resetBooking = () => {
    setCurrentStep(1);
    setSelectedSlot(null);
    setSelectedCourt(null);
    setBookingData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      userId: '',
      discountCode: ''
    });
    
    // Reset pricing to facility defaults
    const courtRental = facility.pricing.courtRental;
    const serviceFee = courtRental * (facility.pricing.serviceFeePercentage / 100);
    const subtotal = courtRental + serviceFee;
    const tax = subtotal * (facility.pricing.taxPercentage / 100);
    const finalTotal = subtotal + tax;
    
    setPaymentData({
      courtRental: parseFloat(courtRental.toFixed(2)),
      serviceFee: parseFloat(serviceFee.toFixed(2)),
      discountAmount: 0,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      totalAmount: parseFloat(finalTotal.toFixed(2)),
      finalAmount: parseFloat(finalTotal.toFixed(2))
    });
    
    setSuccess(false);
    setErrors({});
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gray-50">
        {/* Progress Indicator - Only show for steps 2 and 3 */}
        {currentStep > 1 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <ProgressIndicator currentStep={currentStep} />
            </div>
          </div>
        )}
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && currentStep > 1 && (
          <div className="max-w-6xl mx-auto px-4 mb-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Debug:</strong> Step {currentStep}, 
                Facility: {facility.name} ({facilitySlug}), 
                Venue ID: {facility.venueId}, 
                Selected: {selectedCourt?.name || 'none'} at {selectedSlot?.time || 'none'}
                {selectedSlot && ` (${selectedSlot.time24})`}
                | View: {currentView}
              </p>
              {errors.submit && (
                <p className="text-sm text-red-600 mt-1">
                  <strong>Error:</strong> {errors.submit}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Step 1: Calendar/Layout View Selection */}
        {currentStep === 1 && currentView === 'calendar' && (
          <CalendarView 
            facility={facility}
            facilitySlug={facilitySlug}
            onBookingSelect={handleSlotSelect}
            viewMode={currentView}
            onViewModeChange={handleViewChange}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {currentStep === 1 && currentView === 'layout' && (
          <CourtLayoutView 
            facility={facility}
            facilitySlug={facilitySlug}
            onBookingSelect={handleSlotSelect}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={currentView}
            onViewModeChange={handleViewChange}
          />
        )}
        
        {/* Step 2: Booking Form */}
        {currentStep === 2 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <BookingForm
                facility={facility}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedCourt={selectedCourt}
                paymentData={paymentData}
                setPaymentData={setPaymentData}
                onBack={() => setCurrentStep(1)}
                onSubmit={handleBookingSubmit}
                loading={loading}
                errors={errors}
                setErrors={setErrors}
              />
            </div>
          </div>
        )}
        
        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <PaymentView
                facility={facility}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedCourt={selectedCourt}
                bookingData={bookingData}
                paymentData={paymentData}
                onBack={() => setCurrentStep(2)}
                onSuccess={handlePaymentSuccess}
                onReset={resetBooking}
                success={success}
                loading={loading}
                errors={errors}
                setErrors={setErrors}
              />
            </div>
          </div>
        )}
      </div>
    </Elements>
  );
};

export default BookingPortal;