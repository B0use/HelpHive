import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();

  const isElderly = userProfile?.userType === 'elderly' || userProfile?.userType === 'differently_abled';
  const isVolunteer = userProfile?.userType === 'volunteer' || userProfile?.userType === 'service';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>HelpHive</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/profile')} className="btn btn-secondary">
            Profile
          </button>
          <button onClick={signOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {userProfile?.displayName || 'User'}!</h2>
          {userProfile?.verificationStatus === 'pending' && (
            <div className="verification-notice">
              ⚠️ Your account verification is pending. Some features may be limited.
            </div>
          )}
        </div>

        {!userProfile?.userType && (
          <div className="user-type-selection card">
            <h3>Select Your Role</h3>
            <p>Please choose how you'll be using HelpHive:</p>
            <div className="user-type-options">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/profile?type=elderly')}
              >
                I need help (Elderly/Differently-abled)
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/profile?type=volunteer')}
              >
                I want to help (Volunteer)
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/profile?type=service')}
              >
                I represent an organization (NGO/Service)
              </button>
            </div>
          </div>
        )}

        {isElderly && (
          <div className="dashboard-actions">
            <div className="action-card card">
              <h3>Create Help Request</h3>
              <p>Post a new request for assistance</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/request/new')}
              >
                New Request
              </button>
            </div>

            <div className="action-card card">
              <h3>My Requests</h3>
              <p>View and track your help requests</p>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/requests')}
              >
                View Requests
              </button>
            </div>
          </div>
        )}

        {isVolunteer && (
          <div className="dashboard-actions">
            <div className="action-card card">
              <h3>Volunteer Feed</h3>
              <p>View nearby help requests</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/volunteer/feed')}
              >
                View Feed
              </button>
            </div>

            <div className="action-card card">
              <h3>My Responses</h3>
              <p>Track requests you've responded to</p>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/requests')}
              >
                View Responses
              </button>
            </div>
          </div>
        )}

        {userProfile?.userType && (
          <div className="stats-section card">
            <h3>Your Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{userProfile?.rating || 0}</div>
                <div className="stat-label">Rating</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userProfile?.totalRatings || 0}</div>
                <div className="stat-label">Total Ratings</div>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default Dashboard;

