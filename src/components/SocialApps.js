import React from 'react';

const SocialApps = () => {
  const socialLinks = [
    {
      platform: "Instagram",
      handle: "@MunicipalSystem_ZA",
      icon: "📸",
      color: "#E1306C",
      link: "https://instagram.com"
    },
    {
      platform: "WhatsApp / Contact",
      handle: "+27 12 345 6789",
      icon: "📞",
      color: "#25D366",
      link: "tel:+27123456789"
    },
    {
      platform: "Official Facebook",
      handle: "Municipal Systems Official",
      icon: "👥",
      color: "#1877F2",
      link: "https://facebook.com"
    }
  ];

  return (
    <div className="farm-container">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: '800', color: '#2c3e50', letterSpacing: '-1px' }}>Connect With Us</h1>
        <p style={{ color: '#666', fontSize: '1.1rem', fontWeight: '500' }}>Access our official social media channels and direct contact lines.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
        {socialLinks.map((social, idx) => (
          <div key={idx} className="farm-box" style={{ textAlign: 'center', transition: '0.3s' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '15px',
              background: '#f8f9fa',
              width: '80px',
              height: '80px',
              lineHeight: '80px',
              borderRadius: '50%',
              margin: '0 auto 20px'
            }}>
              {social.icon}
            </div>
            <h3 style={{ color: '#1a1a1a', marginBottom: '10px' }}>{social.platform}</h3>
            <p style={{ color: social.color, fontWeight: '700', fontSize: '1.2rem', marginBottom: '20px' }}>{social.handle}</p>
            <a 
              href={social.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="sign-out-btn-modern" 
              style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}
            >
              OPEN APP
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialApps;