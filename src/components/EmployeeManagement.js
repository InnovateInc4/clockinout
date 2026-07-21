import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeManagement = ({ config, showAlert }) => {
    const [employees, setEmployees] = useState([]);
    const [newWorker, setNewWorker] = useState({ userName: '', userEmail: '', role: 'worker' });

    
    const fetchEmployees = () => {
        axios.get('/api/users/all-employees', config)
            .then(res => setEmployees(res.data))
            .catch(err => console.error("Error fetching staff:", err));
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    
    const handleInput = (e) => {
        setNewWorker({ ...newWorker, [e.target.name]: e.target.value });
    };

    
    const addWorker = (e) => {
        e.preventDefault();
        axios.post('/api/users/register', newWorker, config)
            .then(() => {
                showAlert("Worker added successfully!", "success");
                setNewWorker({ userName: '', userEmail: '', role: 'worker' });
                fetchEmployees(); 
            })
            .catch(err => showAlert("Error adding worker", "danger"));
    };

    return (
        <div className="row mt-4">
            {/* Form to Add Worker */}
            <div className="col-md-4">
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-success text-white">Add New Staff</div>
                    <div className="card-body">
                        <form onSubmit={addWorker}>
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input name="userName" value={newWorker.userName} onChange={handleInput} className="form-control" required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" name="userEmail" value={newWorker.userEmail} onChange={handleInput} className="form-control" required />
                            </div>
                            <button type="submit" className="btn btn-success w-100">Register Worker</button>
                        </form>
                    </div>
                </div>
            </div>

            {/* List of Workers */}
            <div className="col-md-8">
                <div className="card shadow-sm">
                    <div className="card-header bg-dark text-white">Current Farm Staff</div>
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, i) => (
                                    <tr key={i}>
                                        <td>{emp.userName}</td>
                                        <td>{emp.userEmail}</td>
                                        <td><span className="badge bg-info">{emp.role}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeManagement;