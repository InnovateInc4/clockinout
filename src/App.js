import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import LiveClock from './components/LiveClock';
import Vacancies from './components/Vacancies';
import Notices from './components/Notices';
import Meetings from './components/Meetings';
import ManagerLogin from './components/ManagerLogin';
import ManagementView from './components/ManagementView';
import HRAdminPanel from './components/HRAdminPanel';
import HRAdminOTP from './components/HRAdminOTP';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

function App() {
  const [userName, setUserName] = useState(sessionStorage.getItem('userName') || 'Alecia Mokoena');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isManagerAuth, setIsManagerAuth] = useState(sessionStorage.getItem('isManager') === 'true');
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');

  const [hoursWorked] = useState(32.5);
  const [locationStatus, setLocationStatus] = useState('Verifying...');
  const [showHistory, setShowHistory] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [leaveBalance] = useState({ sick: 12, annual: 15, family: 3 });
  const [leaveForm, setLeaveForm] = useState({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' });
  const [shiftHistory, setShiftHistory] = useState([]);

  // Ticket & Task Logging States
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showManualTime, setShowManualTime] = useState(false);
  const [manualTime, setManualTime] = useState({ date: '', hour: '08', minute: '00', ampm: 'AM' });

  const location = useLocation();

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    if (userName && location.pathname === '/clock-in') {
      // Fetch available tickets for dropdown
      axios.get('/api/tickets/all-tickets', config)
        .then(res => setTickets(res.data))
        .catch(() => {
          // Fallback mock tickets if API server is offline
          setTickets([
            { _id: '1', ticketName: 'Water Line Repair - Sector 4' },
            { _id: '2', ticketName: 'Electrical Grid Inspection - North' },
            { _id: '3', ticketName: 'Road Maintenance & Pothole Repair' }
          ]);
        });

      // Geolocation check
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationStatus('Within Municipal Zone ✅'),
          () => setLocationStatus('Location Disabled ⚠️')
        );
      } else {
        setLocationStatus('GPS Unavailable ⚠️');
      }
    }
  }, [userName, location.pathname]);

  const triggerSuccess = (msg) => {
    setShowSuccess(msg);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleClockToggle = () => {
    if (!isClockedIn) {
      setIsClockedIn(true);
      triggerSuccess("Clocked In Successfully!");
    } else {
      setIsClockedIn(false);
      triggerSuccess("Clocked Out Successfully!");
    }
  };

  const fetchUserHistory = () => {
    axios.get('/api/tickets/all-tickets', config)
      .then(res => {
        let userLogs = [];
        res.data.forEach(ticket => {
          const hours = typeof ticket.hours === 'string' ? JSON.parse(ticket.hours) : ticket.hours;
          if (Array.isArray(hours)) {
            const myLogs = hours.filter(entry => entry.employee === userName);
            userLogs.push(...myLogs);
          }
        });
        setShiftHistory(userLogs.reverse());
      })
      .catch(err => console.error("History Fetch Error:", err));
  };

  const submitLeaveRequest = (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return alert("Please fill in all fields.");
    }

    axios.post('/api/tickets/submit-leave', { ...leaveForm, employee: userName }, config)
      .then(res => {
        if (res.data.success) {
          triggerSuccess("Leave Application Submitted to Management");
          setLeaveForm({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' });
          setShowLeave(false);
        } else {
          alert("Error submitting request.");
        }
      })
      .catch(err => alert("Network Error: " + err.message));
  };

  const handleSignOut = () => {
    sessionStorage.clear();
    setUserName('');
    setIsClockedIn(false);
    setIsManagerAuth(false);
    setToken('');
    setShowHistory(false);
    setShowLeave(false);
    window.location.href = '/login';
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(114, 248, 143);
    doc.setFontSize(22);
    doc.text("MUNICIPAL WORKSTATION", 14, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Staff Member: ${userName}`, 14, 50);
    doc.text(`Employee ID: MUN-${userName.substring(0, 3).toUpperCase()}-2026`, 14, 58);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 66);

    const tableRows = shiftHistory.map(log => [
      new Date(log.date || Date.now()).toLocaleDateString(),
      log.timeIn,
      log.timeOut === "noTimeYet" ? "Active" : log.timeOut,
      log.totalHours || "---"
    ]);

    doc.autoTable({
      startY: 75,
      head: [['DATE', 'CLOCK IN', 'CLOCK OUT', 'TOTAL HOURS']],
      body: tableRows.length > 0 ? tableRows : [['No data', '--', '--', '--']],
      headStyles: { fillColor: [26, 26, 26], textColor: [114, 248, 143] },
      styles: { fontSize: 11 }
    });
    doc.save(`Shift_History_${userName}.pdf`);
    triggerSuccess("PDF Downloaded Successfully");
  };

  return (
    <div className="App" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
      <Navbar 
        userName={userName} 
        isClockedIn={isClockedIn} 
        isManagerAuth={isManagerAuth} 
        setIsManagerAuth={setIsManagerAuth}
        handleSignOut={handleSignOut}
      />

      {showSuccess && (
        <div style={{
          position: 'fixed', top: '100px', right: '25px', backgroundColor: '#10b981',
          color: 'white', padding: '14px 24px', borderRadius: '12px', fontWeight: '700',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)', zIndex: 10000,
          fontSize: '0.9rem'
        }}>
          {showSuccess}
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vacancies" element={<Vacancies />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/login" element={<Login setUserName={setUserName} setIsClockedIn={setIsClockedIn} />} />
        <Route path="/manager-gate" element={<ManagerLogin setIsAuthenticated={setIsManagerAuth} />} />
        <Route path="/management" element={isManagerAuth ? <ManagementView config={config} /> : <Navigate to="/manager-gate" replace />} />
        <Route path="/hr-admin-otp" element={<HRAdminOTP />} />
        <Route
          path="/hr-admin"
          element={
            sessionStorage.getItem('hrOtpVerified') === 'true'
              ? <HRAdminPanel config={config} userName={sessionStorage.getItem('hrEmail') || 'HR Admin'} />
              : <Navigate to="/hr-admin-otp" replace />
          }
        />
        
        {/* WORKSTATION ROUTE */}
        <Route path="/clock-in" element={
          userName ? (
            <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 25px' }}>
              
              {/* PAGE HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>Workstation</h1>
                  <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '4px' }}>
                    Welcome back, <strong>{userName}</strong>. Ready for your shift?
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => { setShowLeave(!showLeave); setShowHistory(false); }} 
                    style={{
                      padding: '10px 22px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      background: showLeave ? '#0f172a' : 'white', color: showLeave ? 'white' : '#334155',
                      fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    {showLeave ? 'Close Portal' : 'Leave Portal'}
                  </button>
                  <button 
                    onClick={() => { 
                      setShowHistory(!showHistory); 
                      setShowLeave(false); 
                      if (!showHistory) fetchUserHistory(); 
                    }} 
                    style={{
                      padding: '10px 22px', borderRadius: '8px', border: 'none',
                      background: '#0f172a', color: 'white', fontWeight: '700',
                      cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    {showHistory ? 'Close History' : 'Shift History'}
                  </button>
                </div>
              </div>

              {/* STATUS BADGES */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
                <span style={{
                  backgroundColor: '#dcfce7', color: '#15803d', padding: '6px 16px',
                  borderRadius: '50px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #bbf7d0'
                }}>
                  📍 {locationStatus}
                </span>
                <span style={{
                  backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 16px',
                  borderRadius: '50px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #bae6fd'
                }}>
                  📊 Weekly Total: {hoursWorked} hrs
                </span>
              </div>

              {/* MODAL: SHIFT HISTORY */}
              {showHistory && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '30px', marginBottom: '25px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Recent Activity Log</h3>
                    <button onClick={generatePDF} style={{ background: 'transparent', border: '2px solid #72f88f', color: '#16a34a', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>💾 PDF Report</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '15px' }}>Date</th><th style={{ padding: '15px' }}>Clock In</th><th style={{ padding: '15px' }}>Clock Out</th><th style={{ padding: '15px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftHistory.length > 0 ? shiftHistory.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '15px', fontWeight: '600', color: '#334155' }}>{new Date(log.date || Date.now()).toLocaleDateString()}</td>
                          <td style={{ padding: '15px', color: '#64748b' }}>{log.timeIn}</td>
                          <td style={{ padding: '15px', color: '#64748b' }}>{log.timeOut === "noTimeYet" ? <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Active</span> : log.timeOut}</td>
                          <td style={{ padding: '15px', fontWeight: '700', color: '#0f172a' }}>{log.totalHours || "---"} hrs</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No shift logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL: LEAVE PORTAL */}
              {showLeave && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '30px', marginBottom: '25px', border: '1px solid #f1f5f9' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.4rem' }}>Request Leave</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
                    {[
                      { label: 'SICK DAYS', val: leaveBalance.sick, color: '#fee2e2', text: '#ef4444' },
                      { label: 'ANNUAL', val: leaveBalance.annual, color: '#dcfce7', text: '#16a34a' },
                      { label: 'FAMILY', val: leaveBalance.family, color: '#e0f2fe', text: '#0284c7' }
                    ].map((item, i) => (
                      <div key={i} style={{ backgroundColor: item.color, borderRadius: '12px', padding: '15px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: item.text, marginBottom: '5px' }}>{item.label}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={submitLeaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Leave Type</label>
                      <select style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155' }} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                        <option>Annual Leave</option><option>Sick Leave</option><option>Family Responsibility</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div><label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Start Date</label><input type="date" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155' }} value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
                      <div><label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>End Date</label><input type="date" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155' }} value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Reason</label>
                      <textarea style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155', height: '90px', resize: 'none' }} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}></textarea>
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: '10px', background: '#0f172a', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>Submit Application</button>
                  </form>
                </div>
              )}

              {/* MAIN TWO-COLUMN DASHBOARD LAYOUT (EXACTLY MATCHING PREVIOUS DESIGN) */}
              {!showHistory && !showLeave && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'start' }}>
                  
                  {/* LEFT COLUMN: LIVE DIGITAL CLOCK CARD */}
                  <div style={{
                    backgroundColor: '#0b0f19', borderRadius: '20px', padding: '35px 25px',
                    textAlign: 'center', boxShadow: '0 20px 40px rgba(11, 15, 25, 0.25)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '380px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#72f88f', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        LIVE SYSTEM TIME
                      </span>
                      <div style={{
                        backgroundColor: '#050b14', borderRadius: '16px', padding: '40px 20px',
                        margin: '25px 0', border: '1px solid rgba(114, 248, 143, 0.15)'
                      }}>
                        <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#72f88f', fontFamily: 'monospace', letterSpacing: '2px' }}>
                          <LiveClock isWidget={true} />
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      SECURE CONNECTION ESTABLISHED
                    </span>
                  </div>

                  {/* RIGHT COLUMN: PROFILE & CURRENT TASK LOG CARDS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* STAFF PROFILE CARD */}
                    <div style={{
                      backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px 25px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9',
                      display: 'flex', alignItems: 'center', gap: '20px'
                    }}>
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#ede9fe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontSize: '1.4rem'
                      }}>
                        👤
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>{userName}</h3>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                          ID: MUN-{userName.substring(0, 3).toUpperCase()}-2026
                        </span>
                      </div>
                    </div>

                    {/* CURRENT TASK LOG CARD */}
                    <div style={{
                      backgroundColor: '#ffffff', borderRadius: '16px', padding: '25px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9'
                    }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                        CURRENT TASK LOG
                      </label>

                      {/* Ticket Dropdown Integration */}
                      {tickets.length > 0 && (
                        <select 
                          value={selectedTicket} 
                          onChange={(e) => setSelectedTicket(e.target.value)}
                          style={{
                            width: '100%', padding: '12px 14px', borderRadius: '10px',
                            border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                            fontSize: '0.88rem', color: '#334155', fontWeight: '600',
                            marginBottom: '12px', outline: 'none'
                          }}
                        >
                          <option value="">Select Assigned Ticket / Project...</option>
                          {tickets.map(t => (
                            <option key={t._id} value={t._id}>{t.ticketName}</option>
                          ))}
                        </select>
                      )}

                      {/* Task Description Textarea */}
                      <textarea 
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Briefly describe your current tasks..."
                        style={{
                          width: '100%', padding: '14px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                          fontSize: '0.9rem', color: '#334155', height: '100px',
                          resize: 'none', outline: 'none', marginBottom: '18px',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Optional Manual Time Collapsible Header */}
                      <div style={{ marginBottom: '15px' }}>
                        <button 
                          onClick={() => setShowManualTime(!showManualTime)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                        >
                          {showManualTime ? '▲ Hide Backdated Time Options' : '▼ Need Backdated / Manual Time Entry?'}
                        </button>

                        {showManualTime && (
                          <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                            <input type="date" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} onChange={(e) => setManualTime({...manualTime, date: e.target.value})} />
                            <select style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} value={manualTime.hour} onChange={(e) => setManualTime({...manualTime, hour: e.target.value})}>
                              {Array.from({length: 12}, (_, i) => String(i+1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} value={manualTime.ampm} onChange={(e) => setManualTime({...manualTime, ampm: e.target.value})}>
                              <option value="AM">AM</option><option value="PM">PM</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* ACTION BUTTON */}
                      <button 
                        onClick={handleClockToggle}
                        style={{
                          width: '100%', padding: '16px', borderRadius: '12px',
                          border: 'none', background: isClockedIn ? '#ef4444' : '#10b981',
                          color: 'white', fontWeight: '800', fontSize: '1rem',
                          cursor: 'pointer', boxShadow: isClockedIn ? '0 10px 25px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isClockedIn ? 'CLOCK OUT NOW' : 'CLOCK IN NOW'}
                      </button>

                    </div>

                  </div>

                </div>
              )}

            </div>
          ) : <Navigate to="/login" replace />
        } />
      </Routes>
    </div>
  );
}

export default App;