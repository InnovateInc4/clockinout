import React from 'react';
import counters from './COUNTER'; // Adjust import path if needed

const StartTimeMenu = ({ dateTitle }) => {
  return (
    <div className="row mb-3">
      <div className="col-4">
        <label className="form-label">Start Hour</label>
        <select className="form-select" name="startHour" defaultValue="default">
          <option value="default">Hour</option>
          {counters.hours.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div className="col-4">
        <label className="form-label">Start Minute</label>
        <select className="form-select" name="startMinute" defaultValue="default">
          <option value="default">Minute</option>
          {counters.minutes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="col-4">
        <label className="form-label">AM / PM</label>
        <select className="form-select" name="startAmPm" defaultValue="AM">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

export default StartTimeMenu;