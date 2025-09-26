// src/App.js - Verify this is your current App.js
import React from 'react';
import './App.css';
import BookingPortal from './components/BookingPortal'; // Should be BookingPortal, not CalendarView

function App() {
  return (
    <div className="App">
      <BookingPortal />  {/* This should render the portal with view toggle */}
    </div>
  );
}

export default App;