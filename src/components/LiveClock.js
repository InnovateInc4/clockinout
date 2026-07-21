import React, { useState, useEffect } from 'react';

const LiveClock = ({ isWidget }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  if (isWidget) {
    return <div className="neon-time">{timeStr}</div>;
  }
  return <span>{timeStr}</span>;
};
export default LiveClock;