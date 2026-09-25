import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NumberToTime from './NumberToTime';

const ManagementView = ({ config }) => {
  const [liveStaff, setLiveStaff] = useState([]);
  const [suggestions, setSuggestions] = useState([]); 
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveStatus = () => {
    axios.get('/api/tickets/all-tickets', config)
      .then(res => {
        let activePersonnel = [];
        res.data.forEach(ticket => {
          const hours = typeof ticket.hours === 'string' ? JSON.parse(ticket.hours) : ticket.hours;
          if (Array.isArray(hours)) {
            hours.forEach(entry => {
              if (entry.timeOut === "noTimeYet") {
                activePersonnel.push({
                  name: entry.employee,
                  ticket: ticket.title || `Ticket #${ticket.id}`,
                  clockIn: entry.timeIn,
                  status: "Working",
                  coords: entry.coords, 
                  currentTask: entry.task || "Starting shift..." 
                });
              }
            });
          }
        });
        setLiveStaff(activePersonnel);
      }).catch(err => console.error(err));
      
    axios.get('/api/tickets/get-suggestions', config)
      .then(suggestionRes => {
        setSuggestions(suggestionRes.data);
      }).catch(err => console.error(err));

    axios.get('/api/tickets/get-leave-requests', config)
      .then(leaveRes => {
        setLeaveRequests(leaveRes.data);
        setLoading(false);
      }).catch(err => console.error(err));
  };

  const clearSuggestions = () => {
    if (window.confirm("Are you sure you want to permanently delete all staff feedback?")) {
        axios.delete('/api/tickets/clear-suggestions', config)
          .then(() => {
            alert("Feedback log cleared successfully.");
            setSuggestions([]); 
          })
          .catch(err => alert("Error clearing logs: " + err.message));
    }
  };

  const updateLeaveStatus = (id, status) => {
    const originalRequests = [...leaveRequests];
    setLeaveRequests(leaveRequests.filter(req => req.id !== id));

    axios.put('/api/tickets/update-leave-status', { id, status }, config)
        .then(() => {
            alert(`Leave request marked as ${status}`);
            fetchLiveStatus(); 
        })
        .catch(err => {
            alert("Error updating status");
            setLeaveRequests(originalRequests); 
        });
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 30000); 
    return () => clearInterval(interval);
  }, []);

  const backgroundWrapperStyle = {
    minHeight: '100vh',
    width: '100%',
    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.90)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    padding: '40px 20px',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    padding: '32px',
    marginBottom: '32px',
    border: '1px solid #334155'
  };

  const headerCellStyle = {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '0.8rem',
    fontWeight: '800',
    letterSpacing: '1.2px'
  };

  const rowCellStyle = {
    padding: '18px 20px',
    borderBottom: '1px solid #334155',
    color: '#cbd5e1',
    fontSize: '0.9rem'
  };

  const sectionHeaderStyle = {
      fontSize: '1.4rem', 
      fontWeight: '900', 
      color: '#ffffff', 
      marginBottom: '20px', 
      borderLeft: '5px solid #ea580c', 
      paddingLeft: '16px',
      letterSpacing: '-0.01em'
  };

  return (
    <div style={backgroundWrapperStyle}>
      <div className="farm-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ 
                display: 'inline-block',
                backgroundColor: 'rgba(234, 88, 12, 0.15)', 
                color: '#ea580c', 
                border: '1px solid rgba(234, 88, 12, 0.3)',
                padding: '6px 16px', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: '800', 
                letterSpacing: '1.5px', 
                marginBottom: '12px',
                textTransform: 'uppercase'
            }}>
                Command Center
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Management Console</h1>
            <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '1.05rem' }}>Live Oversight & Municipal Accountability Dashboard</p>
          </div>
          <div>
            <span style={{ 
                backgroundColor: '#ea580c', 
                color: '#ffffff', 
                padding: '10px 20px', 
                borderRadius: '50px', 
                fontWeight: '800', 
                fontSize: '0.75rem', 
                letterSpacing: '1.2px', 
                boxShadow: '0 4px 16px rgba(234, 88, 12, 0.3)',
                display: 'inline-block'
            }}>
              ADMIN SESSION ACTIVE ●
            </span>
          </div>
        </header>

        {/* 1. LIVE STAFF TABLE */}
        <div style={cardStyle}>
          <h2 style={{ ...sectionHeaderStyle, marginTop: 0, marginBottom: '24px' }}>Live Active Personnel</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{...headerCellStyle, borderRadius: '12px 0 0 12px'}}>STAFF MEMBER</th>
                  <th style={headerCellStyle}>ACTIVE ASSIGNMENT</th>
                  <th style={headerCellStyle}>LIVE ACTIVITY SUMMARY</th>
                  <th style={{...headerCellStyle, textAlign: 'center'}}>GPS STATUS</th>
                  <th style={{...headerCellStyle, borderRadius: '0 12px 12px 0', textAlign: 'right'}}>SESSION START</th>
                </tr>
              </thead>
              <tbody>
                {liveStaff.length > 0 ? liveStaff.map((staff, index) => (
                  <tr key={index}>
                    <td style={rowCellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', fontSize: '1rem', border: '1px solid #475569' }}>👤</div>
                        <span style={{ fontWeight: '800', color: '#f8fafc' }}>{staff.name}</span>
                      </div>
                    </td>
                    <td style={{ ...rowCellStyle, color: '#94a3b8', fontWeight: '600' }}>{staff.ticket}</td>
                    <td style={rowCellStyle}><div style={{ fontStyle: 'italic', color: '#cbd5e1' }}>"{staff.currentTask}"</div></td>
                    <td style={{ ...rowCellStyle, textAlign: 'center' }}>
                      {staff.coords ? 
                        <span style={{ backgroundColor: 'rgba(22, 163, 74, 0.15)', color: '#4ade80', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(74, 222, 128, 0.3)' }}>📍 Verified On-Site</span> : 
                        <span style={{ backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #475569' }}>Manual Entry</span>
                      }
                    </td>
                    <td style={{ ...rowCellStyle, textAlign: 'right', fontWeight: '800', color: '#ea580c' }}>● {NumberToTime(staff.clockIn)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>No active sessions found. All staff are off-duty.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. PENDING LEAVE APPLICATIONS */}
        <h2 style={sectionHeaderStyle}>Pending Leave Applications</h2>
        
        <div style={cardStyle}>
          {leaveRequests.filter(req => req.status === 'Pending').length > 0 ? (
              leaveRequests.filter(req => req.status === 'Pending').map((req, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', marginBottom: '14px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '14px', border: '1px solid #334155', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                          <div style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '6px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {req.employee} 
                            <span style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(56, 189, 248, 0.3)' }}>{req.type}</span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '6px', fontWeight: '600' }}>
                              📅 {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                          </div>
                          <div style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.9rem' }}>"{req.reason}"</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => updateLeaveStatus(req.id, 'Denied')} 
                            style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                          >
                            Deny ✕
                          </button>
                          <button 
                            onClick={() => updateLeaveStatus(req.id, 'Approved')} 
                            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)', transition: 'all 0.2s ease' }}
                          >
                            Approve ✓
                          </button>
                      </div>
                  </div>
              ))
          ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', margin: 0, fontSize: '0.95rem' }}>No pending leave requests at this time.</p>
          )}
        </div>

        {/* 3. STAFF FEEDBACK */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{...sectionHeaderStyle, marginBottom: 0 }}>Staff Feedback Log</h2>
          {suggestions.length > 0 && (
            <button 
                onClick={clearSuggestions} 
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease' }}
            >
                CLEAR LOG
            </button>
          )}
        </div>

        <div style={cardStyle}>
            {suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <div key={i} style={{ padding: '20px 0', borderBottom: i < suggestions.length - 1 ? '1px solid #334155' : 'none' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#f8fafc', fontWeight: '600', lineHeight: '1.5' }}>"{s.message}"</p>
                    <small style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.78rem', letterSpacing: '0.5px' }}>Received: {new Date(s.created_at).toLocaleDateString()}</small>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', margin: 0, fontSize: '0.95rem' }}>No feedback received recently.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ManagementView;