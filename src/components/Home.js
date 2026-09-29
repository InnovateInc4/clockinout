import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
    const navigate = useNavigate();
    const [currentImage, setCurrentImage] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [suggestion, setSuggestion] = useState("");

    const images = [
        "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80"
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % images.length);
        }, 4000); 
        return () => clearInterval(timer);
    }, [images.length]);

    const submitSuggestion = () => {
        if (!suggestion.trim()) return alert("Please enter a message.");
        
        axios.post('/api/tickets/submit-suggestion', { message: suggestion })
            .then((res) => {
                if (res.data.success === 1 || res.status === 200) {
                    alert("Thank you for your feedback!");
                    setSuggestion(""); 
                } else {
                    alert("The server received the message but could not save it.");
                }
            })
            .catch(err => {
                console.error("Submission Error Details:", err);
                alert(`System Error: ${err.message}. Check if the backend server is running.`);
            });
    };

    return (
        <div style={{ 
            backgroundColor: darkMode ? '#0f172a' : '#f8fafc', 
            color: darkMode ? '#f8fafc' : '#0f172a',
            transition: '0.3s', 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: '"Inter", system-ui, sans-serif'
        }}>
            
            {/* 1. LAYERED HERO SECTION */}
            <div style={{ position: 'relative', height: '85vh', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: '70%', height: '100%',
                    backgroundImage: `url('${images[currentImage]}')`,
                    backgroundSize: 'cover', backgroundPosition: 'center', transition: '1s ease-in-out',
                }} />

                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '55%', height: '100%',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', zIndex: 2
                }}>
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
                        marginBottom: '20px',
                        width: 'fit-content',
                        textTransform: 'uppercase'
                    }}>
                        Municipal Digital Systems
                    </span>

                    <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: 'white', lineHeight: '1.1', marginBottom: '24px', maxWidth: '500px', letterSpacing: '-0.02em' }}>
                        Enabling Staff to Deliver Better Public Service
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '450px', lineHeight: '1.6', marginBottom: '36px' }}>
                        Connecting local government through integrated time-tracking, accountability, and real-time departmental coordination.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button 
                            onClick={() => navigate('/clock-in')} 
                            style={{ 
                                padding: '16px 32px', 
                                fontSize: '0.9rem',
                                fontWeight: '800',
                                backgroundColor: '#ea580c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            GO TO WORKSTATION
                        </button>
                        
                    </div>
                </div>

                <div style={{ 
                    position: 'absolute', 
                    bottom: '40px', 
                    right: '40px', 
                    background: 'rgba(15, 23, 42, 0.75)', 
                    backdropFilter: 'blur(12px)', 
                    padding: '16px 24px', 
                    borderRadius: '14px', 
                    color: 'white', 
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ea580c', letterSpacing: '1px' }}>SYSTEM STATUS</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', marginTop: '2px' }}>Active & Operational ✅</div>
                </div>
            </div>

            {/* 2. STRATEGIC PRIORITIES SECTION */}
            <div className="farm-container" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginTop: '40px', maxWidth: '1200px', margin: '40px auto 0 auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
                <div className="farm-box" style={{ 
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                    color: darkMode ? '#f8fafc' : '#0f172a',
                    borderRadius: '20px', 
                    padding: '40px',
                    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.03)'
                }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '20px', borderBottom: '4px solid #ea580c', display: 'inline-block', paddingBottom: '8px' }}>
                        Our Strategic Priorities
                    </h2>
                    <p style={{ color: darkMode ? '#94a3b8' : '#475569', fontSize: '1.05rem', lineHeight: '1.8', marginBottom: '24px' }}>
                        The municipality is prioritizing high-impact service delivery and infrastructure resilience to better serve our community.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '24px', paddingLeft: '32px', position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, top: '-2px', color: '#ea580c', fontWeight: '900', fontSize: '1.5rem' }}>•</span>
                            <strong style={{ fontSize: '1.15rem', color: darkMode ? '#f8fafc' : '#0f172a' }}>Infrastructure Reinforcement</strong>
                            <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginTop: '6px', fontSize: '0.95rem' }}>Major ongoing upgrades in Sector 4 and 9 to ensure water and power stability.</p>
                        </li>
                        <li style={{ paddingLeft: '32px', position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, top: '-2px', color: '#ea580c', fontWeight: '900', fontSize: '1.5rem' }}>•</span>
                            <strong style={{ fontSize: '1.15rem', color: darkMode ? '#f8fafc' : '#0f172a' }}>Smart Waste Management</strong>
                            <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginTop: '6px', fontSize: '0.95rem' }}>Implementing new sanitation routes and real-time collection tracking.</p>
                        </li>
                    </ul>
                </div>

                {/* NEWS SIDEBAR */}
                <aside style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ 
                        backgroundColor: '#ea580c', 
                        padding: '18px 24px', 
                        borderRadius: '16px 16px 0 0', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        color: 'white'
                    }}>
                        <span style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Latest News</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.9, letterSpacing: '1px' }}>UPDATED: JUST NOW</span>
                    </div>
                    <div className="farm-box" style={{ 
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        color: darkMode ? '#f8fafc' : '#0f172a',
                        borderRadius: '0 0 16px 16px', 
                        padding: '20px',
                        border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        borderTop: 'none',
                        flex: 1,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.03)'
                    }}>
                        {[
                            { date: 'January 15, 2026', title: 'New Safety Protocols for Field Workers', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=150&q=80' },
                            { date: 'January 12, 2026', title: 'Q1 Financial Review Meeting Highlights', img: 'https://images.unsplash.com/photo-1454165833762-0265129b0021?auto=format&fit=crop&w=150&q=80' },
                            { date: 'January 10, 2026', title: 'Smart City Infrastructure Report', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80' }
                        ].map((news, i) => (
                            <div key={i} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: i < 2 ? (darkMode ? '1px solid #334155' : '1px solid #f1f5f9') : 'none', alignItems: 'center' }}>
                                <img src={news.img} alt="news" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }} />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: '800', marginBottom: '2px' }}>{news.date}</div>
                                    <div style={{ fontWeight: '700', color: darkMode ? '#f8fafc' : '#0f172a', fontSize: '0.88rem', lineHeight: '1.3' }}>{news.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            {/* 3. SHIFT MANAGEMENT QUICK-LINK */}
            <div className="farm-container" style={{ maxWidth: '1200px', margin: '30px auto 0 auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
                <div className="farm-box" style={{ 
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    color: darkMode ? '#f8fafc' : '#0f172a',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '36px 40px', 
                    borderRadius: '20px',
                    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.03)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 8px 0' }}>Shift Management</h2>
                        <p style={{ color: darkMode ? '#94a3b8' : '#64748b', margin: 0, fontSize: '1rem' }}>Ready for your next task? Access the official clock-in sheet here.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/clock-in')} 
                        style={{ 
                            padding: '16px 40px',
                            backgroundColor: '#ea580c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        START SHIFT
                    </button>
                </div>
            </div>

            {/* 4. INTERNAL FEEDBACK BOX */}
            <div className="farm-container" style={{ maxWidth: '1200px', margin: '30px auto 0 auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
                <div className="farm-box" style={{ background: '#0f172a', color: '#fff', borderRadius: '20px', padding: '36px 40px', border: '1px solid #1e293b', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#ea580c', fontSize: '0.85rem', fontWeight: '900', letterSpacing: '1.5px', margin: '0 0 12px 0', textTransform: 'uppercase' }}>INTERNAL SUGGESTION BOX</h3>
                    <textarea 
                        placeholder="Feedback on service delivery improvements..." 
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        style={{ 
                            width: '100%',
                            height: '90px', 
                            marginTop: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    ></textarea>
                    <button 
                        onClick={submitSuggestion} 
                        style={{ 
                            marginTop: '16px',
                            backgroundColor: '#ea580c',
                            color: 'white',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        SUBMIT FEEDBACK
                    </button>
                </div>
            </div>

            {/* 5. PROFESSIONAL FOOTER SECTION */}
            <footer style={{ 
                backgroundColor: darkMode ? '#020617' : '#0f172a', 
                color: '#94a3b8', 
                padding: '60px 0 30px 0', 
                marginTop: '60px',
                borderTop: '4px solid #ea580c',
                transition: '0.3s'
            }}>
                <div className="farm-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', boxSizing: 'border-box' }}>
                    
                    {/* About Column */}
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: '800', marginBottom: '20px', fontSize: '0.95rem', letterSpacing: '1px' }}>ABOUT MUNICIPAL SYSTEMS</h4>
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.7', color: '#94a3b8' }}>
                            Our digital platform serves as the central hub for municipal operations, ensuring transparency, 
                            accountability, and streamlined service delivery for all citizens. 
                            We are committed to excellence in local governance.
                        </p>
                    </div>

                    {/* Contact Column */}
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: '800', marginBottom: '20px', fontSize: '0.95rem', letterSpacing: '1px' }}>CONTACT US</h4>
                        <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#94a3b8' }}>📍 123 Governance Plaza, Central Sector</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#94a3b8' }}>📞 +27 (0) 21 555 0100 (General Enquiries)</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#94a3b8' }}>📞 +27 (0) 21 555 0199 (HR Hotline)</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#94a3b8' }}>📧 service@municipality.gov.za</p>
                    </div>

                    {/* Availability Column */}
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: '800', marginBottom: '20px', fontSize: '0.95rem', letterSpacing: '1px' }}>OPERATING HOURS</h4>
                        <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#94a3b8' }}>Monday - Friday: 07:30 - 16:30</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#94a3b8' }}>Saturday: 08:00 - 13:00</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#94a3b8' }}>Sunday: Emergency Services Only</p>
                        <p style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 'bold', marginTop: '15px' }}>System Status: Operational ✅</p>
                    </div>

                    {/* Social Links Column */}
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: '800', marginBottom: '20px', fontSize: '0.95rem', letterSpacing: '1px' }}>CONNECT WITH US</h4>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                           {[
                            { name: 'FB', img: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg' },
                            { name: 'X', img: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg' },
                            { name: 'YT', img: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg' },
                            { name: 'IG', img: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' }
                           ].map((social, i) => (
                             <div key={i} style={{ width: '36px', height: '36px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                               <img src={social.img} alt={social.name} style={{ width: '18px', height: '18px', filter: 'brightness(1.2)' }} />
                             </div>
                           ))}
                        </div>
                        <button style={{ 
                            width: '100%', 
                            padding: '12px', 
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            backgroundColor: 'transparent',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}>
                            CITIZEN PORTAL
                        </button>
                    </div>
                </div>

                {/* 6. ORIGINAL ADMIN GATE & COPYRIGHT */}
                <div style={{ maxWidth: '1200px', margin: '40px auto 0 auto', padding: '0 20px', borderTop: '1px solid #1e293b', paddingTop: '30px', textAlign: 'center', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <Link 
                            to="/manager-gate" 
                            style={{ 
                                fontSize: '0.75rem', 
                                color: '#64748b', 
                                textDecoration: 'none', 
                                fontWeight: '700',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ea580c'}
                            onMouseLeave={(e) => e.target.style.color = '#64748b'}
                        >
                            SYSTEM ADMINISTRATION & AUDIT ACCESS
                        </Link>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#475569', letterSpacing: '1px' }}>
                        © 2026 MUNICIPAL DIGITAL SYSTEMS. SOUTH AFRICA. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </footer>

            {/* Dark Mode Toggle */}
            <button 
                onClick={() => setDarkMode(!darkMode)}
                style={{ 
                    position: 'fixed', 
                    bottom: '24px', 
                    right: '24px', 
                    zIndex: 1001, 
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%', 
                    border: 'none', 
                    background: '#0f172a', 
                    color: 'white', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                }}
            >
                {darkMode ? '☀️' : '🌙'}
            </button>
        </div>
    );
};

export default Home;