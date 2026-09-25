import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DocumentsManager = ({ config }) => {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');

  const emptyForm = {
    employee_id: '',
    document_name: '',
    document_type: 'General',
    file_path: ''
  };

  const [form, setForm] = useState(emptyForm);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchDocuments = () => {
    setLoading(true);
    axios.get('/api/documents/all', config)
      .then(res => {
        setDocuments(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching documents:', err);
        showMessage('Could not load documents', 'error');
        setLoading(false);
      });
  };

  const fetchEmployees = () => {
    axios.get('/api/users/all-employees', config)
      .then(res => setEmployees(res.data))
      .catch(err => console.error('Error fetching employees:', err));
  };

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowAddForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.employee_id || !form.document_name) {
      showMessage('Please select an employee and give the document a name', 'error');
      return;
    }

    axios.post('/api/documents/add', form, config)
      .then(() => {
        showMessage('Document added successfully');
        resetForm();
        fetchDocuments();
      })
      .catch(err => {
        console.error(err);
        showMessage(err.response?.data?.error || 'Error adding document', 'error');
      });
  };

  const deleteDocument = (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    axios.delete(`/api/documents/delete/${id}`, config)
      .then(() => {
        showMessage('Document deleted');
        fetchDocuments();
      })
      .catch(err => {
        console.error(err);
        showMessage('Error deleting document', 'error');
      });
  };

  const filtered = filterEmployee
    ? documents.filter(d => String(d.employee_id) === String(filterEmployee))
    : documents;

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
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

  const label = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '6px'
  };

  const input = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.9rem',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const btnPrimary = {
    padding: '12px 22px',
    borderRadius: '8px',
    border: 'none',
    background: '#0f172a',
    color: 'white',
    fontWeight: '800',
    fontSize: '0.85rem',
    cursor: 'pointer'
  };

  const btnGhost = {
    padding: '12px 22px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontWeight: '800',
    fontSize: '0.85rem',
    cursor: 'pointer'
  };

  const btnSmall = {
    padding: '7px 12px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '700',
    fontSize: '0.75rem',
    cursor: 'pointer'
  };

  return (
    <div>

      {/* MESSAGE */}
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

      {/* HEADER ROW */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>
            Document Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {filtered.length} document{filtered.length === 1 ? '' : 's'} recorded
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}
          style={btnPrimary}
        >
          {showAddForm ? '✕ Close' : '+ Add Document'}
        </button>
      </div>

      {/* ADD FORM */}
      {showAddForm && (
        <div style={card}>
          <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '1.1rem' }}>
            + Register New Document
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={label}>Employee</label>
                <select
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  style={input}
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.userName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Document Name</label>
                <input
                  name="document_name"
                  value={form.document_name}
                  onChange={handleChange}
                  style={input}
                  placeholder="e.g. Employment Contract"
                  required
                />
              </div>
              <div>
                <label style={label}>Document Type</label>
                <select
                  name="document_type"
                  value={form.document_type}
                  onChange={handleChange}
                  style={input}
                >
                  <option>General</option>
                  <option>Contract</option>
                  <option>ID Copy</option>
                  <option>Qualification</option>
                  <option>Disciplinary</option>
                  <option>Medical</option>
                  <option>Performance Review</option>
                </select>
              </div>
              <div>
                <label style={label}>File Path / Reference</label>
                <input
                  name="file_path"
                  value={form.file_path}
                  onChange={handleChange}
                  style={input}
                  placeholder="e.g. /files/contracts/john.pdf"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={btnPrimary}>Save Document</button>
              <button type="button" onClick={resetForm} style={btnGhost}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER */}
      {documents.length > 0 && (
        <div style={{ ...card, padding: '16px 20px' }}>
          <label style={{ ...label, marginBottom: '8px' }}>Filter by employee</label>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            style={{ ...input, maxWidth: '400px' }}
          >
            <option value="">All employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.userName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* DOCUMENTS TABLE */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading documents...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📄</div>
            <p style={{ margin: 0 }}>
              {documents.length === 0
                ? <>No documents yet. Click <strong>+ Add Document</strong> to begin.</>
                : 'No documents match this filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={th}>Employee</th>
                  <th style={th}>Document</th>
                  <th style={th}>Type</th>
                  <th style={th}>Reference</th>
                  <th style={th}>Uploaded</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => (
                  <tr key={doc.id} style={{
                    backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <td style={{ ...td, fontWeight: '700', color: '#0f172a' }}>
                      {doc.employee_name || `#${doc.employee_id}`}
                    </td>
                    <td style={{ ...td, color: '#0f172a', fontWeight: '600' }}>
                      {doc.document_name}
                    </td>
                    <td style={td}>
                      <span style={{
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase'
                      }}>
                        {doc.document_type}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>
                      {doc.file_path || '—'}
                    </td>
                    <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        onClick={() => deleteDocument(doc.id, doc.document_name)}
                        style={{ ...btnSmall, background: '#fee2e2', color: '#b91c1c' }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const th = {
  padding: '14px 18px',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: '800',
  color: '#f8fafc',
  letterSpacing: '1.2px',
  textTransform: 'uppercase'
};

const td = {
  padding: '14px 18px',
  fontSize: '0.85rem'
};

export default DocumentsManager;