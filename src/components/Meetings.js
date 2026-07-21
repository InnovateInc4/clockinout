import React, { useState } from 'react';

const MEETINGS_DATA = [
  {
    id: 'MTG-2026-104',
    title: 'ExCo Strategic Alignment Briefing',
    department: 'Office of the Premier',
    date: 'Today',
    time: '10:00 AM - 11:30 AM',
    location: 'Council Chamber 1, Kimberley HQ',
    isVirtual: false,
    chairperson: 'Premier & Chief Director',
    status: 'Upcoming',
    agenda: [
      'Review of Q2 Municipal Delivery Benchmarks',
      'Geofenced Attendance Metric Verification',
      'Sign-off on Regional Water Infrastructure Allocation'
    ]
  },
  {
    id: 'MTG-2026-108',
    title: 'ICT System Steering Committee',
    department: 'Provincial ICT Services',
    date: 'Today',
    time: '02:30 PM - 03:30 PM',
    location: 'Microsoft Teams (Virtual)',
    isVirtual: true,
    chairperson: 'Head of Digital Transformation',
    status: 'Upcoming',
    agenda: [
      'Workforce Attendance System Security Review',
      'React Dashboard UI Standardization',
      'Server Migration Schedule'
    ]
  },
  {
    id: 'MTG-2026-112',
    title: 'District Governance & Policy Forum',
    department: 'Governance & Policy',
    date: 'Tomorrow',
    time: '09:00 AM - 12:00 PM',
    location: 'Conference Wing B, Kimberley',
    isVirtual: false,
    chairperson: 'Director of Policy',
    status: 'Upcoming',
    agenda: [
      'Intergovernmental Alignment Protocols',
      'District Municipal Budget Audits',
      'Public Consultation Schedule'
    ]
  },
  {
    id: 'MTG-2026-099',
    title: 'Provincial Fleet & Facilities Audit',
    department: 'Facilities Management',
    date: 'Yesterday',
    time: '11:00 AM - 12:00 PM',
    location: 'Room 3A',
    isVirtual: false,
    chairperson: 'General Manager Facilities',
    status: 'Completed',
    agenda: [
      'Quarterly Vehicle Requisition Review',
      'Facility Safety Protocol Approvals'
    ]
  }
];

const Meetings = () => {
  const [filter, setFilter] = useState('All');
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const filteredMeetings = MEETINGS_DATA.filter(mtg => {
    if (filter === 'Today') return mtg.date === 'Today';
    if (filter === 'Upcoming') return mtg.status === 'Upcoming';
    if (filter === 'Virtual') return mtg.isVirtual;
    return true;
  });

  return (
    <div style={{ 
      backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh', 
      padding: '40px 20px', 
      fontFamily: '"Inter", system-ui, sans-serif' 
    }}>
      
      {/* Light Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,237,213,0.7) 100%)',
        zIndex: 0
      }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: '36px', textAlign: 'center' }}>
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
            textTransform: 'uppercase',
            boxShadow: '0 2px 10px rgba(234, 88, 12, 0.1)'
          }}>
            Executive Management
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Executive Meetings & Forums
          </h1>
          <p style={{ color: '#475569', fontSize: '1.05rem', margin: 0 }}>
            Schedule, agendas, and virtual access for official Northern Cape Premier's Office sessions.
          </p>
        </header>

        {/* FILTER BAR */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '8px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          {['All', 'Today', 'Upcoming', 'Virtual'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                backgroundColor: filter === tab ? '#ea580c' : 'transparent',
                color: filter === tab ? '#ffffff' : '#475569',
                border: 'none',
                fontWeight: filter === tab ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: filter === tab ? '0 4px 12px rgba(234, 88, 12, 0.2)' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* MEETINGS LIST */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredMeetings.map((mtg) => (
            <article 
              key={mtg.id}
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px', 
                padding: '28px',
                border: '1px solid rgba(255, 255, 255, 1)',
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                alignItems: 'center',
                gap: '24px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(234, 88, 12, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Date & Time Column */}
              <div style={{ textAlign: 'center', paddingRight: '20px', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ 
                  display: 'block', 
                  color: mtg.date === 'Today' ? '#ea580c' : '#64748b', 
                  fontSize: '0.8rem', 
                  fontWeight: '900', 
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {mtg.date}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', display: 'block', marginTop: '4px' }}>
                  {mtg.time.split(' - ')[0]}
                </span>
              </div>

              {/* Info Column */}
              <div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    backgroundColor: mtg.isVirtual ? '#eff6ff' : '#fff7ed', 
                    color: mtg.isVirtual ? '#2563eb' : '#ea580c', 
                    border: mtg.isVirtual ? '1px solid #bfdbfe' : '1px solid #ffedd5',
                    padding: '3px 10px', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: '800' 
                  }}>
                    {mtg.isVirtual ? '💻 Teams' : '🏛️ In-Person'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{mtg.department}</span>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  {mtg.title}
                </h3>

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                  📍 <strong>Location:</strong> {mtg.location}
                </p>
              </div>

              {/* Action Column */}
              <div>
                <button 
                  onClick={() => setSelectedMeeting(mtg)}
                  style={{
                    padding: '12px 22px', 
                    borderRadius: '10px', 
                    backgroundColor: mtg.isVirtual ? '#2563eb' : '#ea580c',
                    color: '#ffffff', 
                    border: 'none', 
                    fontWeight: '800', 
                    cursor: 'pointer',
                    whiteSpace: 'nowrap', 
                    fontSize: '0.85rem',
                    boxShadow: mtg.isVirtual ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 4px 12px rgba(234, 88, 12, 0.25)'
                  }}
                >
                  {mtg.isVirtual ? 'Join Teams →' : 'View Agenda →'}
                </button>
              </div>
            </article>
          ))}
        </main>

        {/* MODAL / AGENDA DRAWER */}
        {selectedMeeting && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' 
          }}>
            <div style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '24px', 
              borderTop: selectedMeeting.isVirtual ? '8px solid #2563eb' : '8px solid #ea580c',
              maxWidth: '600px', 
              width: '100%', 
              padding: '36px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: selectedMeeting.isVirtual ? '#2563eb' : '#ea580c' }}>
                    {selectedMeeting.id} • {selectedMeeting.department}
                  </span>
                  <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: '900' }}>
                    {selectedMeeting.title}
                  </h2>
                </div>
                <button onClick={() => setSelectedMeeting(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 8px 0', color: '#334155' }}><strong>Time:</strong> {selectedMeeting.date} ({selectedMeeting.time})</p>
                <p style={{ margin: '0 0 8px 0', color: '#334155' }}><strong>Venue:</strong> {selectedMeeting.location}</p>
                <p style={{ margin: 0, color: '#334155' }}><strong>Chairperson:</strong> {selectedMeeting.chairperson}</p>
              </div>

              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' }}>Session Agenda</h3>
              <ol style={{ paddingLeft: '20px', margin: '0 0 28px 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.7' }}>
                {selectedMeeting.agenda.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ol>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => alert(selectedMeeting.isVirtual ? "Opening Microsoft Teams..." : "Confirming attendance...")} 
                  style={{ 
                    flex: 1, 
                    padding: '14px', 
                    borderRadius: '10px', 
                    backgroundColor: selectedMeeting.isVirtual ? '#2563eb' : '#ea580c', 
                    color: '#ffffff', 
                    border: 'none', 
                    fontWeight: '800', 
                    cursor: 'pointer' 
                  }}
                >
                  {selectedMeeting.isVirtual ? 'Launch Virtual Room' : 'Confirm Attendance'}
                </button>
                <button onClick={() => setSelectedMeeting(null)} style={{ padding: '14px 20px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Meetings;