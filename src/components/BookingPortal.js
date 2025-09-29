// src/components/BookingPortal.js - Fixed booking creation timing
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

  useEffect(() => {
    if (facilitySlug) {
      ApiService.setFacility(facilitySlug);
    }
  }, [facilitySlug]);

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

    setCurrentStep(2);
  };

  // FIXED: Don't create booking here - just save form data
  const handleBookingSubmit = async (formData) => {
    try {
      setLoading(true);
      console.log('Form data saved, moving to payment step');
      
      // Just store the form data - booking will be created after payment
      setBookingData(formData);
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Form submission failed:', error);
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
        {currentStep > 1 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <ProgressIndicator currentStep={currentStep} />
            </div>
          </div>
        )}
        
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
        
        {currentStep === 2 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <BookingForm
                facility={facility}
                facilitySlug={facilitySlug}
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
        
        {currentStep === 3 && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <PaymentView
                facility={facility}
                facilitySlug={facilitySlug}
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