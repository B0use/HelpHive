import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { prioritizeTasks } from '../config/claude';
import EmergencyButton from '../components/EmergencyButton';
import './VolunteerFeed.css';

const VolunteerFeed = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadRequests();
    }
  }, [userLocation]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location for MVP
          setUserLocation({ lat: 0, lng: 0 });
        }
      );
    } else {
      setUserLocation({ lat: 0, lng: 0 });
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    // Haversine formula (simplified for MVP)
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'requests'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      let requestsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const distance = userLocation && data.location
          ? calculateDistance(
              userLocation.lat,
              userLocation.lng,
              data.location.lat,
              data.location.lng
            )
          : null;
        
        return {
          id: doc.id,
          ...data,
          distance
        };
      });

      // Prioritize using Claude API
      requestsData = await prioritizeTasks(requestsData);

      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId) => {
    // TODO: Implement response functionality
    alert('Response functionality coming soon!');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="volunteer-feed-page">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>Volunteer Feed</h1>
        <button onClick={loadRequests} className="btn btn-secondary">
          Refresh
        </button>
      </header>

      <main className="volunteer-feed-container">
        {loading ? (
          <div className="loading">Loading nearby requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state card">
            <h3>No requests available</h3>
            <p>There are no open help requests in your area at the moment.</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-item card">
                <div className="request-header">
                  <h3>{request.title}</h3>
                  <div className="badges">
                    <span className={`urgency-badge urgency-${request.urgencyLevel}`}>
                      {request.urgencyLevel}
                    </span>
                    {request.distance !== null && (
                      <span className="distance-badge">
                        {request.distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                </div>
                <p className="request-description">{request.description}</p>
                <div className="request-meta">
                  <div className="meta-item">
                    <strong>Category:</strong> {request.category}
                  </div>
                  <div className="meta-item">
                    <strong>Created:</strong> {formatDate(request.createdAt)}
                  </div>
                  {request.location?.address && (
                    <div className="meta-item">
                      <strong>Location:</strong> {request.location.address}
                    </div>
                  )}
                </div>
                <div className="request-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRespond(request.id)}
                  >
                    Respond
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <EmergencyButton />
    </div>
  );
};

export default VolunteerFeed;

