import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManagerLogin = ({ setIsAuthenticated }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // UPDATED: Set to '852000' (or change this to your preferred number)
  const CORRECT_PIN = "852000"; 

  const handleNumberClick = (num) => {
    if (pin.length < 6) setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('isManager', 'true'); // Persist the session
      setIsAuthenticated(true); // Update state in App.js
      navigate('/management'); // Redirect to Hub
    } else {
      setError('Invalid Administrative PIN');
      setPin('');
    }
  };

  return (
    <div style={{ 
      height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    }}>
      <div style={{ 
        background: 'white', padding: '40px', borderRadius: '30px', 
        width: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', textAlign: 'center' 
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔐</div>
        <h2 style={{ fontWeight: '900', color: '#1e293b' }}>Secure Gateway</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '30px' }}>Enter your 6-digit administrative PIN to continue.</p>

        {/* PIN Display Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ 
              width: '15px', height: '15px', borderRadius: '50%', 
              background: i < pin.length ? '#72f88f' : '#e2e8f0',
              border: i < pin.length ? 'none' : '2px solid #cbd5e1',
              transition: '0.2s'
            }} />
          ))}
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

        {/* PIN Pad Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') handleDelete();
                else if (btn === 'OK') handleSubmit();
                else handleNumberClick(btn);
              }}
              style={{
                height: '60px', borderRadius: '15px', border: 'none',
                background: btn === 'OK' ? '#72f88f' : btn === 'C' ? '#f1f5f9' : '#fff',
                color: btn === 'OK' ? '#1a1a1a' : '#1e293b',
                fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: '0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;