import React, { useState, useEffect } from "react";

const DateSelector = ({ menu, onDateChange }) => {
    const [selectedYear, setSelectedYear] = useState("default");
    const [selectedMonth, setSelectedMonth] = useState("default");
    const [selectedDay, setSelectedDay] = useState("default"); // Added Day state

    const years = ["2024", "2025", "2026", "2027"];
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    let numDays = 31;
    if (selectedYear !== "default" && selectedMonth !== "default") {
        numDays = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    }

    const days = Array.from({ length: numDays }, (_, i) => 
        (i + 1).toString().padStart(2, '0')
    );

    // Safety check: if user picks 31, then changes month to Feb, reset the day
    useEffect(() => {
        if (selectedDay !== "default" && parseInt(selectedDay) > numDays) {
            setSelectedDay("default");
        }
    }, [numDays, selectedDay]);

    // Lift the state up: send the formatted date back to the parent
    useEffect(() => {
        if (onDateChange) {
            if (selectedYear !== "default" && selectedMonth !== "default" && selectedDay !== "default") {
                // Returns standard 'YYYY-MM-DD' format
                onDateChange(`${selectedYear}-${selectedMonth}-${selectedDay}`);
            } else {
                // If the date is incomplete, pass null
                onDateChange(null);
            }
        }
    }, [selectedYear, selectedMonth, selectedDay, onDateChange]);

    const labelStyle = {
        fontSize: '0.85rem',
        fontWeight: '800',
        color: '#0f172a',
        textTransform: 'uppercase',
        marginBottom: '8px',
        letterSpacing: '0.5px',
        display: 'block'
    };

    return (
        <div className="row mb-3" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
            <div className="col-4">
                <label style={labelStyle}>Year</label>
                <select 
                    className="custom-select" 
                    name={`${menu}-select-year`}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                    <option value="default">Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div className="col-4">
                <label style={labelStyle}>Month</label>
                <select 
                    className="custom-select" 
                    name={`${menu}-select-month`}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    <option value="default">Month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div className="col-4">
                <label style={labelStyle}>Day</label>
                <select 
                    className="custom-select" 
                    name={`${menu}-select-day`}
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                >
                    <option value="default">Day</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            <style>{`
                .custom-select {
                    width: 100%;
                    background-color: rgba(255, 255, 255, 0.5);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 10px 15px;
                    color: #0f172a;
                    font-size: 0.9rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.3s ease;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03);
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ea580c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px top 50%;
                    background-size: 0.65em auto;
                    cursor: pointer;
                }
                .custom-select:hover { border-color: rgba(234, 88, 12, 0.4); }
                .custom-select:focus { border-color: #ea580c; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.15); }
                .custom-select option { color: #0f172a; background-color: #ffffff; }
            `}</style>
        </div>
    );
};

export default DateSelector;