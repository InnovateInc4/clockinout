import React, { useState } from 'react';

const NOTICES_DATA = [
  {
    id: 'MEMO-2026-089',
    date: 'July 20, 2026',
    category: 'IT Operations',
    title: 'Scheduled System Maintenance: Attendance Portal',
    content: 'The geofenced clock-in system will undergo mandatory database optimization this Saturday from 02:00 AM to 04:00 AM. Access via mobile and desktop will be temporarily suspended.',
    priority: 'High',
    author: 'Provincial ICT Services'
  },
  {
    id: 'MEMO-2026-088',
    date: 'July 18, 2026',
    category: 'HR & Payroll',
    title: 'Mid-Year Performance Review Submissions',
    content: 'All departmental heads are reminded that mid-year performance appraisals (Level 1-12) must be submitted to the centralized HR portal by the end of the current working week.',
    priority: 'Normal',
    author: 'Human Resources Directorate'
  },
  {
    id: 'MEMO-2026-085',
    date: 'July 15, 2026',
    category: 'Policy Update',
    title: 'Revised Standard Operating Procedures for Vehicle Fleet',
    content: 'Please be advised of the newly gazetted updates regarding the requisition and usage of provincial government fleet vehicles. The updated SOP document is available in the document library.',
    priority: 'Normal',
    author: 'Governance & Policy'
  },
  {
    id: 'MEMO-2026-082',
    date: 'July 10, 2026',
    category: 'General',
    title: 'Mandatory Fire Drill - Kimberley HQ',
    content: 'A mandatory evacuation drill will be conducted next week for all staff stationed at the Kimberley headquarters. Please review the evacuation routes posted in your respective wings.',
    priority: 'High',
    author: 'Facilities Management'
  }
];

const Notices = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredNotices = NOTICES_DATA.filter(notice => 
    activeCategory === 'All' || notice.category === activeCategory
  );

  const categories = ['All', 'HR & Payroll', 'IT Operations', 'Policy Update', 'General'];

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
      
      {/* Light Gradient Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,237,213,0.7) 100%)',
        zIndex: 0
      }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
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
            Official Communications
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Notices & Memos
          </h1>
          <p style={{ color: '#475569', fontSize: '1.05rem', margin: 0 }}>
            Internal announcements, policy updates, and operational directives for the Premier's Office.
          </p>
        </header>

        {/* FILTER BAR - Glassmorphism */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '8px',
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          overflowX: 'auto'
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                backgroundColor: activeCategory === cat ? '#ea580c' : 'transparent',
                color: activeCategory === cat ? '#ffffff' : '#475569',
                border: 'none',
                fontWeight: activeCategory === cat ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: activeCategory === cat ? '0 4px 12px rgba(234, 88, 12, 0.2)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* NOTICES FEED */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredNotices.map((notice) => (
            <article 
              key={notice.id}
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px', 
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 1)',
                borderLeft: notice.priority === 'High' ? '6px solid #ea580c' : '1px solid rgba(255, 255, 255, 1)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Optional: Subtle background indicator for High Priority */}
              {notice.priority === 'High' && (
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 16px', backgroundColor: '#fff7ed', color: '#ea580c', fontSize: '0.7rem', fontWeight: '800', borderBottomLeftRadius: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Action Required
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{notice.date}</span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: '#ea580c', fontSize: '0.85rem', fontWeight: '800' }}>{notice.category}</span>
                </div>
              </div>

              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                {notice.title}
              </h2>
              
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                {notice.content}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                  Issued by: <strong style={{ color: '#0f172a' }}>{notice.author}</strong>
                </div>
                <button style={{
                  background: 'none',
                  border: 'none',
                  color: '#ea580c',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  padding: '8px 0',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  Read Full Memo →
                </button>
              </div>
            </article>
          ))}
        </main>

      </div>
    </div>
  );
};

export default Notices;