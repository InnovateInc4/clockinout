import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManagerLogin = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    // Persist session and authenticate
    sessionStorage.setItem('isManager', 'true');
    if (setIsAuthenticated) {
      setIsAuthenticated(true);
    }
    
    // Redirect to management dashboard
    navigate('/management');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage:
          'linear-gradient(rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.35)), url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* White Glassmorphism Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '40px 36px',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Custom SVG Lock Icon */}
        <div style={{ marginBottom: '12px' }}>
          <svg
            width="52"
            height="62"
            viewBox="0 0 60 75"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
          >
            <rect x="0" y="32" width="60" height="43" rx="10" fill="#8d6021" />
            <rect x="4" y="36" width="52" height="35" rx="8" fill="#724c18" />
            <circle cx="30" cy="52" r="6" fill="#322008" />
            <rect x="27" y="52" width="6" height="14" rx="1" fill="#322008" />
            <path
              d="M12 32V20C12 10 19 2 30 2C41 2 48 10 48 20V32H42V20C42 13 36.5 8 30 8C23.5 8 18 13 18 20V32H12Z"
              fill="#9e702e"
            />
          </svg>
        </div>

        {/* Text Headers */}
        <h2
          style={{
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 6px 0',
            fontSize: '1.75rem',
            letterSpacing: '-0.025em',
          }}
        >
          Administrative Portal
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
          Enter your username and password to sign in.
        </p>

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

        {/* Form Controls */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            textAlign: 'left',
          }}
        >
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
              Username or Employee ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                if (error) setError('');
                setUsername(e.target.value);
              }}
              placeholder="e.g. admin_user"
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
                e.target.style.background = 'rgba(255, 255, 255, 0.85)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                e.target.style.background = 'rgba(255, 255, 255, 0.55)';
              }}
            />
          </div>

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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                if (error) setError('');
                setPassword(e.target.value);
              }}
              placeholder="••••••••"
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
                e.target.style.background = 'rgba(255, 255, 255, 0.85)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                e.target.style.background = 'rgba(255, 255, 255, 0.55)';
              }}
            />
            <div style={{ textAlign: 'right', marginTop: '6px' }}>
              <a
                href="#forgot"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: '#475569',
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '10px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#f97316',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '1.05rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
              e.currentTarget.style.background = '#ea580c';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#f97316';
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManagerLogin;