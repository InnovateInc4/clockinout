import React from "react";

const DateSelector = ({ menu }) => {
   
    const years = ["2024", "2025", "2026", "2027"];
    
   
    const months = [
        "01", "02", "03", "04", "05", "06", 
        "07", "08", "09", "10", "11", "12"
    ];

   
    const days = Array.from({ length: 31 }, (_, i) => 
        (i + 1).toString().padStart(2, '0')
    );

    return (
        <div className="row mb-3">
            <div className="col-4">
                <label className="form-label">Year</label>
                <select className="form-select" name={`${menu}-select-year`}>
                    <option value="default">Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div className="col-4">
                <label className="form-label">Month</label>
                <select className="form-select" name={`${menu}-select-month`}>
                    <option value="default">Month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div className="col-4">
                <label className="form-label">Day</label>
                <select className="form-select" name={`${menu}-select-day`}>
                    <option value="default">Day</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
        </div>
    );
};

export default DateSelector;