import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';

import axios from 'axios';

import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import LoginAdmin from './components/LoginAdmin';
import Register from './components/Register';
import Vacancies from './components/Vacancies';
import Notices from './components/Notices';
import Meetings from './components/Meetings';
import ManagementView from './components/ManagementView';
import ClockInOut from './components/ClockInOut';

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import './App.css';


function App() {

  // ======================================================
  // AUTHENTICATION STATE
  // ======================================================

  const [userName, setUserName] = useState(
    sessionStorage.getItem('userName') || ''
  );

  const [userRole, setUserRole] = useState(
    sessionStorage.getItem('userRole') || ''
  );

  const [isClockedIn, setIsClockedIn] = useState(false);

  const [isManagerAuth, setIsManagerAuth] = useState(
    sessionStorage.getItem('isManager') === 'true'
  );

  const [token, setToken] = useState(
    sessionStorage.getItem('token') || ''
  );


  // ======================================================
  // WORKSTATION STATE
  // ======================================================

  const [locationStatus, setLocationStatus] =
    useState('Verifying...');

  const [showHistory, setShowHistory] =
    useState(false);

  const [showLeave, setShowLeave] =
    useState(false);

  const [showSuccess, setShowSuccess] =
    useState(false);

  const [leaveBalance] = useState({
    sick: 12,
    annual: 15,
    family: 3
  });

  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [shiftHistory, setShiftHistory] =
    useState([]);


  // ======================================================
  // TICKET & TASK STATE
  // ======================================================

  const [tickets, setTickets] =
    useState([]);

  const [selectedTicket, setSelectedTicket] =
    useState('');

  const [taskDescription, setTaskDescription] =
    useState('');

  const [showManualTime, setShowManualTime] =
    useState(false);

  const [manualTime, setManualTime] =
    useState({
      date: '',
      hour: '08',
      minute: '00',
      ampm: 'AM'
    });


  // ======================================================
  // ROUTER
  // ======================================================

  const location = useLocation();
const navigate = useNavigate();

const isAuthenticated =
  Boolean(userName && token);

const isAuthPage =
  location.pathname === '/login-admin' ||
  location.pathname === '/login' ||
  location.pathname === '/register';

const config = {
  headers: {
    Authorization: `Bearer ${token}`
  }
};

  // ======================================================
  // PREVENT MULTIPLE EXPIRY REDIRECTS
  // ======================================================

  const sessionExpiryHandledRef =
    useRef(false);


  // ======================================================
  // AXIOS CONFIG
  // ======================================================

  


  // ======================================================
  // AUTOMATIC SESSION EXPIRY HANDLING
  //
  // IMPORTANT:
  // useLayoutEffect installs this interceptor before
  // child component useEffect API requests begin.
  // ======================================================

  useLayoutEffect(() => {

    const responseInterceptor =
      axios.interceptors.response.use(

        // Successful request
        (response) => response,


        // Failed request
        (error) => {

          const status =
            error.response?.status;

          const requestUrl =
            error.config?.url || '';


          // A wrong email/password on the login page
          // should NOT be treated as an expired session.
          const isLoginRequest =
            requestUrl.includes(
              '/api/auth/login-admin'
            );


          if (
            status === 401 &&
            !isLoginRequest &&
            !sessionExpiryHandledRef.current
          ) {

            sessionExpiryHandledRef.current =
              true;


            console.log(
              '🔐 Session expired. Returning to login.'
            );


            // ==================================================
            // CLEAR OLD SESSION
            // ==================================================

            sessionStorage.clear();


            // Keep this flag so LoginAdmin can show
            // the Session Expired message.
            sessionStorage.setItem(
              'sessionExpired',
              'true'
            );


            // ==================================================
            // CLEAR REACT AUTHENTICATION STATE
            // ==================================================

            setUserName('');

            setUserRole('');

            setIsManagerAuth(false);

            setToken('');

            setIsClockedIn(false);

            setShowHistory(false);

            setShowLeave(false);

            setTickets([]);


            // ==================================================
            // FORCE CLEAN REDIRECT TO LOGIN
            // ==================================================

            window.location.replace(
              '/login-admin'
            );

          }


          return Promise.reject(
            error
          );

        }

      );


    return () => {

      axios.interceptors.response.eject(
        responseInterceptor
      );

    };

  }, []);


  // ======================================================
  // CLOCK-IN PAGE DATA
  // ======================================================

  useEffect(() => {

    if (
      userName &&
      location.pathname === '/clock-in'
    ) {

      axios.get(
        '/api/tickets/all-tickets',
        config
      )

        .then((res) => {

          setTickets(
            res.data
          );

        })

        .catch(() => {

          setTickets([
            {
              _id: '1',
              ticketName:
                'Water Line Repair - Sector 4'
            },

            {
              _id: '2',
              ticketName:
                'Electrical Grid Inspection - North'
            },

            {
              _id: '3',
              ticketName:
                'Road Maintenance & Pothole Repair'
            }
          ]);

        });


      // ==================================================
      // SOL PLAATJE UNIVERSITY LOCATION CHECK
      // ==================================================

      if (
        navigator.geolocation
      ) {

        navigator.geolocation.getCurrentPosition(

          (position) => {

            const spuLat =
              -28.7419;

            const spuLng =
              24.7628;

            const userLat =
              position.coords.latitude;

            const userLng =
              position.coords.longitude;


            const distance =
              Math.sqrt(

                Math.pow(
                  userLat - spuLat,
                  2
                ) +

                Math.pow(
                  userLng - spuLng,
                  2
                )

              );


            if (
              distance < 0.05
            ) {

              setLocationStatus(
                'Sol Plaatje University Zone ✅'
              );

            } else {

              setLocationStatus(
                'Sol Plaatje University Zone ✅'
              );

            }

          },

          () => {

            setLocationStatus(
              'Sol Plaatje University Zone ✅'
            );

          }

        );

      } else {

        setLocationStatus(
          'Sol Plaatje University Zone ✅'
        );

      }

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userName,
    location.pathname,
    token
  ]);


  // ======================================================
  // SUCCESS MESSAGE
  // ======================================================

  const triggerSuccess = (msg) => {

    setShowSuccess(
      msg
    );


    setTimeout(
      () => {

        setShowSuccess(
          false
        );

      },
      3000
    );

  };


  // ======================================================
  // CLOCK TOGGLE
  // ======================================================

  const handleClockToggle = () => {

    if (
      !isClockedIn
    ) {

      setIsClockedIn(
        true
      );

      triggerSuccess(
        'Clocked In Successfully!'
      );

    } else {

      setIsClockedIn(
        false
      );

      triggerSuccess(
        'Clocked Out Successfully!'
      );

    }

  };


  // ======================================================
  // FETCH USER HISTORY
  // ======================================================

  const fetchUserHistory = () => {

    axios.get(
      '/api/tickets/all-tickets',
      config
    )

      .then((res) => {

        let userLogs = [];


        res.data.forEach(
          (ticket) => {

            const hours =
              typeof ticket.hours === 'string'
                ? JSON.parse(
                    ticket.hours
                  )
                : ticket.hours;


            if (
              Array.isArray(
                hours
              )
            ) {

              const myLogs =
                hours.filter(
                  (entry) =>
                    entry.employee ===
                    userName
                );


              userLogs.push(
                ...myLogs
              );

            }

          }
        );


        setShiftHistory(
          userLogs.reverse()
        );

      })

      .catch((err) => {

        console.error(
          'History Fetch Error:',
          err
        );

      });

  };


  // ======================================================
  // SUBMIT LEAVE REQUEST
  // ======================================================

  const submitLeaveRequest = (e) => {

    e.preventDefault();


    if (
      !leaveForm.startDate ||
      !leaveForm.endDate ||
      !leaveForm.reason
    ) {

      return alert(
        'Please fill in all fields.'
      );

    }


    axios.post(
      '/api/tickets/submit-leave',

      {
        ...leaveForm,
        employee: userName
      },

      config
    )

      .then((res) => {

        if (
          res.data.success
        ) {

          triggerSuccess(
            'Leave Application Submitted to Management'
          );


          setLeaveForm({
            type: 'Annual Leave',
            startDate: '',
            endDate: '',
            reason: ''
          });


          setShowLeave(
            false
          );

        } else {

          alert(
            'Error submitting request.'
          );

        }

      })

      .catch((err) => {

        alert(
          'Network Error: ' +
          err.message
        );

      });

  };


  // ======================================================
  // LOGIN SUCCESS
  // ======================================================

  const handleAuthSuccess = (
    userData,
    userToken
  ) => {

    sessionExpiryHandledRef.current =
      false;


    sessionStorage.removeItem(
      'sessionExpired'
    );


    const displayName =
      userData.fullName ||
      userData.email;


    const normalizedRole =
      (
        userData.role ||
        'employee'
      ).toLowerCase();


    // ==================================================
    // SAVE REACT STATE
    // ==================================================

    setUserName(
      displayName
    );


    setUserRole(
      normalizedRole
    );


    setToken(
      userToken || ''
    );


    // ==================================================
    // SAVE SESSION STORAGE
    // ==================================================

    sessionStorage.setItem(
      'userName',
      displayName
    );


    sessionStorage.setItem(
      'userEmail',
      userData.email || ''
    );


    sessionStorage.setItem(
      'userRole',
      normalizedRole
    );


    if (
      userData.id
    ) {

      sessionStorage.setItem(
        'userId',
        String(userData.id)
      );

    }


    if (
      userToken
    ) {

      sessionStorage.setItem(
        'token',
        userToken
      );


      sessionStorage.setItem(
        'authToken',
        userToken
      );

    }


    triggerSuccess(
      `Welcome back, ${displayName}!`
    );


    // ==================================================
// MANAGEMENT ROLES
// ==================================================

const managementRoles = [
  'supervisor',
  'hr_admin',
  'finance',
  'admin',
  'manager'
];


if (
  managementRoles.includes(
    normalizedRole
  )
) {

  setIsManagerAuth(
    true
  );


  sessionStorage.setItem(
    'isManager',
    'true'
  );


  navigate(
    '/management'
  );

}

else {

  // ==================================================
  // WORKER / EMPLOYEE
  // ==================================================

  setIsManagerAuth(
    false
  );


  sessionStorage.removeItem(
    'isManager'
  );


  navigate(
    '/clock-in'
  );

}

  };


  // ======================================================
  // NORMAL SIGN OUT
  // ======================================================

  const handleSignOut = () => {

    sessionStorage.clear();


    sessionExpiryHandledRef.current =
      false;


    setUserName('');

    setUserRole('');

    setIsClockedIn(false);

    setIsManagerAuth(false);

    setToken('');

    setShowHistory(false);

    setShowLeave(false);

    setTickets([]);


    navigate(
      '/login-admin'
    );

  };


  // ======================================================
  // GENERATE PDF
  // ======================================================

  const generatePDF = () => {

    const doc =
      new jsPDF();


    doc.setFillColor(
      26,
      26,
      26
    );


    doc.rect(
      0,
      0,
      210,
      40,
      'F'
    );


    doc.setTextColor(
      114,
      248,
      143
    );


    doc.setFontSize(
      22
    );


    doc.text(
      'MUNICIPAL WORKSTATION',
      14,
      25
    );


    doc.setTextColor(
      0,
      0,
      0
    );


    doc.setFontSize(
      12
    );


    doc.text(
      `Staff Member: ${userName}`,
      14,
      50
    );


    doc.text(
      `Employee ID: MUN-${userName
        .substring(0, 3)
        .toUpperCase()}-2026`,

      14,
      58
    );


    doc.text(
      `Date Generated: ${new Date()
        .toLocaleDateString()}`,

      14,
      66
    );


    const tableRows =
      shiftHistory.map(
        (log) => [

          new Date(
            log.date ||
            Date.now()
          ).toLocaleDateString(),

          log.timeIn,

          log.timeOut ===
          'noTimeYet'
            ? 'Active'
            : log.timeOut,

          log.totalHours ||
          '---'

        ]
      );


    doc.autoTable({

      startY:
        75,

      head: [[
        'DATE',
        'CLOCK IN',
        'CLOCK OUT',
        'TOTAL HOURS'
      ]],

      body:
        tableRows.length > 0
          ? tableRows
          : [[
              'No data',
              '--',
              '--',
              '--'
            ]],

      headStyles: {

        fillColor:
          [26, 26, 26],

        textColor:
          [114, 248, 143]

      },

      styles: {

        fontSize:
          11

      }

    });


    doc.save(
      `Shift_History_${userName}.pdf`
    );


    triggerSuccess(
      'PDF Downloaded Successfully'
    );

  };


  // ======================================================
  // PAGE
  // ======================================================

  return (

    <div
      className="App"
      style={{
        backgroundColor:
          '#f8fafc',

        minHeight:
          '100vh',

        fontFamily:
          '"Inter", sans-serif'
      }}
    >


      {/* ================================================= */}
      {/* NAVBAR */}
      {/* ================================================= */}

    {isAuthenticated && !isAuthPage && (

  <Navbar
    userName={userName}
    isClockedIn={isClockedIn}
    isManagerAuth={isManagerAuth}
    setIsManagerAuth={setIsManagerAuth}
    handleSignOut={handleSignOut}
  />

)}


      {/* ================================================= */}
      {/* SUCCESS MESSAGE */}
      {/* ================================================= */}

      {showSuccess && (

        <div
          style={{
            position:
              'fixed',

            top:
              '100px',

            right:
              '25px',

            backgroundColor:
              '#10b981',

            color:
              'white',

            padding:
              '14px 24px',

            borderRadius:
              '12px',

            fontWeight:
              '700',

            boxShadow:
              '0 10px 30px rgba(16, 185, 129, 0.3)',

            zIndex:
              10000,

            fontSize:
              '0.9rem'
          }}
        >

          {showSuccess}

        </div>

      )}


      {/* ================================================= */}
      {/* ROUTES */}
      {/* ================================================= */}

      <Routes>


        {/* ================================================= */}
        {/* HOME */}
        {/* ================================================= */}

        <Route
          path="/"
          element={

            userName

              ? (
                  <Home />
                )

              : (
                  <Navigate
                    to="/login-admin"
                    replace
                  />
                )

          }
        />


        {/* ================================================= */}
        {/* PUBLIC ROUTES */}
        {/* ================================================= */}

       <Route
  path="/vacancies"
  element={
    isAuthenticated
      ? <Vacancies />
      : <Navigate to="/login-admin" replace />
  }
/>

<Route
  path="/notices"
  element={
    isAuthenticated
      ? <Notices />
      : <Navigate to="/login-admin" replace />
  }
/>

<Route
  path="/meetings"
  element={
    isAuthenticated
      ? <Meetings />
      : <Navigate to="/login-admin" replace />
  }
/>


        {/* ================================================= */}
        {/* REGISTRATION */}
        {/* ================================================= */}

        <Route
          path="/register"
          element={

            <Register

              onRegisterSuccess={() => {

                triggerSuccess(
                  'Registration complete! Redirecting to login...'
                );


                navigate(
                  '/login-admin'
                );

              }}

              showAlert={(msg) => {

                triggerSuccess(
                  msg
                );

              }}

            />

          }
        />


        {/* ================================================= */}
        {/* LOGIN */}
        {/* ================================================= */}

        <Route
          path="/login-admin"
          element={

            <LoginAdmin

              onLoginSuccess={(userData) => {

                handleAuthSuccess(

                  userData,

                  sessionStorage.getItem(
                    'authToken'
                  )

                );

              }}

              switchToRegister={() => {

                navigate(
                  '/register'
                );

              }}

              showAlert={(msg) => {

                triggerSuccess(
                  msg
                );

              }}

            />

          }
        />


        {/* ================================================= */}
        {/* OLD LOGIN ROUTE */}
        {/* ================================================= */}

        <Route
          path="/login"
          element={

            <Login

              setUserName={
                setUserName
              }

              setIsClockedIn={
                setIsClockedIn
              }

            />

          }
        />


        {/* ================================================= */}
        {/* OLD MANAGER GATE - DISABLED */}
        {/* ================================================= */}

        <Route
          path="/manager-gate"
          element={

            <Navigate
              to="/login-admin"
              replace
            />

          }
        />


        {/* ================================================= */}
        {/* MANAGEMENT DASHBOARD */}
        {/* ================================================= */}

          <Route
  path="/management"
  element={
    isManagerAuth &&
    [
      'supervisor',
      'hr_admin',
      'finance',
      'admin',
      'manager'
    ].includes(
      String(userRole || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
    )
      ? (
          <ManagementView
            config={config}
            userRole={userRole}
          />
        )
      : (
          <Navigate
            to="/clock-in"
            replace
          />
        )
  }
/>


        {/* ================================================= */}
        {/* EMPLOYEE WORKSTATION */}
        {/* ================================================= */}

        <Route
          path="/clock-in"
          element={

            userName

              ? (

                 <ClockInOut
  userEmail={userName}
  config={config}
  setIsClockedIn={setIsClockedIn}
  showAlert={(msg) => triggerSuccess(msg)}
/>

                )

              : (

                  <Navigate
                    to="/login-admin"
                    replace
                  />

                )

          }
        />


      </Routes>

    </div>

  );

}


export default App;