import React from 'react';

const Hero = ({ onStartClick }) => {
  return (
    <div style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e2e8f0', 
        marginBottom: '40px',
        padding: '60px 0',
        textAlign: 'center',
        fontFamily: '"Inter", system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        <span style={{ 
            display: 'inline-block',
            backgroundColor: '#fff7ed', 
            color: '#ea580c', 
            border: '1px solid #ffedd5',
            padding: '6px 16px', 
            borderRadius: '9999px', 
            fontSize: '0.75rem', 
            fontWeight: '800', 
            letterSpacing: '1.5px', 
            marginBottom: '16px',
            textTransform: 'uppercase'
        }}>
            Municipal Workforce Platform
        </span>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#0f172a', marginBottom: '20px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          Streamlining Municipal Operations, One Shift at a Time
        </h1>
        <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Track work hours, manage departmental teams, and keep daily municipal services running smoothly. 
          Built for field teams, supervisors, and administrators.
        </p>
        <button 
          onClick={() => {
            if (onStartClick) onStartClick();
            const el = document.getElementById('clock-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }} 
          style={{
            backgroundColor: '#ea580c',
            color: '#ffffff',
            border: 'none',
            padding: '16px 36px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          Start Your Workday
        </button>
      </div>
    </div>
  );
};

export default Hero;