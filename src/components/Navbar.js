import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ userName, isClockedIn, isManagerAuth, handleSignOut }) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

const handleSearch = (e) => {
  if (e.key !== 'Enter') return;

  const query = searchQuery.trim().toLowerCase();

  if (!query) return;

  if (
    query.includes('vacancy') ||
    query.includes('vacancies') ||
    query.includes('job') ||
    query.includes('career')
  ) {
    navigate('/vacancies');
  } else if (
    query.includes('notice') ||
    query.includes('announcement')
  ) {
    navigate('/notices');
  } else if (
    query.includes('meeting') ||
    query.includes('forum')
  ) {
    navigate('/meetings');
  } else if (
    query.includes('employee') ||
    query.includes('staff') ||
    query.includes('attendance') ||
    query.includes('leave') ||
    query.includes('report') ||
    query.includes('audit') ||
    query.includes('management')
  ) {
    navigate('/management');
  } else if (
    query.includes('home') ||
    query.includes('dashboard')
  ) {
    navigate('/');
  } else {
    alert('No matching section found.');
  }

  setSearchQuery('');
};

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.8)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
      padding: '0 40px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      fontFamily: '"Inter", system-ui, sans-serif'
    }}>
      
      {/* 1. LEFT: BRANDING */}
      <div 
        style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
        onClick={() => navigate('/')}
      >
        <div
  style={{
    width: '46px',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}
>
  <img
    src="https://www.loeser.us/flags/images/south_africa/provincial/northern_cape_arms.jpg"
    alt="Northern Cape Provincial Coat of Arms"
    style={{
      width: '46px',
      height: '46px',
      objectFit: 'contain',
      borderRadius: '6px'
    }}
  />
</div>
        <div style={{ lineHeight: '1.1' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a' }}>
            OFFICE OF THE PREMIER
          </h2>
          <div style={{ fontSize: '0.65rem', color: '#ea580c', fontWeight: '800', marginTop: '2px', textTransform: 'uppercase' }}>
            Northern Cape Provincial Government
          </div>
        </div>
      </div>

      {/* 2. CENTER: SPACED NAVIGATION & SEARCH */}
      <div style={{ 
        flex: '2', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '50px' 
      }}>
        <Link to="/" className="nav-link-item">HOME</Link>
        <Link to="/notices" className="nav-link-item">NOTICE</Link>
        <Link to="/vacancies" className="nav-link-item">VACANCIES</Link>
        <Link to="/meetings" className="nav-link-item">MEETINGS</Link>
        
        {/* Sleek Integrated Frosted Search Input */}
        <div style={{ position: 'relative', marginLeft: '10px' }}>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
onKeyDown={handleSearch}
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: '20px',
              padding: '8px 15px 8px 35px',
              color: '#0f172a',
              fontSize: '0.8rem',
              width: '140px',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
            onFocus={(e) => {
              e.target.style.width = '200px';
              e.target.style.borderColor = '#ea580c';
              e.target.style.backgroundColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.target.style.width = '140px';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.9)';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.85rem' }}>🔍</span>
        </div>
      </div>

      {/* 3. RIGHT: USER CONTROLS */}
      <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
        {userName && (
          <>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isClockedIn ? '#10b981' : '#94a3b8',
                  boxShadow: isClockedIn ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
                }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px', color: '#0f172a' }}>
                  {userName}
                </span>
              </div>
              <span style={{ 
                fontSize: '0.65rem', 
                color: isClockedIn ? '#10b981' : '#64748b', 
                fontWeight: '800',
                textTransform: 'uppercase' 
              }}>
                {isClockedIn ? 'ON DUTY' : 'OFF DUTY'}
              </span>
            </div>
            
            <button 
              onClick={handleSignOut}
              style={{ 
                padding: '10px 18px', 
                fontSize: '0.75rem', 
                fontWeight: '800',
                borderRadius: '8px',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)'
              }}
              onMouseEnter={(e) => { 
                e.target.style.backgroundColor = '#c2410c'; 
                e.target.style.transform = 'translateY(-1px)'; 
              }}
              onMouseLeave={(e) => { 
                e.target.style.backgroundColor = '#ea580c'; 
                e.target.style.transform = 'translateY(0)'; 
              }}
            >
              SIGN OUT
            </button>
          </>
        )}
      </div>

      {/* Internal CSS for the hover effect */}
      <style>{`
        .nav-link-item {
          text-decoration: none;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          transition: 0.3s;
          position: relative;
        }
        .nav-link-item:hover {
          color: #ea580c;
        }
        .nav-link-item::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -6px;
          left: 0;
          background-color: #ea580c;
          transition: 0.3s ease-out;
          border-radius: 2px;
        }
        .nav-link-item:hover::after {
          width: 100%;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;