// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import BookingPortal from './components/BookingPortal';
import CancellationPage from './components/CancellationPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<BookingPortal />} />
          <Route path="/cancel-booking" element={<CancellationPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;