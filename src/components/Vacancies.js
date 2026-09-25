import React, { useState } from 'react';

const PREMIER_VACANCIES_DATA = [
  {
    id: 'NCPG-2026-01',
    title: 'Chief Director: Provincial Strategic Planning',
    department: 'Office of the Premier',
    location: 'Kimberley, Northern Cape',
    type: 'Permanent (SMS Level 14)',
    closingDate: 'August 15, 2026',
    salary: 'R 1,371,558 p.a. (All-inclusive package)',
    description: 'Lead the alignment of provincial strategic plans with the National Development Plan (NDP) and monitor spatial transformation across the Northern Cape.',
    requirements: ['NQF Level 8 in Public Administration or Strategic Management', '5+ years experience at Senior Management level', 'Valid driver\'s license and Nyukela SMS certification']
  },
  {
    id: 'NCPG-2026-04',
    title: 'Senior Software Engineer (Workforce Systems)',
    department: 'Provincial ICT Services',
    location: 'Kimberley, Northern Cape',
    type: 'Permanent',
    closingDate: 'August 22, 2026',
    salary: 'R 840,000 - R 980,000 p.a.',
    description: 'Lead the technical development of the Premier\'s Office geofenced workforce attendance management system and modernize municipal clock-in interfaces.',
    requirements: ['B.Sc in Computer Science or Software Engineering', 'Expertise in React, custom CSS, and structural diagrams', 'Experience building geo-spatial or attendance applications']
  },
  {
    id: 'NCPG-2026-07',
    title: 'Intergovernmental Relations Officer',
    department: 'Governance & Policy',
    location: 'Kimberley, Northern Cape',
    type: 'Contract (36 Months)',
    closingDate: 'August 30, 2026',
    salary: 'R 550,000 - R 650,000 p.a.',
    description: 'Facilitate communication and policy alignment between the Premier’s Office, district municipalities, and traditional leadership councils.',
    requirements: ['Degree in Political Science or Public Policy', 'Fluency in multiple regional languages (e.g., English, Afrikaans, Setswana)', '3+ years experience in public sector relations']
  }
];

const Vacancies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [activeJob, setActiveJob] = useState(null);

  const filteredJobs = PREMIER_VACANCIES_DATA.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || job.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    // Core Container with Business Photo Background and fixed attachment
    <div style={{ 
      backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh', 
      padding: '40px 20px', 
      fontFamily: '"Inter", system-ui, sans-serif' 
    }}>
      
      {/* Light Orange/White Gradient Overlay to ensure minimum brightness */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,237,213,0.7) 100%)',
        zIndex: 0
      }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER SECTION - Glassmorphism */}
        <header style={{ 
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px', 
          padding: '40px', 
          marginBottom: '32px', 
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px 0 rgba(234, 88, 12, 0.1)'
        }}>
          {/* Executive Orange Tag */}
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
            marginBottom: '18px',
            textTransform: 'uppercase',
            boxShadow: '0 2px 10px rgba(234, 88, 12, 0.1)'
          }}>
            Northern Cape Provincial Government
          </span>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Office of the Premier Vacancies
          </h1>
          <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: '700px', margin: 0, lineHeight: '1.6' }}>
            Serve the people of the Northern Cape. Discover high-impact roles driving spatial transformation, digital governance, and provincial development from our Kimberley headquarters.
          </p>

          {/* SEARCH & FILTERS - Frosted Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '32px' }}>
            <input 
              type="text"
              placeholder="🔍 Search position or ref code (e.g. Director, NCPG-2026)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: '14px 18px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255, 255, 255, 0.9)', 
                backgroundColor: 'rgba(255, 255, 255, 0.5)', 
                color: '#0f172a', 
                fontSize: '0.95rem', 
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#ea580c'; e.target.style.backgroundColor = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.9)'; e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; }}
            />
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ 
                padding: '14px 18px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255, 255, 255, 0.9)', 
                backgroundColor: 'rgba(255, 255, 255, 0.5)', 
                color: '#0f172a', 
                fontSize: '0.95rem', 
                outline: 'none', 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
              onFocus={(e) => { e.target.style.backgroundColor = '#ffffff'; }}
              onBlur={(e) => { e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; }}
            >
              <option value="All">All Departments</option>
              <option value="Office of the Premier">Office of the Premier</option>
              <option value="Provincial ICT Services">Provincial ICT Services</option>
              <option value="Governance & Policy">Governance & Policy</option>
            </select>
          </div>
        </header>

        {/* JOB LISTINGS */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredJobs.map((job) => (
            <article 
              key={job.id}
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px', 
                padding: '28px',
                border: '1px solid rgba(255, 255, 255, 1)',
                display: 'flex', 
                justify: 'space-between', 
                alignItems: 'center', 
                gap: '20px',
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
              <div style={{ flex: 1 }}>
                {/* Clean, Corporate Badges */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ 
                    backgroundColor: '#ea580c', 
                    color: '#ffffff', 
                    padding: '4px 12px', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: '800',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
                  }}>
                    {job.id}
                  </span>
                  <span style={{ 
                    backgroundColor: '#f1f5f9', 
                    color: '#334155', 
                    border: '1px solid #e2e8f0', 
                    padding: '4px 12px', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: '700' 
                  }}>
                    {job.type}
                  </span>
                </div>

                <h2 style={{ margin: '0 0 12px 0', fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                  {job.title}
                </h2>

                <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <span>🏛️ <strong style={{ color: '#334155', fontWeight: '600' }}>{job.department}</strong></span>
                  <span>📍 <strong style={{ color: '#334155', fontWeight: '600' }}>{job.location}</strong></span>
                  <span>⏳ Closes: <strong style={{ color: '#334155', fontWeight: '600' }}>{job.closingDate}</strong></span>
                </div>
              </div>

              {/* High-Visibility Primary Button */}
              <button 
                onClick={() => setActiveJob(job)}
                style={{
                  padding: '14px 26px', 
                  borderRadius: '10px', 
                  backgroundColor: '#ea580c',
                  color: '#ffffff', 
                  border: 'none', 
                  fontWeight: '800', 
                  cursor: 'pointer',
                  whiteSpace: 'nowrap', 
                  fontSize: '0.9rem',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2410c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
              >
                View Details →
              </button>
            </article>
          ))}
        </main>

        {/* MODAL - Solid white base for strict reading focus */}
        {activeJob && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' 
          }}>
            <div style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '24px', 
              borderTop: '8px solid #ea580c',
              maxWidth: '650px', 
              width: '100%', 
              padding: '36px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'scaleUp 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ea580c' }}>{activeJob.id} • {activeJob.department}</span>
                  <h2 style={{ margin: '6px 0 0 0', color: '#0f172a', fontSize: '1.6rem', fontWeight: '900' }}>{activeJob.title}</h2>
                </div>
                <button onClick={() => setActiveJob(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#fff7ed', borderRadius: '12px', padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px', fontSize: '0.9rem', color: '#64748b', border: '1px solid #ffedd5' }}>
                <div><strong style={{ color: '#1e293b' }}>Salary:</strong> <span style={{ color: '#ea580c', fontWeight: '600' }}>{activeJob.salary}</span></div>
                <div><strong style={{ color: '#1e293b' }}>Location:</strong> {activeJob.location}</div>
                <div><strong style={{ color: '#1e293b' }}>Type:</strong> {activeJob.type}</div>
                <div><strong style={{ color: '#1e293b' }}>Closing Date:</strong> {activeJob.closingDate}</div>
              </div>

              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.05rem' }}>Role Summary</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', marginTop: 0 }}>{activeJob.description}</p>

              <h3 style={{ margin: '24px 0 10px 0', color: '#0f172a', fontSize: '1.05rem' }}>Requirements</h3>
              <ul style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
                {activeJob.requirements.map((req, index) => <li key={index} style={{ marginBottom: '6px' }}>{req}</li>)}
              </ul>

              <div style={{ display: 'flex', gap: '14px', marginTop: '32px' }}>
                <button onClick={() => alert("Redirecting to Northern Cape E-Recruitment...")} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)' }}>Apply Online via E-Recruitment</button>
                <button onClick={() => setActiveJob(null)} style={{ padding: '14px 24px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Vacancies;