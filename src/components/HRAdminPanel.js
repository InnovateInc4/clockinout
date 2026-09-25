import React, { useState } from 'react';
import EmployeeManagement from './EmployeeManagement';
import DocumentsManager from './DocumentsManager';
import CertificateTracker from './CertificateTracker';
import AuditLogs from './AuditLogs';
import Reports from './Reports';

const HRAdminPanel = ({ config, userName = 'HR Admin' }) => {
  const [activeTab, setActiveTab] = useState('employees');

  const tabs = [
    { id: 'employees',    label: '👥 Employees' },
    { id: 'documents',    label: '📄 Documents' },
    { id: 'certificates', label: '🎓 Certificates' },
    { id: 'audit',        label: '📝 Audit Logs' },
    { id: 'reports',      label: '📊 Reports' },
  ];

  const placeholder = (title) => (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '2px dashed #cbd5e1',
      color: '#64748b'
    }}>
      <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        This section will be built in a later step.
      </p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      fontFamily: '"Inter", system-ui, sans-serif'
    }}>
      {/* HEADER */}
      <div style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '28px 40px',
        borderBottom: '4px solid #72f88f'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: 'rgba(114, 248, 143, 0.15)',
            color: '#72f88f',
            padding: '5px 14px',
            borderRadius: '50px',
            fontSize: '0.7rem',
            fontWeight: '800',
            letterSpacing: '1.5px',
            marginBottom: '10px'
          }}>
            HR ADMINISTRATION
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900' }}>
            HR Admin Panel
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            Signed in as <strong style={{ color: '#72f88f' }}>{userName}</strong>
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 40px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 22px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #0f172a' : '3px solid transparent',
                color: activeTab === tab.id ? '#0f172a' : '#64748b',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
        {activeTab === 'employees'    && <EmployeeManagement config={config} />}
        {activeTab === 'documents'    && <DocumentsManager config={config} />}
        {activeTab === 'certificates' && <CertificateTracker config={config} />}
        {activeTab === 'audit'        && <AuditLogs config={config} />}
        {activeTab === 'reports'      && <Reports config={config} />}
      </div>
    </div>
  );
};

export default HRAdminPanel;