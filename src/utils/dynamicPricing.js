// src/utils/dynamicPricing.js
export const getPriceForTimeSlot = (sport, date, hour) => {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (sport === 'Badminton') {
    if (isWeekend) return 30;
    if (hour >= 9 && hour < 17) return 20;  // 9 AM - 5 PM
    if (hour >= 17) return 30;              // 5 PM onwards
    return 30; // Default
  }
  
  if (sport === 'Pickleball') {
    if (isWeekend) return 35;
    if (hour >= 12 && hour < 17) return 25;  // 12 PM - 5 PM
    if (hour >= 17) return 35;               // 5 PM onwards
    return 35; // Default
  }
  
  // Cricket or other sports
  if (sport === 'Cricket') {
    return 45;
  }
  
  return 25; // Fallback
};

export const calculateBookingPriceNoTax = (facility, sport, date, hour, duration = 60, discountAmount = 0) => {
  const basePrice = getPriceForTimeSlot(sport, date, hour);
  const durationInHours = duration / 60;
  const courtRental = basePrice * durationInHours;
  
  // Service fee (1% default)
  const serviceFeePercentage = facility?.pricing?.serviceFeePercentage || 1.0;
  const serviceFee = courtRental * (serviceFeePercentage / 100);
  
  // Total without tax (tax is included in the price)
  const total = courtRental + serviceFee - discountAmount;
  
  return {
    courtRental: parseFloat(courtRental.toFixed(2)),
    serviceFee: parseFloat(serviceFee.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    basePrice,
    sport,
    timeSlot: hour
  };
};