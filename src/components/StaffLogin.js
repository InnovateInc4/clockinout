import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StaffLogin = ({ setStaffAuthenticated }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // For now, this is a basic hardcoded check. 
    // We will connect this to your Express API later.
    if (employeeId === 'NC-123' && password === 'admin') {
      sessionStorage.setItem('isStaff', 'true');
      setStaffAuthenticated(true);
      navigate('/portal'); // Redirects to the page shown in your image
    } else {
      setError('Invalid Employee ID or Password. Access Denied.');
    }
  };

  const backgroundWrapperStyle = {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    // Uses a dark gradient to keep the focus on the login card
    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.90)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxSizing: 'border-box',
    padding: '20px'
  };

  const frostedCardStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #334155',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '20px',
    borderRadius: '10px',
    border: '1px solid #475569',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f8fafc',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  return (
    <div style={backgroundWrapperStyle}>
      <div style={frostedCardStyle}>
        
        {/* Branding Matching the Nav Bar */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            backgroundColor: '#ea580c', 
            color: 'white', 
            fontWeight: '900', 
            fontSize: '1.5rem', 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px auto',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
          }}>
            NC
          </div>
          <h2 style={{ color: '#ffffff', margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: '800' }}>
            PREMIER'S PORTAL
          </h2>
          <p style={{ color: '#ea580c', margin: 0, fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px' }}>
            NORTHERN CAPE GOVT.
          </p>
        </div>

        <div style={{ borderBottom: '1px solid #334155', marginBottom: '24px' }}></div>

        <h3 style={{ color: '#f8fafc', margin: '0 0 20px 0', fontSize: '1.1rem' }}>Staff Authentication</h3>

        {error && (
          <div style={{ 
            color: '#ef4444', fontSize: '0.85rem', marginBottom: '20px', fontWeight: '700', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', 
            border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600' }}>
            Employee ID
          </label>
          <input 
            type="text" 
            placeholder="e.g. NC-4589" 
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            style={inputStyle}
            required
          />

          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600' }}>
            Password
          </label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />

          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
              transition: 'all 0.2s ease',
              marginTop: '10px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c2410c'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
          >
            SECURE LOGIN
          </button>
        </form>
        
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', marginTop: '24px' }}>
          Restricted Access. Authorized Municipal Personnel Only.
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;