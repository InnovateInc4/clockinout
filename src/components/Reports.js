import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = ({ config }) => {
  const [counts, setCounts] = useState({
    employees: 0,
    documents: 0,
    certificates: 0,
    auditLogs: 0,
    expiringCertificates: 0
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchCounts = async () => {
    try {
      const [emp, docs, certs, logs, exp] = await Promise.all([
        axios.get('/api/reports/employees', config),
        axios.get('/api/reports/documents', config),
        axios.get('/api/reports/certificates', config),
        axios.get('/api/reports/audit-logs', config),
        axios.get('/api/certificates/expiring-soon', config)
      ]);
      setCounts({
        employees: emp.data.length,
        documents: docs.data.length,
        certificates: certs.data.length,
        auditLogs: logs.data.length,
        expiringCertificates: exp.data.length
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching report counts:', err);
      showMessage('Could not load report data', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // ---------- CSV HELPER ----------
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsv = (filename, headers, rows) => {
    const headerLine = headers.map(escapeCsv).join(',');
    const bodyLines = rows.map(r => r.map(escapeCsv).join(','));
    const csv = [headerLine, ...bodyLines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage(`CSV downloaded: ${filename}`);
  };

  // ---------- PDF HELPER ----------
  const downloadPdf = (title, headers, rows) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Dark header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(114, 248, 143);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MUNICIPAL HR ADMIN', 14, 13);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(title, 14, 22);

    // Meta
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
    doc.text(`Total records: ${rows.length}`, 14, 43);

    autoTable(doc, {
      startY: 48,
      head: [headers],
      body: rows.length > 0 ? rows : [headers.map(() => '—')],
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [114, 248, 143],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    const fileSafe = title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    doc.save(`${fileSafe}_${new Date().toISOString().slice(0, 10)}.pdf`);
    showMessage(`PDF downloaded: ${title}`);
  };

  // ---------- LOADERS + REPORTS ----------
  const loadData = async (endpoint) => {
    const res = await axios.get(endpoint, config);
    return res.data;
  };

  // EMPLOYEES
  const exportEmployeesCsv = async () => {
    try {
      const data = await loadData('/api/reports/employees');
      downloadCsv(
        'employees_report.csv',
        ['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Created'],
        data.map(e => [e.id, e.userName, e.userEmail, e.role, e.department, e.status, e.created_at])
      );
    } catch { showMessage('Failed to generate CSV', 'error'); }
  };

  const exportEmployeesPdf = async () => {
    try {
      const data = await loadData('/api/reports/employees');
      downloadPdf(
        'Employees Report',
        ['ID', 'Name', 'Email', 'Role', 'Department', 'Status'],
        data.map(e => [e.id, e.userName, e.userEmail, e.role, e.department, e.status])
      );
    } catch { showMessage('Failed to generate PDF', 'error'); }
  };

  // DOCUMENTS
  const exportDocumentsCsv = async () => {
    try {
      const data = await loadData('/api/reports/documents');
      downloadCsv(
        'documents_report.csv',
        ['ID', 'Document', 'Type', 'Employee', 'Reference', 'Uploaded'],
        data.map(d => [d.id, d.document_name, d.document_type, d.employee_name, d.file_path, d.uploaded_at])
      );
    } catch { showMessage('Failed to generate CSV', 'error'); }
  };

  const exportDocumentsPdf = async () => {
    try {
      const data = await loadData('/api/reports/documents');
      downloadPdf(
        'Documents Report',
        ['ID', 'Document', 'Type', 'Employee', 'Reference'],
        data.map(d => [d.id, d.document_name, d.document_type, d.employee_name || '—', d.file_path || '—'])
      );
    } catch { showMessage('Failed to generate PDF', 'error'); }
  };

  // CERTIFICATES
  const certStatus = (days) => {
    if (days === null || days === undefined) return 'Unknown';
    if (days < 0) return 'Expired';
    if (days <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  const exportCertificatesCsv = async () => {
    try {
      const data = await loadData('/api/reports/certificates');
      downloadCsv(
        'certificates_report.csv',
        ['ID', 'Certificate', 'Employee', 'Issued', 'Expires', 'Days Remaining', 'Status'],
        data.map(c => [
          c.id, c.certificate_name, c.employee_name,
          c.issue_date, c.expiry_date, c.days_remaining, certStatus(c.days_remaining)
        ])
      );
    } catch { showMessage('Failed to generate CSV', 'error'); }
  };

  const exportCertificatesPdf = async () => {
    try {
      const data = await loadData('/api/reports/certificates');
      downloadPdf(
        'Certificates Report',
        ['ID', 'Certificate', 'Employee', 'Issued', 'Expires', 'Days Left', 'Status'],
        data.map(c => [
          c.id, c.certificate_name, c.employee_name || '—',
          c.issue_date || '—', c.expiry_date,
          c.days_remaining, certStatus(c.days_remaining)
        ])
      );
    } catch { showMessage('Failed to generate PDF', 'error'); }
  };

  // AUDIT LOGS
  const exportAuditCsv = async () => {
    try {
      const data = await loadData('/api/reports/audit-logs');
      downloadCsv(
        'audit_logs_report.csv',
        ['ID', 'Action', 'Performed By', 'Details', 'Timestamp'],
        data.map(l => [l.id, l.action, l.performed_by, l.details, l.created_at])
      );
    } catch { showMessage('Failed to generate CSV', 'error'); }
  };

  const exportAuditPdf = async () => {
    try {
      const data = await loadData('/api/reports/audit-logs');
      downloadPdf(
        'Audit Logs Report',
        ['ID', 'Action', 'Performed By', 'Details', 'Timestamp'],
        data.map(l => [
          l.id, l.action, l.performed_by || '—',
          (l.details || '').slice(0, 80), new Date(l.created_at).toLocaleString()
        ])
      );
    } catch { showMessage('Failed to generate PDF', 'error'); }
  };

  // ---------- STYLES ----------
  const card = {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px'
  };

  const reportCard = {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  };

  const btnCsv = {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#16a34a',
    color: 'white',
    fontWeight: '800',
    fontSize: '0.8rem',
    cursor: 'pointer'
  };

  const btnPdf = {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#dc2626',
    color: 'white',
    fontWeight: '800',
    fontSize: '0.8rem',
    cursor: 'pointer'
  };

  const reportMeta = [
    {
      id: 'employees',
      title: 'Employees Report',
      icon: '👥',
      description: 'Full list of all employees with roles, departments and statuses.',
      count: counts.employees,
      csvFn: exportEmployeesCsv,
      pdfFn: exportEmployeesPdf
    },
    {
      id: 'documents',
      title: 'Documents Report',
      icon: '📄',
      description: 'All registered employee documents with type and reference.',
      count: counts.documents,
      csvFn: exportDocumentsCsv,
      pdfFn: exportDocumentsPdf
    },
    {
      id: 'certificates',
      title: 'Certificates Report',
      icon: '🎓',
      description: 'Certificates with issue / expiry dates and 30-day warning status.',
      count: counts.certificates,
      csvFn: exportCertificatesCsv,
      pdfFn: exportCertificatesPdf
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs Report',
      icon: '📝',
      description: 'Complete history of HR admin actions with timestamps.',
      count: counts.auditLogs,
      csvFn: exportAuditCsv,
      pdfFn: exportAuditPdf
    }
  ];

  return (
    <div>

      {message && (
        <div style={{
          padding: '12px 18px',
          marginBottom: '18px',
          borderRadius: '10px',
          backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: message.type === 'error' ? '#b91c1c' : '#15803d',
          fontWeight: '700',
          fontSize: '0.85rem',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {message.text}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>
          Report Generation
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
          Generate and download HR reports in CSV or PDF format.
        </p>
      </div>

      {/* WARNING BANNER */}
      {counts.expiringCertificates > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div style={{ color: '#78350f', fontSize: '0.9rem' }}>
            <strong>{counts.expiringCertificates}</strong> certificate{counts.expiringCertificates === 1 ? '' : 's'} expiring soon — remember to include them in the Certificates Report.
          </div>
        </div>
      )}

      {/* REPORT CARDS */}
      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>
          Loading report data...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {reportMeta.map(report => (
            <div key={report.id} style={reportCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>{report.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>
                    {report.title}
                  </h3>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '700',
                    marginTop: '2px'
                  }}>
                    {report.count} record{report.count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <p style={{
                margin: 0,
                fontSize: '0.82rem',
                color: '#64748b',
                lineHeight: 1.5,
                minHeight: '44px'
              }}>
                {report.description}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button onClick={report.csvFn} style={btnCsv}>
                  📥 CSV
                </button>
                <button onClick={report.pdfFn} style={btnPdf}>
                  📄 PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;