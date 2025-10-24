// src/components/SportSelectionModal.js
import React from 'react';
import { X } from 'lucide-react';
import { getPriceForTimeSlot } from '../utils/dynamicPricing';

const SportSelectionModal = ({ 
  isOpen, 
  onClose, 
  court, 
  time, 
  date, 
  onSelect 
}) => {
  if (!isOpen) return null;

  const hour = parseInt(time.split(':')[0]);
  const badmintonPrice = getPriceForTimeSlot('Badminton', date, hour);
  const pickleballPrice = getPriceForTimeSlot('Pickleball', date, hour);

  const handleSelect = (sport) => {
    onSelect({
      court: { ...court, sport }, // Override sport
      time,
      date,
      price: sport === 'Badminton' ? badmintonPrice : pickleballPrice
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Select Sport</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            {court.name} is available for both Badminton and Pickleball. 
            Please select your preferred sport:
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => handleSelect('Badminton')}
              className="w-full p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-lg">🏸 Badminton</div>
                  <div className="text-sm text-gray-600">{time} • {date.toLocaleDateString()}</div>
                </div>
                <div className="text-xl font-bold text-green-600">
                  ${badmintonPrice}/hr
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleSelect('Pickleball')}
              className="w-full p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-lg">🎾 Pickleball</div>
                  <div className="text-sm text-gray-600">{time} • {date.toLocaleDateString()}</div>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  ${pickleballPrice}/hr
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportSelectionModal;