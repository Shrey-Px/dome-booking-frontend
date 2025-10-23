export const getCourtPrice = (sport) => {
  if (sport === 'Cricket') return 45.00;      // ✅ ADD THIS LINE
  if (sport === 'Pickleball') return 30.00;
  return 25.00; // Default (Badminton)
};

export const formatCourtInfo = (court) => {
  const price = getCourtPrice(court.sport);
  return `${court.name} - ${court.sport} ($${price}/hr)`;
};