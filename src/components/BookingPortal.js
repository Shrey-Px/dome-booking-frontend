// src/components/BookingPortal.js - Complete version with integrated view toggle
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  const { facilitySlug } = useParams();
  const [facility, setFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar' or 'layout'
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

  // Load facility data on mount
  useEffect(() => {
    loadFacility();
  }, [facilitySlug]);

  const loadFacility = async () => {
    try {
      setLoading(true);
      // FIXED: Use the correct UUID that matches your backend and update to 10 courts
      setFacility({
        id: '68cad6b20a06da55dfb88af5',
        name: 'Vision Badminton Centre',
        slug: 'dome-sports',
        courts: [
          { id: 1, name: 'Court 1', sport: 'Badminton' },
          { id: 2, name: 'Court 2', sport: 'Badminton' },
          { id: 3, name: 'Court 3', sport: 'Badminton' },
          { id: 4, name: 'Court 4', sport: 'Badminton' },
          { id: 5, name: 'Court 5', sport: 'Badminton' },
          { id: 6, name: 'Court 6', sport: 'Badminton' },
          { id: 7, name: 'Court 7', sport: 'Badminton' },
          { id: 8, name: 'Court 8', sport: 'Badminton' },
          { id: 9, name: 'Court 9', sport: 'Badminton' },
          { id: 10, name: 'Court 10', sport: 'Badminton' }
        ],
        pricePerHour: 25.00,
        businessHours: {
          weekday: { start: '08:00', end: '20:00' },
          weekend: { start: '06:00', end: '22:00' }
        }
      });
    } catch (error) {
      console.error('Failed to load facility:', error);
      setErrors(prev => ({ ...prev, facility: 'Failed to load facility information' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slotData) => {
    console.log('Slot selected in portal:', slotData);
    
    setSelectedCourt(slotData.court);
    setSelectedSlot({
      time: slotData.time,
      time24: slotData.time24,
      displayTime: slotData.displayTime,
      duration: 60 // Default 1 hour
    });
    setSelectedDate(slotData.date);
    
    // Calculate pricing with NEW structure
    const courtRental = 25.00; // Updated base price
    const serviceFee = courtRental * 0.01; // 1% service fee = $0.25
    const subtotal = courtRental + serviceFee; // $25.25 (before discount)
    const tax = subtotal * 0.13; // 13% tax = $3.28
    const finalTotal = subtotal + tax; // $28.53
    
    setPaymentData({
      courtRental: parseFloat(courtRental.toFixed(2)),
      serviceFee: parseFloat(serviceFee.toFixed(2)),
      discountAmount: 0,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      totalAmount: parseFloat(finalTotal.toFixed(2)), // This will be the base for Stripe
      finalAmount: parseFloat(finalTotal.toFixed(2))
    });

    console.log('Initial pricing calculated:', {
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
      console.log('Submitting booking form:', formData);
      
      // Calculate end time
      const duration = formData.duration || 60;
      const startTime24 = selectedSlot.time24;
      const [startHour, startMin] = startTime24.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMin + duration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime24 = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      const bookingPayload = {
        facilityId: facility.id,
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
      const result = await ApiService.createBooking(bookingPayload);
      
      setBookingData({ 
        ...formData, 
        id: result.id || result.data?.id 
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
    setPaymentData({
      totalAmount: 25.00,
      discountAmount: 0,
      finalAmount: 25.00
    });
    setSuccess(false);
    setErrors({});
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  if (!facility) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facility information...</p>
        </div>
      </div>
    );
  }

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
                Facility ID: {facility.id}, 
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
            onBookingSelect={handleSlotSelect}
            viewMode={currentView}
            onViewModeChange={handleViewChange}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {currentStep === 1 && currentView === 'layout' && (
          <CourtLayoutView 
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