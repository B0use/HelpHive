import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { processRequestWithClaude } from '../config/claude';
import './RequestForm.css';

const RequestForm = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [inputType, setInputType] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location' // Can add reverse geocoding later if needed
            });
          },
          (error) => {
            console.warn('Location access denied or unavailable:', error);
            // Fallback: user can manually enter location later
            resolve({
              lat: 0,
              lng: 0,
              address: 'Location unavailable - will be set manually'
            });
          }
        );
      } else {
        resolve({
          lat: 0,
          lng: 0,
          address: 'Location unavailable'
        });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // Get user's current location using FREE browser geolocation API
      const location = await getLocation();

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

      // Create request document
      const requestData = {
        userId: currentUser.uid,
        title: processedRequest.title,
        description: processedRequest.description || textInput,
        category: processedRequest.category || 'general',
        urgencyLevel: processedRequest.urgencyLevel || 'medium',
        status: 'open',
        location: location,
        photos: photoUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'requests'), requestData);

      navigate('/requests');
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.message || 'Failed to create request. Please try again.');
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

