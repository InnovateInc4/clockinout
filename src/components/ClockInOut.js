import React, { useEffect, useState, useRef } from "react";
import NumberToTime from "./NumberToTime";
import HourlyBarChart from "./HourlyBarChart";
import DateSelector from "./DateSelector";
import StartTimeMenu from "./StartTimeMenu";
import axios from "axios";
import TicketList from "./TicketList";

const ClockInOut = (props) => {
    const [loaded, setLoaded] = useState(false);
    const [timeClock, setTimeClock] = useState([]);
    const [clockedIn, setClockedIn] = useState(false);
    const [totalHours, setTotalHours] = useState(0);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [filterVal, setFilterVal] = useState("");

    const [locationStatus, setLocationStatus] = useState("Checking Location...");
    const [isInZone, setIsInZone] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [taskDescription, setTaskDescription] = useState("");

    const targetLoc = { lat: -28.7677, lng: 20.6139 }; 
    const allowedRadiusKM = 0.5; 

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const verifyLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus("Geolocation not supported");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const dist = calculateDistance(latitude, longitude, targetLoc.lat, targetLoc.lng);
                setUserCoords({ lat: latitude, lng: longitude });
                if (dist <= allowedRadiusKM) {
                    setIsInZone(true);
                    setLocationStatus("Confirmed: In Work Zone ✅");
                } else {
                    setIsInZone(false);
                    setLocationStatus(`Out of Zone (${dist.toFixed(2)}km away) ❌`);
                }
            },
            () => setLocationStatus("Location access denied")
        );
    };

    const selectedTicketRef = useRef("default");

    const getTotal = (data) => {
        if (!data || data.length === 0) {
            setTotalHours(0);
            return;
        }
        const total = data.reduce((acc, curr) => {
            if (curr.timeOut !== "noTimeYet") {
                const duration = (curr.timeOut - curr.timeIn) / 3600000;
                return acc + duration;
            }
            return acc;
        }, 0);
        setTotalHours(total);
    };

    const filterHours = (e) => {
        const val = e.target.value;
        setFilterVal(val);
        const filtered = employeeHours.filter(item => 
            NumberToTime(item.timeIn).toLowerCase().includes(val.toLowerCase())
        );
        getTotal(filtered);
        setTimeClock(filtered);
    };

    const populateFields = () => {
        const ticketSelect = document.querySelector("[name='ticketList']");
        const whichTicket = ticketSelect ? ticketSelect.value : "default";
        selectedTicketRef.current = whichTicket;

        if (whichTicket === "default") {
            props.setActiveTicket(null);
            sessionStorage.removeItem("activeTicket");
            setTimeClock([]);
            setTotalHours(0);
            return;
        }

        props.setActiveTicket(whichTicket);
        sessionStorage.setItem("activeTicket", whichTicket);

        axios.get(`api/tickets/grab-ticket/${whichTicket}`, props.config)
            .then((res) => {
                if (!res.data[0] || !res.data[0].hours) {
                    resetData();
                } else {
                    const parsedHours = typeof res.data[0].hours === "string" 
                        ? JSON.parse(res.data[0].hours) 
                        : res.data[0].hours;

                    const myHours = parsedHours.filter(h => h.employee === props.userEmail);
                    
                    if(myHours.length > 0 && myHours[myHours.length - 1].timeOut === "noTimeYet") {
                        setClockedIn(true);
                    } else {
                        setClockedIn(false);
                    }

                    setTimeClock(myHours);
                    setEmployeeHours(myHours);
                    getTotal(myHours);
                }
            })
            .catch(() => props.showAlert("Could not sync ticket data", "danger"));
    };

    const resetData = () => {
        setTimeClock([]);
        setTotalHours(0);
        setEmployeeHours([]);
        setClockedIn(false);
    };

    const inOut = (type, usingCurrentTime) => {
        const whichTicket = selectedTicketRef.current;
        
        if (whichTicket === "default") {
            props.showAlert("Please select a ticket first", "warning");
            return;
        }

        let timeVal;
        if (usingCurrentTime) {
            timeVal = Date.now();
        } else {
            try {
                const year = document.querySelector("[name='Timeclock-select-year']").value;
                const month = document.querySelector("[name='Timeclock-select-month']").value;
                const day = document.querySelector("[name='Timeclock-select-day']").value;
                let hour = parseInt(document.querySelector("[name='startHour']").value);
                const minute = document.querySelector("[name='startMinute']").value;
                const amPm = document.querySelector("[name='startAmPm']").value;

                if (amPm === "PM" && hour !== 12) hour += 12;
                if (amPm === "AM" && hour === 12) hour = 0;

                const dateString = `${year}-${month}-${day}T${hour.toString().padStart(2, '0')}:${minute}:00`;
                timeVal = Date.parse(dateString);

                if (isNaN(timeVal)) throw new Error("Invalid Date");
            } catch (err) {
                props.showAlert("Please complete all date/time fields", "warning");
                return;
            }
        }

        let updatedHours = [...employeeHours];

        if (type === "in") {
            if (clockedIn) {
                props.showAlert("You are already clocked in!", "warning");
                return;
            }
           
            updatedHours.push({ 
                employee: props.userEmail, 
                timeIn: timeVal, 
                timeOut: "noTimeYet",
                coords: userCoords 
            });
            setClockedIn(true);
        } else {
            if (updatedHours.length > 0 && updatedHours[updatedHours.length - 1].timeOut === "noTimeYet") {
                if (taskDescription.trim() === "") {
                    props.showAlert("Please enter a task summary", "warning");
                    return;
                }
                updatedHours[updatedHours.length - 1].timeOut = timeVal;
                updatedHours[updatedHours.length - 1].task = taskDescription;
            }
            setClockedIn(false);
            setTaskDescription("");
        }

        const putData = {
            ticketId: whichTicket,
            hours: JSON.stringify(updatedHours)
        };

        axios.put("/api/tickets/add-hours", putData, props.config)
            .then((res) => {
                props.showAlert(type === "in" ? "Clocked In Successfully" : "Work Logged Successfully", "success");
                populateFields();
            })
            .catch(err => props.showAlert("Database Error: " + err.message, "danger"));
    };

    useEffect(() => {
        if (!loaded) {
            verifyLocation();
            if (props.getTickets) {
                props.getTickets(props.userEmail);
            }
            
            const savedTicket = sessionStorage.getItem("activeTicket");
            if (savedTicket) {
                setTimeout(() => {
                    const el = document.querySelector(`select[name='ticketList']`);
                    if (el) {
                        el.value = savedTicket;
                        populateFields();
                    }
                }, 500);
            }
            setLoaded(true);
        }
    }, [props, loaded]);

    return (
        <div style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
            padding: '40px 20px',
            fontFamily: '"Inter", system-ui, sans-serif'
        }}>
            {/* Background Overlay */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,237,213,0.75) 100%)',
                zIndex: 0
            }} />

            <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                
                {/* PAGE HEADER */}
                <header style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <span style={{ 
                        display: 'inline-block',
                        backgroundColor: '#fff7ed', 
                        color: '#ea580c', 
                        border: '1px solid #ffedd5',
                        padding: '6px 16px', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: '800', 
                        letterSpacing: '1.5px', 
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 10px rgba(234, 88, 12, 0.1)'
                    }}>
                        Geofenced Workforce Tracking
                    </span>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                        Attendance & Time Management
                    </h1>
                    <p style={{ color: '#475569', fontSize: '1rem', margin: 0 }}>
                        Verify your location zone, log active ticket hours, and maintain daily activity records.
                    </p>
                </header>

                {/* GPS VERIFICATION STATUS BAR */}
                <div style={{
                    background: isInZone ? 'rgba(240, 253, 244, 0.85)' : 'rgba(254, 242, 242, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isInZone ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '16px',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📍</span>
                        <span style={{ 
                            fontWeight: '800', 
                            fontSize: '0.95rem',
                            color: isInZone ? '#166534' : '#991b1b' 
                        }}>
                            {locationStatus}
                        </span>
                    </div>
                    <button 
                        onClick={verifyLocation}
                        style={{
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🔄 Refresh GPS
                    </button>
                </div>

                {/* TICKET SELECTION PANEL */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '24px 32px',
                    border: '1px solid rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    marginBottom: '24px'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                        1. Select Active Ticket / Project
                    </h3>
                    <TicketList populateFields={populateFields} ticketInfo={props.ticketInfo} />
                </div>

                {/* TIME ENTRY FORM */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '32px',
                    border: '1px solid rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                            2. Time Entry Console
                        </h2>
                        <span style={{
                            backgroundColor: clockedIn ? '#dcfce7' : '#f1f5f9',
                            color: clockedIn ? '#15803d' : '#64748b',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: '800'
                        }}>
                            {clockedIn ? '● Active Session' : '○ Off the Clock'}
                        </span>
                    </div>

                    {/* Task Input Field */}
                    {clockedIn && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: '#334155', marginBottom: '8px' }}>
                                Daily Task Summary <span style={{ color: '#ea580c' }}>*</span>
                            </label>
                            <textarea 
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                placeholder="Detail the duties performed during this shift before logging out..."
                                style={{ 
                                    width: '100%',
                                    minHeight: '80px',
                                    borderRadius: '12px', 
                                    border: '2px solid #ffedd5',
                                    padding: '12px 16px',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ backgroundColor: 'rgba(248, 250, 252, 0.7)', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <DateSelector menu={"Timeclock"} />
                        <StartTimeMenu dateTitle={"Timeclock"} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {!clockedIn ? (
                            <button 
                                onClick={() => inOut("in", false)}
                                style={{
                                    flex: 1,
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    backgroundColor: '#ea580c',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                CLOCK IN (MANUAL TIME)
                            </button>
                        ) : (
                            <button 
                                onClick={() => inOut("out", false)}
                                style={{
                                    flex: 1,
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                CLOCK OUT & SAVE TASK
                            </button>
                        )}

                        <button 
                            onClick={() => inOut(clockedIn ? "out" : "in", true)}
                            style={{
                                padding: '14px 28px',
                                borderRadius: '12px',
                                backgroundColor: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            ⚡ USE CURRENT TIME
                        </button>
                    </div>
                </div>

                {/* SHIFT LOG DISPLAY */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '32px',
                    border: '1px solid rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                            Shift Log History
                        </h3>
                        <input 
                            type="text" 
                            placeholder="Filter shift logs..." 
                            onChange={filterHours} 
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem',
                                outline: 'none',
                                width: '220px'
                            }}
                        />
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {timeClock.length === 0 ? (
                            <li style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                No recorded shifts found for this ticket.
                            </li>
                        ) : (
                            timeClock.map((tc, i) => (
                                <li key={i} style={{ 
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px', 
                                    padding: '16px 20px',
                                    marginBottom: '10px',
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                                                {NumberToTime(tc.timeIn)}
                                            </span>
                                            {tc.timeOut !== "noTimeYet" ? (
                                                <span style={{ color: '#475569', fontWeight: '700' }}> — {NumberToTime(tc.timeOut)}</span>
                                            ) : (
                                                <span style={{ color: '#16a34a', fontWeight: '800', marginLeft: '8px' }}> — (Active Shift)</span>
                                            )}
                                            {tc.task && (
                                                <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                                    <strong>Task Summary:</strong> {tc.task}
                                                </p>
                                            )}
                                        </div>
                                        {tc.timeOut !== "noTimeYet" && (
                                            <span style={{ 
                                                backgroundColor: '#fff7ed', 
                                                color: '#ea580c', 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: '800',
                                                border: '1px solid #ffedd5'
                                            }}>
                                                {((tc.timeOut - tc.timeIn) / 3600000).toFixed(2)} hrs
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>

                    <div style={{ textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '900' }}>
                            Total Cumulative Hours: <span style={{ color: '#ea580c' }}>{totalHours.toFixed(2)} hrs</span>
                        </h4>
                    </div>
                </div>

                {/* HOURLY BAR CHART VISUALIZATION */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '32px',
                    border: '1px solid rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)'
                }}>
                    <HourlyBarChart email={props.userEmail} employeeHours={employeeHours} />
                </div>

            </div>
        </div>
    );
};

export default ClockInOut;