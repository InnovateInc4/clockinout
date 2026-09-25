import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeManagement = ({ config }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const emptyForm = {
    userName: '',
    userEmail: '',
    role: 'worker',
    department: 'General'
  };

  const [form, setForm] = useState(emptyForm);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchEmployees = () => {
    setLoading(true);
    axios.get('/api/users/all-employees', config)
      .then(res => {
        setEmployees(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching employees:', err);
        showMessage('Could not load employees', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.userName || !form.userEmail) {
      showMessage('Name and email are required', 'error');
      return;
    }

    if (editingId) {
      axios.put(`/api/users/update-employee/${editingId}`, form, config)
        .then(() => {
          showMessage('Employee updated successfully');
          resetForm();
          fetchEmployees();
        })
        .catch(err => {
          console.error(err);
          showMessage(err.response?.data?.error || 'Error updating employee', 'error');
        });
    } else {
      axios.post('/api/users/register', form, config)
        .then(() => {
          showMessage('Employee added successfully');
          resetForm();
          fetchEmployees();
        })
        .catch(err => {
          console.error(err);
          showMessage(err.response?.data?.error || 'Error adding employee', 'error');
        });
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setShowAddForm(true);
    setForm({
      userName: emp.userName,
      userEmail: emp.userEmail,
      role: emp.role || 'worker',
      department: emp.department || 'General'
    });
  };

  const deactivateEmployee = (id) => {
    if (!window.confirm('Deactivate this employee? They will be marked inactive.')) return;
    axios.put(`/api/users/deactivate-employee/${id}`, {}, config)
      .then(() => {
        showMessage('Employee deactivated');
        fetchEmployees();
      })
      .catch(err => {
        console.error(err);
        showMessage('Error deactivating employee', 'error');
      });
  };

  const reactivateEmployee = (id) => {
    axios.put(`/api/users/reactivate-employee/${id}`, {}, config)
      .then(() => {
        showMessage('Employee reactivated');
        fetchEmployees();
      })
      .catch(err => {
        console.error(err);
        showMessage('Error reactivating employee', 'error');
      });
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
    cursor: 'pointer',
    marginRight: '6px'
  };

  const statusBadge = (status) => {
    const active = status === 'Active';
    return (
      <span style={{
        backgroundColor: active ? '#dcfce7' : '#fee2e2',
        color: active ? '#15803d' : '#b91c1c',
        padding: '4px 12px',
        borderRadius: '50px',
        fontSize: '0.7rem',
        fontWeight: '800',
        border: `1px solid ${active ? '#bbf7d0' : '#fecaca'}`
      }}>
        {status}
      </span>
    );
  };

  // ---------- RENDER ----------
  return (
    <div>

      {/* MESSAGE BAR */}
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
            Employee Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {employees.length} employee{employees.length === 1 ? '' : 's'} in the system
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm && !editingId) {
              resetForm();
            } else {
              resetForm();
              setShowAddForm(true);
            }
          }}
          style={btnPrimary}
        >
          {showAddForm && !editingId ? '✕ Close' : '+ Add Employee'}
        </button>
      </div>

      {/* ADD / EDIT FORM */}
      {showAddForm && (
        <div style={card}>
          <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '1.1rem' }}>
            {editingId ? '✎ Edit Employee' : '+ Add New Employee'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={label}>Full Name</label>
                <input
                  name="userName"
                  value={form.userName}
                  onChange={handleChange}
                  style={input}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div>
                <label style={label}>Email</label>
                <input
                  type="email"
                  name="userEmail"
                  value={form.userEmail}
                  onChange={handleChange}
                  style={input}
                  placeholder="e.g. john@municipal.gov"
                  required
                />
              </div>
              <div>
                <label style={label}>Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="worker">Worker</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={label}>Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  style={input}
                >
                  <option>General</option>
                  <option>Water Services</option>
                  <option>Electricity</option>
                  <option>Roads & Transport</option>
                  <option>Waste Management</option>
                  <option>Parks & Recreation</option>
                  <option>Human Resources</option>
                  <option>Finance</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={btnPrimary}>
                {editingId ? 'Save Changes' : 'Add Employee'}
              </button>
              <button type="button" onClick={resetForm} style={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EMPLOYEE TABLE */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👥</div>
            <p style={{ margin: 0 }}>No employees yet. Click <strong>+ Add Employee</strong> to begin.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Department</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.id} style={{
                    backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <td style={{ ...td, fontWeight: '700', color: '#0f172a' }}>{emp.userName}</td>
                    <td style={{ ...td, color: '#475569' }}>{emp.userEmail}</td>
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
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#475569' }}>{emp.department}</td>
                    <td style={td}>{statusBadge(emp.status)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        onClick={() => startEdit(emp)}
                        style={{ ...btnSmall, background: '#0f172a', color: 'white' }}
                      >
                        ✎ Edit
                      </button>
                      {emp.status === 'Active' ? (
                        <button
                          onClick={() => deactivateEmployee(emp.id)}
                          style={{ ...btnSmall, background: '#fee2e2', color: '#b91c1c' }}
                        >
                          ⏻ Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateEmployee(emp.id)}
                          style={{ ...btnSmall, background: '#dcfce7', color: '#15803d' }}
                        >
                          ↻ Reactivate
                        </button>
                      )}
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

export default EmployeeManagement;