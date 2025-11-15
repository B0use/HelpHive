import React, { useState, useEffect } from 'react';
import './LocationInput.css';

const LocationInput = ({ onLocationSelect, initialLocation = null, autoLoad = true }) => {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Try to get address via reverse geocoding (optional)
        let address = 'Current Location';
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              address = data.results[0].formatted_address;
            }
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }
        }

        const location = {
          lat,
          lng,
          address: address,
        };
        setSelectedLocation(location);
        onLocationSelect(location);
        setLocationError(null);
        setIsLoadingLocation(false);
      },
      (error) => {
        setLocationError('Unable to get your location. Please allow location access in your browser settings.');
        setIsLoadingLocation(false);
      }
    );
  };

  useEffect(() => {
    if (autoLoad && !selectedLocation && !isLoadingLocation) {
      getCurrentLocation();
    }
  }, [autoLoad]);

  return (
    <div className="location-input">
      <div className="current-location-section">
        {isLoadingLocation && (
          <div className="location-loading">Getting your location...</div>
        )}
        {selectedLocation && !isLoadingLocation && (
          <div className="location-display">
            ✅ Location captured: {selectedLocation.address}
            <br />
            <small>Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</small>
          </div>
        )}
        {locationError && (
          <div className="location-error">
            {locationError}
            <button
              type="button"
              onClick={getCurrentLocation}
              className="btn btn-secondary btn-small"
              style={{ marginTop: '8px' }}
            >
              Try Again
            </button>
          </div>
        )}
        {!isLoadingLocation && !selectedLocation && !locationError && (
          <button
            type="button"
            onClick={getCurrentLocation}
            className="btn btn-secondary"
          >
            Get Current Location
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationInput;

