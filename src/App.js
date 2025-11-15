import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestForm from './pages/RequestForm';
import RequestList from './pages/RequestList';
import VolunteerFeed from './pages/VolunteerFeed';
import Profile from './pages/Profile';
import ClaudeTest from './pages/ClaudeTest';
import './App.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Configuration Error</h2>
        <p>Please set up your Google OAuth Client ID in the .env file</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/request/new"
                element={
                  <PrivateRoute>
                    <RequestForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/requests"
                element={
                  <PrivateRoute>
                    <RequestList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/volunteer/feed"
                element={
                  <PrivateRoute>
                    <VolunteerFeed />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/test/claude"
                element={
                  <PrivateRoute>
                    <ClaudeTest />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

