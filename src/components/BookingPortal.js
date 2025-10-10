// src/components/BookingPortal.js - Updated to use centralized pricing utility
import React, { useState, useEffect } from 'react';
import { useFacility } from './FacilityLoader';
import CalendarView from './CalendarView';
import CourtLayoutView from './CourtLayoutView';
import BookingForm from './BookingForm';
import PaymentView from './PaymentView';
import ProgressIndicator from './ProgressIndicator';
import ApiService from '../services/api';
import { calculateBookingPrice } from '../utils/pricing';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const BookingPortal = () => {
  const [viewMode, setViewMode] = useState('calendar');
  const { facility, facilitySlug } = useFacility();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    userId: '',
    discountCode: ''
  });
  const [paymentData, setPaymentData] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug
  console.log('BookingPortal render - viewMode:', viewMode, 'currentStep:', currentStep);

  // Set facility in API service when it loads
  useEffect(() => {
    if (facilitySlug) {
      ApiService.setFacility(facilitySlug);
    }
  }, [facilitySlug]);

  // Initialize payment data when facility loads
  useEffect(() => {
    if (facility) {
      const pricing = calculateBookingPrice(facility, 60, 0);
      setPaymentData(pricing);
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
    
    // Calculate initial pricing for selected slot
    const pricing = calculateBookingPrice(facility, 60, 0, slotData.court?.id);
    setPaymentData(pricing);

    setCurrentStep(2);
  };

  // FIXED: Just save form data, don't create booking yet
  const handleBookingSubmit = async (formData) => {
    try {
      setLoading(true);
      console.log('Form data saved, moving to payment step');
      
      // Store the form data - booking will be created after payment
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
    
    // Dispatch event to refresh availability in calendar/layout views
    window.dispatchEvent(new CustomEvent('bookingCreated', {
      detail: { facilitySlug }
    }));
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
    
    // Reset pricing to initial state
    if (facility) {
      const pricing = calculateBookingPrice(facility, 60, 0);
      setPaymentData(pricing);
    }
    
    setSuccess(false);
    setErrors({});
  };

  // Show loading state while facility loads
  if (!facility || !paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking portal...</p>
        </div>
      </div>
    );
  }

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
                | View: {viewMode}
              </p>
              {errors.submit && (
                <p className="text-sm text-red-600 mt-1">
                  <strong>Error:</strong> {errors.submit}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Step 1: Select Court & Time */}
        {currentStep === 1 && viewMode === 'calendar' && (
          <CalendarView 
            onBookingSelect={handleSlotSelect}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {currentStep === 1 && viewMode === 'layout' && (
          <CourtLayoutView 
            onBookingSelect={handleSlotSelect}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
        
        {/* Step 2: Booking Form */}
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
        
        {/* Step 3: Payment */}
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
              />
            </div>
          </div>
        )}
      </div>
    </Elements>
  );
};

export default BookingPortal;