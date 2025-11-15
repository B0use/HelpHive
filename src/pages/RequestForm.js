import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { processRequestWithClaude } from '../config/claude';
import './RequestForm.css';

const RequestForm = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [inputType, setInputType] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const [locationChoice, setLocationChoice] = useState('profile');
  const [manualAddress, setManualAddress] = useState('');
  const googleMapsPromiseRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);

  const handleLocationChoiceChange = (event) => {
    const nextChoice = event.target.value;
    setLocationChoice(nextChoice);
    if (nextChoice !== 'manual') {
      setManualAddress('');
    }
  };

  const getLocationHint = () => {
    switch (locationChoice) {
      case 'current':
        return 'We will use your browser\'s location for this request.';
      case 'manual':
        return 'Enter the exact address or landmark where help is needed.';
      case 'profile':
      default:
        return 'Uses the address saved in your profile settings.';
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
  };

  const ensureGoogleMaps = async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key required for location services.');
    }

    if (window.google?.maps?.places) {
      return window.google;
    }

    if (!googleMapsPromiseRef.current) {
      googleMapsPromiseRef.current = new Promise((resolve, reject) => {
        if (window.google?.maps) {
          resolve(window.google);
          return;
        }

        const existingScript = document.querySelector(
          'script[data-google-maps="true"]'
        );

        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.google));
          existingScript.addEventListener('error', reject);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-google-maps', 'true');
        script.onload = () => resolve(window.google);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    await googleMapsPromiseRef.current;
    return window.google;
  };

  const getPlacesService = async () => {
    const google = await ensureGoogleMaps();
    if (!placesServiceRef.current) {
      const dummyMap = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(dummyMap);
    }
    return placesServiceRef.current;
  };

  const getGeocoder = async () => {
    const google = await ensureGoogleMaps();
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const reverseGeocode = async (lat, lng) => {
    if (lat == null || lng == null) return null;
    try {
      const geocoder = await getGeocoder();
      return await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.length) {
            const result = results[0];
            const components = result.address_components || [];
            const getComponent = (type) =>
              components.find((c) => c.types.includes(type))?.long_name || null;
            resolve({
              address: result.formatted_address,
              city: getComponent('locality') || getComponent('administrative_area_level_2'),
              state: getComponent('administrative_area_level_1'),
              country: getComponent('country')
            });
          } else {
            reject(status);
          }
        });
      });
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  };

  const fetchPlaceByText = async (query) => {
    if (!query.trim()) return null;
    try {
      const service = await getPlacesService();
      return await new Promise((resolve, reject) => {
        service.findPlaceFromQuery(
          {
            query,
            fields: ['formatted_address', 'geometry']
          },
          (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results?.length
            ) {
              const place = results[0];
              resolve({
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
                address: place.formatted_address
              });
            } else {
              reject(status);
            }
          }
        );
      });
    } catch (error) {
      console.error('Places API error:', error);
      return null;
    }
  };

  const enrichLocation = async (location) => {
    if (!location?.lat || !location?.lng) {
      return location;
    }
    if (location.address && location.city) {
      return location;
    }

    const geocoded = await reverseGeocode(location.lat, location.lng);
    if (!geocoded) {
      return location;
    }

    return {
      ...location,
      address: location.address || geocoded.address,
      city: location.city || geocoded.city,
      state: location.state || geocoded.state,
      country: location.country || geocoded.country
    };
  };

  const sanitizeLocation = (location) => {
    if (!location) return null;
    const sanitizedEntries = Object.entries(location).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    );
    return sanitizedEntries.length ? Object.fromEntries(sanitizedEntries) : null;
  };

  const getLocation = async () => {
    if (locationChoice === 'profile') {
      if (userProfile?.location?.lat && userProfile?.location?.lng) {
        const enriched = await enrichLocation({
          lat: userProfile.location.lat,
          lng: userProfile.location.lng,
          address: userProfile.location.address || userProfile.address || null,
          city: userProfile.location.city || userProfile.city || null,
          state: userProfile.location.state || userProfile.state || null,
          country: userProfile.location.country || null,
          source: 'profile'
        });
        return enriched;
      }

      if (userProfile?.address) {
        return {
          address: userProfile.address,
          city: userProfile.city || null,
          state: userProfile.state || null,
          source: 'profile'
        };
      }
    }

    if (locationChoice === 'manual' && manualAddress.trim()) {
      const place = await fetchPlaceByText(manualAddress);
      if (!place?.lat || !place?.lng) {
        throw new Error('Unable to locate that address. Double-check and try again.');
      }
      return await enrichLocation({
        ...place,
        source: 'manual'
      });
    }

    if (locationChoice === 'current' && navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000
          });
        });
        const enriched = await enrichLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: 'current'
        });
        if (enriched?.address) {
          return enriched;
        }
        return {
          ...enriched,
          address: 'Current Location'
        };
      } catch (error) {
        console.warn('Location access denied or unavailable:', error);
      }
    }

    if (userProfile?.address) {
      return {
        address: userProfile.address,
        city: userProfile.city || null,
        state: userProfile.state || null,
        source: 'profile'
      };
    }

    return {
      address: 'Location unavailable',
      source: 'unknown'
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      if (locationChoice === 'manual' && !GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps Places API key required for manual address entry.');
      }
      if (locationChoice === 'manual' && !manualAddress.trim()) {
        throw new Error('Please enter an address for the request location.');
      }

      // Get user's current location using FREE browser geolocation API
      const location = sanitizeLocation(await getLocation());

      // Process input with Claude API
      let processedRequest;
      if (inputType === 'text' && textInput.trim()) {
        processedRequest = await processRequestWithClaude(textInput, 'text');
      } else if (inputType === 'photo' && photos.length > 0) {
        // For MVP, describe photos as text
        const photoDescription = `${photos.length} photo(s) uploaded`;
        processedRequest = await processRequestWithClaude(photoDescription, 'photo');
      } else {
        throw new Error('Please provide text input or upload photos');
      }

      // Upload photos to Firebase Storage (if available) or use alternative
      const photoUrls = [];
      if (photos.length > 0) {
        if (storage) {
          // Use Firebase Storage
          for (const photo of photos) {
            const storageRef = ref(storage, `requests/${currentUser.uid}/${Date.now()}_${photo.name}`);
            await uploadBytes(storageRef, photo);
            const url = await getDownloadURL(storageRef);
            photoUrls.push(url);
          }
        } else {
          // Alternative: Convert to base64 (limited to small images)
          // Note: Firestore has 1MB document limit, so this works for small images only
          for (const photo of photos) {
            if (photo.size > 500000) { // 500KB limit for base64
              throw new Error(`Photo ${photo.name} is too large. Please use Firebase Storage or compress the image.`);
            }
            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(photo);
            });
            photoUrls.push(base64);
          }
        }
      }

      // Ensure required fields are defined and create request document
      const titleText = (processedRequest && processedRequest.title) || (textInput && textInput.trim().slice(0, 100)) || 'Help Request';
      const requestData = {
        userId: currentUser.uid,
        title: titleText,
        description: (processedRequest && processedRequest.description) || textInput,
        category: processedRequest.category || 'general',
        urgencyLevel: processedRequest.urgencyLevel || 'medium',
        peopleNeeded: processedRequest.peopleNeeded || 1,
        taskTypes: processedRequest.taskTypes || [],
        status: 'open',
        location: location
          ? {
              ...location,
              source: location.source || locationChoice
            }
          : null,
        photos: photoUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Claude processed request:', {
        original: textInput,
        processed: processedRequest
      });

      console.log('Creating request with data:', requestData);
      const docRef = await addDoc(collection(db, 'requests'), requestData);
      console.log('Request created with ID:', docRef.id);

      // Small delay to ensure Firestore has processed the write
      await new Promise(resolve => setTimeout(resolve, 500));

      navigate('/requests');
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.message || 'Failed to create request. Please try again.');
      // Don't navigate on error - let user see the error message
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="request-form-page">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>Create Help Request</h1>
      </header>

      <main className="request-form-container">
        <form onSubmit={handleSubmit} className="request-form card">
          <div className="input-type-selector">
            <label>
              <input
                type="radio"
                value="text"
                checked={inputType === 'text'}
                onChange={(e) => setInputType(e.target.value)}
              />
              Text
            </label>
            <label>
              <input
                type="radio"
                value="photo"
                checked={inputType === 'photo'}
                onChange={(e) => setInputType(e.target.value)}
                disabled={!storage}
              />
              Photo {!storage && '(Storage not configured)'}
            </label>
            <label>
              <input
                type="radio"
                value="voice"
                checked={inputType === 'voice'}
                onChange={(e) => setInputType(e.target.value)}
                disabled
              />
              Voice (Coming Soon)
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="locationChoice">Location preference</label>
            <select
              id="locationChoice"
              value={locationChoice}
              onChange={handleLocationChoiceChange}
            >
              <option value="profile">Use my profile location</option>
              <option value="current">Use my current location</option>
              <option value="manual">Enter address manually</option>
            </select>
            <p className="location-choice-note">{getLocationHint()}</p>
          </div>

          {locationChoice === 'manual' && (
            <div className="form-group">
              <label htmlFor="manualAddress">Address</label>
              <input
                type="text"
                id="manualAddress"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="123 Main St, Springfield"
                required={locationChoice === 'manual'}
              />
            </div>
          )}

          {inputType === 'text' && (
            <div className="form-group">
              <label htmlFor="textInput">Describe your request</label>
              <textarea
                id="textInput"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="E.g., I need help getting groceries this week..."
                rows={6}
                required
              />
            </div>
          )}

          {inputType === 'photo' && (
            <div className="form-group">
              <label htmlFor="photos">Upload photos</label>
              {!storage && (
                <div className="info-message">
                  ⚠️ Firebase Storage not configured. Small images (&lt;500KB) will be stored in Firestore.
                  For better performance, configure Firebase Storage (see STORAGE_OPTIONS.md).
                </div>
              )}
              <input
                type="file"
                id="photos"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                required
              />
              {photos.length > 0 && (
                <div className="photo-preview">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      {photo.name} ({Math.round(photo.size / 1024)}KB)
                      {!storage && photo.size > 500000 && (
                        <span className="warning"> - Too large! Max 500KB without Storage</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Submit Request'}
            </button>
          </div>

          <p className="help-text">
            Our AI will automatically categorize your request and determine urgency level.
          </p>
        </form>
      </main>

    </div>
  );
};

export default RequestForm;
