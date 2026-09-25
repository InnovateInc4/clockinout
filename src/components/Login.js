import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUserName, setIsClockedIn, isManagerGate = false }) => {
  const [inputName, setInputName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputName && password) {
      setUserName(inputName);
      if (!isManagerGate) {
        setIsClockedIn(false); 
        navigate('/clock-in'); 
      } else {
        
        navigate('/management');
      }
    }
  };

  
  const bgImage = isManagerGate 
    ? "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80" 
    : "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80";

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `linear-gradient(rgba(0, 0, 0, ${isManagerGate ? '0.85' : '0.7'}), rgba(0, 0, 0, ${isManagerGate ? '0.85' : '0.7'})), url("${bgImage}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: '0.5s ease'
    }}>
      <div className="farm-box" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: isManagerGate ? '#1a1a1a' : 'rgba(255, 255, 255, 0.95)', 
        boxShadow: isManagerGate ? '0 0 30px rgba(114, 248, 143, 0.2)' : '0 20px 50px rgba(0,0,0,0.3)',
        border: isManagerGate ? '1px solid #72f88f' : 'none'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span style={{ fontSize: '3rem' }}>{isManagerGate ? '🔐' : '🏛️'}</span>
          <h2 style={{ 
            fontSize: '1.8rem', 
            color: isManagerGate ? '#72f88f' : '#2c3e50', 
            fontWeight: '800', 
            marginTop: '10px' 
          }}>
            {isManagerGate ? 'Management Access' : 'Staff Portal'}
          </h2>
          <p style={{ color: isManagerGate ? '#aaa' : '#666', fontWeight: '500' }}>
            {isManagerGate ? 'Administrative Credentials Required' : 'Enter your credentials to access your workstation.'}
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label className="box-label" style={{ color: isManagerGate ? '#72f88f' : '#2c3e50' }}>Administrator Username</label>
            <input 
              type="text" 
              className="farm-input" 
              style={{ background: isManagerGate ? '#333' : '#fff', color: isManagerGate ? '#fff' : '#000', border: isManagerGate ? '1px solid #444' : '1px solid #ddd' }}
              placeholder="e.g. Admin_Sipho" 
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label className="box-label" style={{ color: isManagerGate ? '#72f88f' : '#2c3e50' }}>Secure Password</label>
            <input 
              type="password" 
              className="farm-input" 
              style={{ background: isManagerGate ? '#333' : '#fff', color: isManagerGate ? '#fff' : '#000', border: isManagerGate ? '1px solid #444' : '1px solid #ddd' }}
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '25px' }}>
            <a 
              href="mailto:it-support@municipality.gov.za?subject=Manager Access Reset" 
              style={{ color: isManagerGate ? '#72f88f' : '#666', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600', opacity: 0.8 }}
            >
              Access Issue? Contact IT Support
            </a>
          </div>

          <button 
            type="submit" 
            className="nav-btn-clockin" 
            style={{ 
              width: '100%', 
              padding: '15px', 
              fontSize: '1rem',
              backgroundColor: isManagerGate ? '#72f88f' : '#72f88f',
              boxShadow: isManagerGate ? '0 0 15px rgba(114, 248, 143, 0.4)' : 'none'
            }}
          >
            {isManagerGate ? 'UNLOCK DASHBOARD' : 'AUTHORIZE & PROCEED'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;