import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = ({ setUserName, setIsClockedIn, isManagerGate = false }) => {

  const [inputName, setInputName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {

    e.preventDefault();

    setError('');

    if (!inputName || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    try {

      // ======================================================
      // LOGIN REQUEST
      // ======================================================

      const response = await axios.post('/api/auth/login-admin', {
        email: inputName,
        password: password
      });

      console.log('✅ Login response:', response.data);

      // ======================================================
      // CHECK LOGIN RESULT
      // ======================================================

      if (!response.data || !response.data.success) {

        setError(
          response.data?.message || 'Invalid credentials.'
        );

        setLoading(false);
        return;
      }

      // ======================================================
      // GET LOGGED-IN USER
      // ======================================================

      const user = response.data.user;

      if (!user) {

        setError('Login succeeded, but no user information was returned.');

        setLoading(false);
        return;
      }

      // ======================================================
      // SAVE USER INFORMATION
      // ======================================================

      if (user.id) {
        sessionStorage.setItem('userId', user.id);
      }

      if (user.email) {
        sessionStorage.setItem('userEmail', user.email);
      }

      if (user.role) {
        sessionStorage.setItem('userRole', user.role);
      }

      if (response.data.token) {
        sessionStorage.setItem('authToken', response.data.token);
      }

      // Keep compatibility with the management page
      if (user.role === 'admin' || user.role === 'manager') {
        sessionStorage.setItem('isManager', 'true');
      } else {
        sessionStorage.removeItem('isManager');
      }

      // ======================================================
      // UPDATE APP STATE
      // ======================================================

      if (setUserName) {

        setUserName(
          user.name ||
          user.email ||
          inputName
        );

      }

      if (setIsClockedIn) {
        setIsClockedIn(false);
      }

      // ======================================================
      // REDIRECT
      // ======================================================

      if (
        isManagerGate ||
        user.role === 'admin' ||
        user.role === 'manager'
      ) {

        navigate('/management');

      } else {

        navigate('/clock-in');

      }

    } catch (err) {

      console.error(
        '❌ Login error:',
        err.response?.data || err.message
      );

      if (err.response?.data?.message) {

        setError(err.response.data.message);

      } else if (err.code === 'ERR_NETWORK') {

        setError(
          'Cannot connect to the server. Please make sure the backend is running.'
        );

      } else {

        setError('Invalid credentials.');

      }

    } finally {

      setLoading(false);

    }

  };

  const bgImage = isManagerGate
    ? "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
    : "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80";

  return (

    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.35)), url("${bgImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
        transition: '0.5s ease'
      }}
    >

      {/* White Glassmorphism Container */}

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '40px 36px',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >

        {/* Top Icon */}

        <div style={{ marginBottom: '12px' }}>

          {isManagerGate ? (

            <svg
              width="52"
              height="62"
              viewBox="0 0 60 75"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))'
              }}
            >

              <rect
                x="0"
                y="32"
                width="60"
                height="43"
                rx="10"
                fill="#8d6021"
              />

              <rect
                x="4"
                y="36"
                width="52"
                height="35"
                rx="8"
                fill="#724c18"
              />

              <circle
                cx="30"
                cy="52"
                r="6"
                fill="#322008"
              />

              <rect
                x="27"
                y="52"
                width="6"
                height="14"
                rx="1"
                fill="#322008"
              />

              <path
                d="M12 32V20C12 10 19 2 30 2C41 2 48 10 48 20V32H42V20C42 13 36.5 8 30 8C23.5 8 18 13 18 20V32H12Z"
                fill="#9e702e"
              />

            </svg>

          ) : (

            <span
              style={{
                fontSize: '2.8rem',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))'
              }}
            >
              🏛️
            </span>

          )}

        </div>

        {/* Header */}

        <h2
          style={{
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 6px 0',
            fontSize: '1.75rem',
            letterSpacing: '-0.025em',
          }}
        >
          {isManagerGate ? 'Management Access' : 'Staff Portal'}
        </h2>

        <p
          style={{
            color: '#334155',
            fontSize: '0.875rem',
            marginTop: 0,
            marginBottom: '28px',
            fontWeight: '500',
          }}
        >

          {isManagerGate
            ? 'Administrative Credentials Required'
            : 'Enter your credentials to access your workstation.'}

        </p>

        {/* Error */}

        {error && (

          <div
            style={{
              width: '100%',
              color: '#dc2626',
              background: 'rgba(254, 226, 226, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              marginBottom: '20px',
              fontWeight: '600',
              boxSizing: 'border-box',
            }}
          >
            {error}
          </div>

        )}

        {/* Form */}

        <form
          onSubmit={handleLogin}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            textAlign: 'left',
          }}
        >

          {/* Username */}

          <div>

            <label
              style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.85rem',
                fontWeight: '700',
                marginBottom: '6px',
              }}
            >
              {isManagerGate
                ? 'Administrator Username'
                : 'Username or Employee ID'}
            </label>

            <input
              type="text"
              value={inputName}
              onChange={(e) => {

                if (error) setError('');

                setInputName(e.target.value);

              }}
              placeholder={
                isManagerGate
                  ? "e.g. Admin_Sipho"
                  : "e.g. admin_user"
              }
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.55)',
                color: '#0f172a',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {

                e.target.style.borderColor = '#f97316';
                e.target.style.background =
                  'rgba(255, 255, 255, 0.85)';

              }}
              onBlur={(e) => {

                e.target.style.borderColor =
                  'rgba(255, 255, 255, 0.6)';

                e.target.style.background =
                  'rgba(255, 255, 255, 0.55)';

              }}
            />

          </div>

          {/* Password */}

          <div>

            <label
              style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.85rem',
                fontWeight: '700',
                marginBottom: '6px',
              }}
            >
              Secure Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {

                if (error) setError('');

                setPassword(e.target.value);

              }}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.55)',
                color: '#0f172a',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {

                e.target.style.borderColor = '#f97316';
                e.target.style.background =
                  'rgba(255, 255, 255, 0.85)';

              }}
              onBlur={(e) => {

                e.target.style.borderColor =
                  'rgba(255, 255, 255, 0.6)';

                e.target.style.background =
                  'rgba(255, 255, 255, 0.55)';

              }}
            />

            <div
              style={{
                textAlign: 'right',
                marginTop: '6px'
              }}
            >

              <a
                href="mailto:it-support@municipality.gov.za?subject=Manager Access Reset"
                style={{
                  color: '#475569',
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                Access Issue? Contact IT Support
              </a>

            </div>

          </div>

          {/* Login Button */}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#fb923c' : '#f97316',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35)',
              transition: 'all 0.15s ease',
              letterSpacing: '0.02em',
            }}
          >

            {loading
              ? 'AUTHORIZING...'
              : isManagerGate
                ? 'UNLOCK DASHBOARD'
                : 'AUTHORIZE & PROCEED'}

          </button>

        </form>

      </div>

    </div>

  );

};

export default Login;