import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      await signInWithGoogle(credentialResponse);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/logo.png" alt="HelpHive logo" className="login-logo" />
        <h1>HelpHive</h1>
        <p className="subtitle">Connecting communities, one request at a time</p>
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => {
            console.error('Login failed');
            alert('Login failed. Please try again.');
          }}
          useOneTap
        />
        <p className="info-text">
          HelpHive helps connect elderly and differently-abled citizens with verified volunteers in their community.
        </p>
      </div>
    </div>
  );
};

export default Login;

