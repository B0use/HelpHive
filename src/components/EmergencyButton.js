import React from 'react';
import './EmergencyButton.css';

const EmergencyButton = () => {
  const handleEmergency = () => {
    const emergencyNumber = process.env.REACT_APP_EMERGENCY_PHONE_NUMBER || '911';
    if (window.confirm(`Call emergency services at ${emergencyNumber}?`)) {
      window.location.href = `tel:${emergencyNumber}`;
    }
  };

  return (
    <button 
      className="emergency-btn" 
      onClick={handleEmergency}
      aria-label="Emergency Call"
      title="Emergency Call"
    >
      🚨
    </button>
  );
};

export default EmergencyButton;

