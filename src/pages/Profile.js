import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationInput from '../components/LocationInput';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    userType: '',
    phoneNumber: '',
    address: ''
  });
  const [location, setLocation] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    urgentTasksNearby: true,
    maxRadius: 5,
    urgencyLevels: ['high', 'emergency']
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        userType: userProfile.userType || searchParams.get('type') || '',
        phoneNumber: userProfile.phoneNumber || '',
        address: userProfile.address || ''
      });
      // Set location if it exists in profile
      if (userProfile.location) {
        setLocation(userProfile.location);
      }
      // Set notification preferences if they exist
      if (userProfile.notificationPreferences) {
        setNotificationPrefs(userProfile.notificationPreferences);
      }
    }
  }, [userProfile, searchParams]);

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // Validate location is captured
      if (!location) {
        setMessage('Please capture your location for proximity matching.');
        setSaving(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...formData,
        location: location, // Save location with lat, lng, and address
        notificationPreferences: notificationPrefs, // Save notification preferences
        updatedAt: new Date()
      });

      setMessage('Profile updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>Profile Settings</h1>
      </header>

      <main className="profile-container">
        <form onSubmit={handleSubmit} className="profile-form card">
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              required
            >
              <option value="">Select your role</option>
              <option value="elderly">Elderly Citizen</option>
              <option value="differently_abled">Differently-abled Citizen</option>
              <option value="volunteer">Individual Volunteer</option>
              <option value="service">NGO/Official Service</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label>Location (for proximity matching)</label>
            <LocationInput
              onLocationSelect={handleLocationSelect}
              initialLocation={location}
              autoLoad={!location} // Auto-load if no location exists
            />
            <p className="help-text" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Your location helps match you with nearby requests. Location is automatically captured.
            </p>
          </div>

          {formData.userType === 'volunteer' && (
            <div className="notification-settings card" style={{
              padding: '20px',
              marginTop: '20px',
              background: 'rgba(255, 234, 162, 0.15)',
              border: '1px solid rgba(255, 220, 150, 0.4)',
              borderRadius: '16px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--color-text)' }}>
                Email Notifications
              </h3>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.urgentTasksNearby}
                    onChange={(e) => setNotificationPrefs({
                      ...notificationPrefs,
                      urgentTasksNearby: e.target.checked
                    })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'normal' }}>
                    Email me about urgent tasks near my location
                  </span>
                </label>
              </div>

              {notificationPrefs.urgentTasksNearby && (
                <div className="radius-setting" style={{ marginLeft: '30px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Notification radius: {notificationPrefs.maxRadius} km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={notificationPrefs.maxRadius}
                    onChange={(e) => setNotificationPrefs({
                      ...notificationPrefs,
                      maxRadius: parseInt(e.target.value)
                    })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <p className="help-text" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    You'll receive emails when urgent tasks are posted within {notificationPrefs.maxRadius} km of your location (max 3 emails per hour).
                  </p>
                </div>
              )}
            </div>
          )}

          {userProfile?.verificationStatus && (
            <div className="verification-status">
              <strong>Verification Status:</strong>{' '}
              <span className={`status-${userProfile.verificationStatus}`}>
                {userProfile.verificationStatus}
              </span>
            </div>
          )}

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

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
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </main>

    </div>
  );
};

export default Profile;

