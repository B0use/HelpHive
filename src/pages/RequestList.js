import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import './RequestList.css';

const RequestList = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [currentUser, userProfile]);

  const loadRequests = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const isElderly = userProfile?.userType === 'elderly' || userProfile?.userType === 'differently_abled';
      
      let q;
      if (isElderly) {
        // Show user's own requests
        q = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Show requests user has responded to
        q = query(
          collection(db, 'requests'),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="request-list-page">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>My Requests</h1>
      </header>

      <main className="request-list-container">
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state card">
            <h3>No requests yet</h3>
            <p>You haven't created any help requests.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/request/new')}
            >
              Create First Request
            </button>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
              <div key={request.id} className="request-card card">
                <div className="request-header">
                  <h3>{request.title}</h3>
                  <div className="badges">
                    <span className={`urgency-badge urgency-${request.urgencyLevel}`}>
                      {request.urgencyLevel}
                    </span>
                    <span className={`status-badge status-${request.status}`}>
                      {request.status}
                    </span>
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
                {request.photos && request.photos.length > 0 && (
                  <div className="request-photos">
                    <strong>Photos:</strong> {request.photos.length} attached
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default RequestList;

