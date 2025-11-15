import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      
      let querySnapshot;
      if (isElderly) {
        // Show user's own requests
        // Try with orderBy first, fallback to simple query if index missing
        try {
          const q = query(
            collection(db, 'requests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (error) {
          // Fallback: query without orderBy if index not created
          console.warn('OrderBy index not found, using simple query:', error);
          const q = query(
            collection(db, 'requests'),
            where('userId', '==', currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        }
      } else {
        // Show requests user has responded to
        try {
          const q = query(
            collection(db, 'requests'),
            orderBy('createdAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (error) {
          // Fallback: query without orderBy
          console.warn('OrderBy index not found, using simple query:', error);
          querySnapshot = await getDocs(collection(db, 'requests'));
        }
      }
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

  const handleResolve = async (requestId) => {
    if (!window.confirm('Mark this request as resolved? This will set the status to "resolved".')) return;
    try {
      const ref = doc(db, 'requests', requestId);
      await updateDoc(ref, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Refresh list
      await loadRequests();
    } catch (error) {
      console.error('Error marking request resolved:', error);
      alert('Failed to mark request as resolved. Please try again.');
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
                  {request.peopleNeeded && (
                    <div className="meta-item">
                      <strong>People Needed:</strong> {request.peopleNeeded}
                    </div>
                  )}
                  {request.taskTypes && request.taskTypes.length > 0 && (
                    <div className="meta-item">
                      <strong>Tasks:</strong>
                      <div className="task-tags">
                        {request.taskTypes.map((task, idx) => (
                          <span key={idx} className="task-tag">{task}</span>
                        ))}
                      </div>
                    </div>
                  )}
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
                  <div className="request-actions-row">
                    {/* If the current user is the owner and request is not resolved, show Resolve button */}
                    {currentUser && request.userId === currentUser.uid && request.status !== 'resolved' && (
                      <button
                        className="btn btn-secondary small"
                        onClick={() => handleResolve(request.id)}
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default RequestList;

