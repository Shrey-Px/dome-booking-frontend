// src/utils/vendorPricing.js
export const getCourtPrice = (sport) => {
  return sport === 'Pickleball' ? 30.00 : 25.00;
};

export const formatCourtInfo = (court) => {
  const price = getCourtPrice(court.sport);
  return `${court.name} - ${court.sport} ($${price}/hr)`;
};