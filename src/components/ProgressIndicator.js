// components/ProgressIndicator.js
import React from 'react';

const ProgressIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Select Time' },
    { number: 2, label: 'Booking Details' },
    { number: 3, label: 'Payment' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= step.number
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step.number}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  currentStep > step.number ? 'bg-red-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-2">
        <div className="text-center space-x-16">
          {steps.map((step) => (
            <span
              key={step.number}
              className={`text-sm ${
                currentStep >= step.number ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;