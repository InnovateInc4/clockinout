import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';


// ======================================================
// MANAGEMENT VIEW
// ======================================================

const ManagementView = ({ config }) => {


  // ======================================================
  // LOCAL DATE
  // ======================================================

  const getLocalDateString = () => {

    const date = new Date();

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;

  };


  // ======================================================
  // STATE
  // ======================================================

  // ======================================================
// MANAGEMENT NAVIGATION
// ======================================================

const [
  activeManagementSection,
  setActiveManagementSection
] = useState('overview');

const [
  activeReportSection,
  setActiveReportSection
] = useState('weekly');

  const [liveStaff, setLiveStaff] =
    useState([]);

  const [suggestions, setSuggestions] =
    useState([]);

  const [leaveRequests, setLeaveRequests] =
    useState([]);

  const [employees, setEmployees] =
    useState([]);

  const [employeeSearch, setEmployeeSearch] =
    useState('');

  const [
    selectedEmployee,
    setSelectedEmployee
  ] = useState(null);

  const [
    isEditingEmployee,
    setIsEditingEmployee
  ] = useState(false);

  const [
    savingEmployee,
    setSavingEmployee
  ] = useState(false);

  const [
    employeeEditForm,
    setEmployeeEditForm
  ] = useState({
    department: '',
    position: '',
    employment_status: 'Active',
    account_status: 'Active'
  });

  const [
    workforceOverview,
    setWorkforceOverview
  ] = useState({
    total_employees: 0,
    on_duty: 0,
    off_duty: 0,
    on_leave: 0
  });

  const [
    todayAttendance,
    setTodayAttendance
  ] = useState([]);

  const [
    selectedAttendanceDate,
    setSelectedAttendanceDate
  ] = useState(
    getLocalDateString()
  );
  // ======================================================
// WEEKLY ATTENDANCE REPORT STATE
// ======================================================

const [
  weeklyAttendance,
  setWeeklyAttendance
] = useState([]);

const [
  weeklyStartDate,
  setWeeklyStartDate
] = useState('');

const [
  weeklyEndDate,
  setWeeklyEndDate
] = useState('');

const [
  weeklyReportLoading,
  setWeeklyReportLoading
] = useState(false);

// ======================================================
// MONTHLY ATTENDANCE REPORT STATE
// ======================================================

const [
  monthlyAttendance,
  setMonthlyAttendance
] = useState([]);

const [
  selectedMonth,
  setSelectedMonth
] = useState('');

const [
  monthlyReportLoading,
  setMonthlyReportLoading
] = useState(false);

// ======================================================
// HOURS WORKED REPORT STATE
// ======================================================

const [
  hoursWorkedData,
  setHoursWorkedData
] = useState([]);

const [
  hoursWorkedStartDate,
  setHoursWorkedStartDate
] = useState('');

const [
  hoursWorkedEndDate,
  setHoursWorkedEndDate
] = useState('');

const [
  hoursWorkedLoading,
  setHoursWorkedLoading
] = useState(false);

// ======================================================
// ABSENTEEISM REPORT STATE
// ======================================================

const [
  absenteeismData,
  setAbsenteeismData
] = useState([]);

const [
  absenteeismDate,
  setAbsenteeismDate
] = useState(
  getLocalDateString()
);

const [
  absenteeismLoading,
  setAbsenteeismLoading
] = useState(false);

// ======================================================
// HOURS WORKED REPORT SUMMARY
// ======================================================

const hoursWorkedSummary = {

  totalEmployees:
    hoursWorkedData.length,

  totalShifts:
    hoursWorkedData.reduce(
      (total, employee) =>
        total +
        Number(
          employee.total_shifts || 0
        ),
      0
    ),

  totalHours:
    hoursWorkedData.reduce(
      (total, employee) =>
        total +
        Number(
          employee.total_hours || 0
        ),
      0
    ),

  averageHours:
    hoursWorkedData.length > 0
      ? hoursWorkedData.reduce(
          (total, employee) =>
            total +
            Number(
              employee.total_hours || 0
            ),
          0
        ) / hoursWorkedData.length
      : 0

};

// ======================================================
// MONTHLY ATTENDANCE REPORT SUMMARY
// ======================================================

const monthlyReportSummary = {

  totalRecords:
    monthlyAttendance.length,

  uniqueEmployees:
    new Set(
      monthlyAttendance.map(
        (record) =>
          record.employee_id
      )
    ).size,

  completedShifts:
    monthlyAttendance.filter(
      (record) =>
        record.clock_out
    ).length,

  stillWorking:
    monthlyAttendance.filter(
      (record) =>
        !record.clock_out
    ).length,

  totalHours:
    monthlyAttendance.reduce(
      (total, record) =>
        total +
        Number(
          record.total_hours || 0
        ),
      0
    )

};

// ======================================================
// WEEKLY ATTENDANCE REPORT SUMMARY
// ======================================================

const weeklyReportSummary = {

  totalRecords:
    weeklyAttendance.length,

  completedShifts:
    weeklyAttendance.filter(
      (record) => record.clock_out
    ).length,

  stillWorking:
    weeklyAttendance.filter(
      (record) => !record.clock_out
    ).length,

  totalHours:
    weeklyAttendance.reduce(
      (total, record) =>
        total +
        Number(
          record.total_hours || 0
        ),
      0
    ),

  uniqueEmployees:
    new Set(
      weeklyAttendance.map(
        (record) => record.employee_id
      )
    ).size

};
  // ======================================================
// DAILY ATTENDANCE REPORT SUMMARY
// ======================================================

const dailyReportSummary = {

  totalRecords:
    todayAttendance.length,

  completedShifts:
    todayAttendance.filter(
      (record) => record.clock_out
    ).length,

  stillWorking:
    todayAttendance.filter(
      (record) => !record.clock_out
    ).length,

  totalHours:
    todayAttendance.reduce(
      (total, record) =>
        total +
        Number(
          record.total_hours || 0
        ),
      0
    )

};

// ======================================================
// EXPORT DAILY ATTENDANCE REPORT TO CSV
// ======================================================

const exportDailyAttendanceCSV = () => {

  if (todayAttendance.length === 0) {

    alert(
      'There are no attendance records to export for this date.'
    );

    return;

  }


  const escapeCsvValue = (value) => {

    const text =
      String(value ?? '');

    return `"${text.replace(/"/g, '""')}"`;

  };


  const headers = [
    'Employee',
    'Email',
    'Department',
    'Position',
    'Clock In',
    'Clock Out',
    'Total Hours',
    'Status'
  ];


  const rows =
    todayAttendance.map(
      (record) => [

        record.name || '',

        record.email || '',

        record.department || '',

        record.position || '',

        record.clock_in
          ? formatTime(record.clock_in)
          : '',

        record.clock_out
          ? formatTime(record.clock_out)
          : 'Still Working',

        Number(
          record.total_hours || 0
        ).toFixed(2),

        record.status || ''

      ]
    );


  const csvContent = [
    headers,
    ...rows
  ]
    .map(
      (row) =>
        row
          .map(escapeCsvValue)
          .join(',')
    )
    .join('\n');


  const blob =
    new Blob(
      [csvContent],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


  link.href = url;

  link.download =
    `Attendance_Report_${selectedAttendanceDate}.csv`;


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);

};

  const [loading, setLoading] =
    useState(true);

  const [leaveAlert, setLeaveAlert] =
    useState(null);

    const [auditLogs, setAuditLogs] = useState([]);

    const [employeeDocuments, setEmployeeDocuments] =
  useState([]);
const [documentsLoading, setDocumentsLoading] =
  useState(false);
  const [uploadingDocument, setUploadingDocument] =
  useState(false);

const [documentUploadForm, setDocumentUploadForm] =
  useState({
    document_type: '',
    file: null
  });

  const documentFileInputRef =
  useRef(null);
  // ======================================================
  // LOAD MANAGEMENT DASHBOARD DATA
  // ======================================================

  const fetchDashboardData = async () => {

    try {

      const [
  liveRes,
  suggestionRes,
  leaveRes,
  overviewRes,
  employeesRes,
  auditRes
] = await Promise.all([

        axios.get(
          '/api/management/live-staff',
          config
        ),

        axios.get(
          '/api/tickets/get-suggestions',
          config
        ),

        axios.get(
          '/api/tickets/get-leave-requests',
          config
        ),

        axios.get(
          '/api/management/today-overview',
          config
        ),

        axios.get(
          '/api/management/employees',
          config
        ),
        axios.get(
  '/api/management/audit-logs',
  config
)

      ]);


      // ------------------------------------------
      // LIVE STAFF
      // ------------------------------------------

      const staffFromApi =
        liveRes.data.staff || [];


      const uniqueStaff =
        Array.from(
          new Map(
            staffFromApi.map(
              (staff) => [
                staff.employee_id,
                staff
              ]
            )
          ).values()
        );


      setLiveStaff(
        uniqueStaff
      );


      // ------------------------------------------
      // FEEDBACK
      // ------------------------------------------

      setSuggestions(
        suggestionRes.data || []
      );


      // ------------------------------------------
      // LEAVE
      // ------------------------------------------

      setLeaveRequests(
        leaveRes.data || []
      );


      // ------------------------------------------
      // WORKFORCE
      // ------------------------------------------

      setWorkforceOverview(
        overviewRes.data.overview || {
          total_employees: 0,
          on_duty: 0,
          off_duty: 0,
          on_leave: 0
        }
      );


      // ------------------------------------------
      // EMPLOYEE DIRECTORY
      // ------------------------------------------

      setEmployees(
        employeesRes.data.employees || []
      );
      setAuditLogs(
  auditRes.data.logs || []
);


      setLoading(false);


    } catch (err) {

      console.error(
        '❌ Management dashboard error:',
        err.response?.data ||
        err.message
      );

      setLoading(false);

    }

  };


  // ======================================================
  // LOAD ATTENDANCE BY DATE
  // ======================================================

  const fetchAttendanceByDate =
    async (date) => {

      try {

        const response =
          await axios.get(
            `/api/management/attendance-by-date?date=${date}`,
            config
          );


        setTodayAttendance(
          response.data.attendance || []
        );


      } catch (err) {

        console.error(
          '❌ Attendance date error:',
          err.response?.data ||
          err.message
        );

        setTodayAttendance([]);

      }

    };

    // ======================================================
// LOAD WEEKLY ATTENDANCE REPORT
// ======================================================

const fetchWeeklyAttendance = async () => {

  if (
    !weeklyStartDate ||
    !weeklyEndDate
  ) {

    alert(
      'Please select both a start date and an end date.'
    );

    return;

  }


  if (
    weeklyStartDate >
    weeklyEndDate
  ) {

    alert(
      'Start date cannot be after end date.'
    );

    return;

  }


  try {

    setWeeklyReportLoading(true);


    const response =
      await axios.get(
        `/api/management/attendance-weekly?start=${weeklyStartDate}&end=${weeklyEndDate}`,
        config
      );


    setWeeklyAttendance(
      response.data.attendance || []
    );


    console.log(
      '✅ Weekly attendance loaded:',
      response.data.attendance || []
    );


  } catch (err) {

    console.error(
      '❌ Weekly attendance report error:',
      err.response?.data ||
      err.message
    );


    setWeeklyAttendance([]);


    alert(
      err.response?.data?.message ||
      'The weekly attendance report could not be loaded.'
    );


  } finally {

    setWeeklyReportLoading(false);

  }

};
// ======================================================
// LOAD MONTHLY ATTENDANCE REPORT
// ======================================================

const fetchMonthlyAttendance = async () => {

  if (!selectedMonth) {

    alert(
      'Please select a month.'
    );

    return;

  }


  let year;
let month;


// Normal YYYY-MM format
if (
  /^\d{4}-\d{2}$/.test(
    selectedMonth
  )
) {

  const parts =
    selectedMonth
      .split('-')
      .map(Number);

  year =
    parts[0];

  month =
    parts[1];

} else {

  // Handles browsers returning:
  // "September 2026"

  const parsedMonth =
    new Date(
      `1 ${selectedMonth}`
    );


  if (
    Number.isNaN(
      parsedMonth.getTime()
    )
  ) {

    alert(
      'The selected month could not be read.'
    );

    return;

  }


  year =
    parsedMonth.getFullYear();

  month =
    parsedMonth.getMonth() + 1;

}


const formattedMonth =
  `${year}-${String(
    month
  ).padStart(2, '0')}`;


const lastDay =
  new Date(
    year,
    month,
    0
  ).getDate();


const startDate =
  `${formattedMonth}-01`;


const endDate =
  `${formattedMonth}-${String(
    lastDay
  ).padStart(2, '0')}`;


  

  try {

    setMonthlyReportLoading(true);


    const response =
      await axios.get(
        `/api/management/attendance-weekly?start=${startDate}&end=${endDate}`,
        config
      );


    setMonthlyAttendance(
      response.data.attendance || []
    );


    console.log(
      '✅ Monthly attendance loaded:',
      response.data.attendance || []
    );


  } catch (err) {

    console.error(
      '❌ Monthly attendance report error:',
      err.response?.data ||
      err.message
    );


    setMonthlyAttendance([]);


    alert(
      err.response?.data?.message ||
      'The monthly attendance report could not be loaded.'
    );


  } finally {

    setMonthlyReportLoading(false);

  }

};
// ======================================================
// LOAD HOURS WORKED REPORT
// ======================================================

const fetchHoursWorkedReport = async () => {

  if (
    !hoursWorkedStartDate ||
    !hoursWorkedEndDate
  ) {

    alert(
      'Please select both a start date and an end date.'
    );

    return;

  }


  if (
    hoursWorkedStartDate >
    hoursWorkedEndDate
  ) {

    alert(
      'Start date cannot be after end date.'
    );

    return;

  }


  try {

    setHoursWorkedLoading(true);


    const response =
      await axios.get(
        `/api/management/attendance-weekly?start=${hoursWorkedStartDate}&end=${hoursWorkedEndDate}`,
        config
      );


    const records =
      response.data.attendance || [];


    const employeeMap = {};


    records.forEach(
      (record) => {

        const employeeId =
          record.employee_id;


        if (!employeeMap[employeeId]) {

          employeeMap[employeeId] = {

            employee_id:
              employeeId,

            name:
              record.name ||
              record.email ||
              'Unknown Employee',

            email:
              record.email || '',

            department:
              record.department ||
              'General',

            position:
              record.position ||
              'Employee',

            total_shifts: 0,

            total_hours: 0

          };

        }


        employeeMap[employeeId]
          .total_shifts += 1;


        employeeMap[employeeId]
          .total_hours +=
            Number(
              record.total_hours || 0
            );

      }
    );


    const groupedData =
      Object.values(
        employeeMap
      ).map(
        (employee) => ({

          ...employee,

          total_hours:
            Number(
              employee.total_hours
            )

        })
      );


    groupedData.sort(
      (a, b) =>
        b.total_hours -
        a.total_hours
    );


    setHoursWorkedData(
      groupedData
    );


    console.log(
      '✅ Hours worked report loaded:',
      groupedData
    );


  } catch (err) {

    console.error(
      '❌ Hours worked report error:',
      err.response?.data ||
      err.message
    );


    setHoursWorkedData([]);


    alert(
      err.response?.data?.message ||
      'The hours worked report could not be loaded.'
    );


  } finally {

    setHoursWorkedLoading(false);

  }

};

// ======================================================
// EXPORT HOURS WORKED REPORT TO CSV
// ======================================================

const exportHoursWorkedCSV = () => {

  if (hoursWorkedData.length === 0) {

    alert(
      'There are no hours worked records to export.'
    );

    return;

  }


  const escapeCsvValue = (value) => {

    const text =
      String(value ?? '');

    return `"${text.replace(/"/g, '""')}"`;

  };


  const headers = [
    'Employee',
    'Email',
    'Department',
    'Position',
    'Total Shifts',
    'Total Hours'
  ];


  const rows =
    hoursWorkedData.map(
      (employee) => [

        employee.name || '',

        employee.email || '',

        employee.department || '',

        employee.position || '',

        employee.total_shifts || 0,

        Number(
          employee.total_hours || 0
        ).toFixed(2)

      ]
    );


  const csvContent = [
    headers,
    ...rows
  ]
    .map(
      (row) =>
        row
          .map(escapeCsvValue)
          .join(',')
    )
    .join('\n');


  const blob =
    new Blob(
      [csvContent],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


  link.href = url;

  link.download =
    `Hours_Worked_${hoursWorkedStartDate}_to_${hoursWorkedEndDate}.csv`;


  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(url);

};

// ======================================================
// LOAD ABSENTEEISM REPORT
// ======================================================

const fetchAbsenteeismReport = async () => {

  if (!absenteeismDate) {

    alert(
      'Please select a date.'
    );

    return;

  }


  try {

    setAbsenteeismLoading(true);


    const [
      attendanceResponse,
      employeesResponse,
      leaveResponse
    ] = await Promise.all([

      axios.get(
        `/api/management/attendance-by-date?date=${absenteeismDate}`,
        config
      ),

      axios.get(
        '/api/management/employees',
        config
      ),

      axios.get(
        '/api/tickets/get-leave-requests',
        config
      )

    ]);


    const attendanceRecords =
      attendanceResponse.data.attendance || [];


    const employeeRecords =
      employeesResponse.data.employees || [];


    const leaveRecords =
      leaveResponse.data || [];

      console.log(
  '🧪 Attendance records:',
  attendanceRecords
);

console.log(
  '🧪 Employee IDs:',
  employeeRecords.map(
    (employee) => ({
      id: employee.id,
      name: employee.name
    })
  )
);

console.log(
  '🧪 Attendance employee IDs:',
  attendanceRecords.map(
    (record) => ({
      employee_id:
        record.employee_id,
      name:
        record.name
    })
  )
);


    // ----------------------------------------------
    // ACTIVE EMPLOYEES
    // ----------------------------------------------

    const activeEmployees =
      employeeRecords.filter(
        (employee) => {

          const employmentStatus =
            String(
              employee.employment_status ||
              'Active'
            ).toLowerCase();


          const accountStatus =
            String(
              employee.account_status ||
              'Active'
            ).toLowerCase();


          return (
            employmentStatus === 'active' &&
            accountStatus === 'active'
          );

        }
      );


    // ----------------------------------------------
    // EMPLOYEES WHO CLOCKED IN
    // ----------------------------------------------

    const attendedEmployeeIds =
      new Set(
        attendanceRecords.map(
          (record) =>
            Number(
              record.employee_id
            )
        )
      );


    // ----------------------------------------------
    // EMPLOYEES ON APPROVED LEAVE
    // ----------------------------------------------

    const approvedLeaveEmployeeIds =
      new Set();


    leaveRecords.forEach(
      (leave) => {

        const status =
          String(
            leave.status || ''
          ).toLowerCase();


        if (status !== 'approved') {
          return;
        }


        const startDate =
          String(
            leave.start_date || ''
          ).slice(0, 10);


        const endDate =
          String(
            leave.end_date || ''
          ).slice(0, 10);


        if (
          absenteeismDate >= startDate &&
          absenteeismDate <= endDate
        ) {

          approvedLeaveEmployeeIds.add(
            Number(
              leave.employee_id
            )
          );

        }

      }
    );


    // ----------------------------------------------
    // FIND ABSENT EMPLOYEES
    // ----------------------------------------------

    const absentEmployees =
      activeEmployees.filter(
        (employee) => {

          const employeeId =
            Number(employee.id);


          const attended =
            attendedEmployeeIds.has(
              employeeId
            );


          const onApprovedLeave =
            approvedLeaveEmployeeIds.has(
              employeeId
            );


          return (
            !attended &&
            !onApprovedLeave
          );

        }
      );


    const reportData =
      absentEmployees.map(
        (employee) => ({

          ...employee,

          absence_date:
            absenteeismDate,

          absence_status:
            'Absent',

          reason:
            'No attendance record'

        })
      );


    setAbsenteeismData(
      reportData
    );


    console.log(
      '✅ Absenteeism report loaded:',
      reportData
    );


  } catch (err) {

    console.error(
      '❌ Absenteeism report error:',
      err.response?.data ||
      err.message
    );


    setAbsenteeismData([]);


    alert(
      err.response?.data?.message ||
      'The absenteeism report could not be loaded.'
    );


  } finally {

    setAbsenteeismLoading(false);

  }

};

// ======================================================
// EXPORT MONTHLY ATTENDANCE REPORT TO CSV
// ======================================================

const exportMonthlyAttendanceCSV = () => {

  if (monthlyAttendance.length === 0) {

    alert(
      'There are no monthly attendance records to export.'
    );

    return;

  }


  const escapeCsvValue = (value) => {

    const text =
      String(value ?? '');

    return `"${text.replace(/"/g, '""')}"`;

  };


  const headers = [
    'Date',
    'Employee',
    'Email',
    'Department',
    'Position',
    'Clock In',
    'Clock Out',
    'Total Hours',
    'Status'
  ];


  const rows =
    monthlyAttendance.map(
      (record) => [

        formatDate(
          record.attendance_date ||
          record.clock_in
        ),

        record.name || '',

        record.email || '',

        record.department || '',

        record.position || '',

        record.clock_in
          ? formatTime(
              record.clock_in
            )
          : '',

        record.clock_out
          ? formatTime(
              record.clock_out
            )
          : 'Still Working',

        Number(
          record.total_hours || 0
        ).toFixed(2),

        record.status || ''

      ]
    );


  const csvContent = [
    headers,
    ...rows
  ]
    .map(
      (row) =>
        row
          .map(escapeCsvValue)
          .join(',')
    )
    .join('\n');


  const blob =
    new Blob(
      [csvContent],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


  link.href = url;

  link.download =
    `Monthly_Attendance_${selectedMonth}.csv`;


  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

};

// ======================================================
// EXPORT WEEKLY ATTENDANCE REPORT TO CSV
// ======================================================

const exportWeeklyAttendanceCSV = () => {

  if (weeklyAttendance.length === 0) {

    alert(
      'There are no weekly attendance records to export.'
    );

    return;

  }


  const escapeCsvValue = (value) => {

    const text =
      String(value ?? '');

    return `"${text.replace(/"/g, '""')}"`;

  };


  const headers = [
    'Date',
    'Employee',
    'Email',
    'Department',
    'Position',
    'Clock In',
    'Clock Out',
    'Total Hours',
    'Status'
  ];


  const rows =
    weeklyAttendance.map(
      (record) => [

        formatDate(
          record.attendance_date ||
          record.clock_in
        ),

        record.name || '',

        record.email || '',

        record.department || '',

        record.position || '',

        record.clock_in
          ? formatTime(
              record.clock_in
            )
          : '',

        record.clock_out
          ? formatTime(
              record.clock_out
            )
          : 'Still Working',

        Number(
          record.total_hours || 0
        ).toFixed(2),

        record.status || ''

      ]
    );


  const csvContent = [
    headers,
    ...rows
  ]
    .map(
      (row) =>
        row
          .map(escapeCsvValue)
          .join(',')
    )
    .join('\n');


  const blob =
    new Blob(
      [csvContent],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


  link.href = url;

  link.download =
    `Weekly_Attendance_${weeklyStartDate}_to_${weeklyEndDate}.csv`;


  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

};

  // ======================================================
  // AUTOMATIC REFRESH
  // ======================================================

  useEffect(() => {

    fetchDashboardData();

    fetchAttendanceByDate(
      getLocalDateString()
    );


    const interval =
      setInterval(
        fetchDashboardData,
        30000
      );


    return () => {

      clearInterval(
        interval
      );

    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  


  // ======================================================
  // UPDATE LEAVE STATUS
  // ======================================================

  const updateLeaveStatus = (
    id,
    status
  ) => {

    const originalRequests =
      [...leaveRequests];


    setLeaveRequests(
      leaveRequests.filter(
        (request) =>
          request.id !== id
      )
    );


    axios.put(
      '/api/tickets/update-leave-status',
      {
        id,
        status
      },
      config
    )

      .then(() => {

        // No success popup.
        fetchDashboardData();

      })

      .catch((err) => {

        console.error(
          'Leave update failed:',
          err.response?.status,
          err.response?.data ||
          err.message
        );


        const errorData =
          err.response?.data || {};


        setLeaveAlert({

          conflict:
            errorData.conflict === true,

          title:
            errorData.conflict
              ? 'Leave Approval Blocked'
              : 'Unable to Update Leave',

          message:
            errorData.message ||
            errorData.error ||
            err.message ||
            'Something went wrong while updating the leave request.',

          employeesOff:
            errorData.employees_off,

          totalEmployees:
            errorData.total_employees,

          percentage:
            errorData.percentage,

          allowedPercentage:
            errorData.allowed_percentage ||
            30

        });


        setLeaveRequests(
          originalRequests
        );

      });

  };


  // ======================================================
  // LEAVE ANALYTICS
  // ======================================================

  const totalLeaveCount =
    leaveRequests.length;


  const pendingLeaveCount =
    leaveRequests.filter(
      (request) =>
        (request.status || '')
          .toLowerCase() ===
        'pending'
    ).length;


  const approvedLeaveCount =
    leaveRequests.filter(
      (request) =>
        (request.status || '')
          .toLowerCase() ===
        'approved'
    ).length;


  const deniedLeaveCount =
    leaveRequests.filter(
      (request) => {

        const status =
          (request.status || '')
            .toLowerCase();

        return (
          status === 'denied' ||
          status === 'rejected'
        );

      }
    ).length;


  const getLeavePercentage = (
    amount
  ) => {

    if (
      totalLeaveCount === 0
    ) {

      return 0;

    }


    return Math.round(
      (
        amount /
        totalLeaveCount
      ) * 100
    );

  };


  // ======================================================
  // DATE / TIME FORMAT
  // ======================================================

  const formatDateTime = (
    value
  ) => {

    if (!value) {
      return 'N/A';
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    return date.toLocaleString();

  };


  const formatDate = (
    value
  ) => {

    if (!value) {
      return 'N/A';
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    return date.toLocaleDateString();

  };
  


  const formatTime = (
    value
  ) => {

    if (!value) {
      return '—';
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    return date.toLocaleTimeString(
      [],
      {
        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );

  };


  // ======================================================
  // PROFILE PHOTO
  // ======================================================

  const getProfilePhoto = (
    staff
  ) => {

    if (!staff) {
      return null;
    }


    const photo =
      staff.profile_photo ||
      staff.profilePhoto ||
      staff.faceReferenceImage ||
      null;


    if (
      !photo ||
      typeof photo !== 'string'
    ) {

      return null;

    }


    if (
      photo.startsWith(
        'data:image'
      )
    ) {

      return photo;

    }


    if (
      photo.startsWith('http://') ||
      photo.startsWith('https://') ||
      photo.startsWith('blob:')
    ) {

      return photo;

    }


    return (
      `data:image/jpeg;base64,${photo}`
    );

  };


  // ======================================================
  // EMPLOYEE DIRECTORY FILTER
  // ======================================================

  const filteredEmployees =
    employees.filter(
      (employee) => {

        const search =
          employeeSearch
            .toLowerCase()
            .trim();


        if (!search) {
          return true;
        }


        return (

          (employee.name || '')
            .toLowerCase()
            .includes(search) ||

          (employee.email || '')
            .toLowerCase()
            .includes(search) ||

          (employee.department || '')
            .toLowerCase()
            .includes(search) ||

          (employee.position || '')
            .toLowerCase()
            .includes(search) ||

          (employee.role || '')
            .toLowerCase()
            .includes(search) ||

          (employee.idNumber || '')
            .toLowerCase()
            .includes(search) ||

          String(
            employee.id || ''
          ).includes(search)

        );

      }
    );


  // ======================================================
// OPEN EMPLOYEE FILE
// ======================================================

const openEmployeeFile = async (
  employee
) => {

  setSelectedEmployee(
    employee
  );

  setIsEditingEmployee(
    false
  );

  // Clear documents from previously opened employee
  setEmployeeDocuments([]);

  setDocumentsLoading(true);

  try {

    const response =
      await axios.get(
        `/api/documents/employee/${employee.id}`,
        config
      );

    const documents =
      response.data.documents || [];

    setEmployeeDocuments(
      documents
    );

    console.log(
      '✅ Employee documents loaded:',
      documents
    );

  } catch (err) {

    console.error(
      '❌ Employee documents error:',
      err.response?.data ||
      err.message
    );

    setEmployeeDocuments([]);

  } finally {

    setDocumentsLoading(false);

  }

};


// ======================================================
// UPLOAD EMPLOYEE DOCUMENT
// ======================================================

const uploadEmployeeDocument = async () => {

  if (!selectedEmployee) {
    return;
  }

  if (
    !documentUploadForm.document_type.trim()
  ) {

    setLeaveAlert({
      conflict: false,
      title: 'Document Type Required',
      message:
        'Please enter a document type before uploading.'
    });

    return;
  }

  if (!documentUploadForm.file) {

    setLeaveAlert({
      conflict: false,
      title: 'Document Required',
      message:
        'Please choose a file to upload.'
    });

    return;
  }


  // --------------------------------------------------
  // FILE SIZE CHECK
  // --------------------------------------------------

  const maxFileSize =
    5 * 1024 * 1024;

  if (
    documentUploadForm.file.size >
    maxFileSize
  ) {

    setLeaveAlert({
      conflict: false,
      title: 'File Too Large',
      message:
        'Please choose a file smaller than 5 MB.'
    });

    return;
  }


  setUploadingDocument(true);


  try {

    // --------------------------------------------------
    // CONVERT FILE TO BASE64 / DATA URL
    // --------------------------------------------------

    const fileData =
      await new Promise(
        (
          resolve,
          reject
        ) => {

          const reader =
            new FileReader();

          reader.onload = () => {
            resolve(
              reader.result
            );
          };

          reader.onerror = () => {
            reject(
              new Error(
                'Unable to read the selected file.'
              )
            );
          };

          reader.readAsDataURL(
            documentUploadForm.file
          );

        }
      );


    // --------------------------------------------------
    // SEND TO BACKEND
    // --------------------------------------------------

    await axios.post(
      '/api/documents/upload',
      {
        employee_id:
          selectedEmployee.id,

        document_type:
          documentUploadForm
            .document_type
            .trim(),

        file_path:
          fileData
      },
      config
    );


    // --------------------------------------------------
    // RELOAD DOCUMENT LIST
    // --------------------------------------------------

    const response =
      await axios.get(
        `/api/documents/employee/${selectedEmployee.id}`,
        config
      );


    setEmployeeDocuments(
      response.data.documents || []
    );


    // --------------------------------------------------
    // RESET FORM
    // --------------------------------------------------

    setDocumentUploadForm({
      document_type: '',
      file: null
    });
    if (documentFileInputRef.current) {
  documentFileInputRef.current.value = '';
}


    console.log(
      '✅ Document uploaded successfully.'
    );


  } catch (err) {

    console.error(
      '❌ Document upload failed:',
      err.response?.data ||
      err.message
    );


    setLeaveAlert({
      conflict: false,
      title: 'Document Upload Failed',
      message:
        err.response?.data?.message ||
        err.message ||
        'The document could not be uploaded.'
    });


  } finally {

    setUploadingDocument(false);

  }

};

  // ======================================================
  // CLOSE EMPLOYEE FILE
  // ======================================================

  const closeEmployeeFile = () => {

    setSelectedEmployee(
      null
    );

    setIsEditingEmployee(
      false
    );

  };

  // ======================================================
// DELETE EMPLOYEE DOCUMENT
// ======================================================

const deleteEmployeeDocument = async (
  document
) => {

  const confirmed =
    window.confirm(
      `Are you sure you want to delete "${document.document_type}"?`
    );

  if (!confirmed) {
    return;
  }


  try {

    await axios.delete(
      `/api/documents/${document.id}`,
      config
    );


    setEmployeeDocuments(
      (currentDocuments) =>
        currentDocuments.filter(
          (item) =>
            item.id !== document.id
        )
    );


    console.log(
      '✅ Document deleted successfully.'
    );


  } catch (err) {

    console.error(
      '❌ Document deletion failed:',
      err.response?.data ||
      err.message
    );


    setLeaveAlert({
      conflict: false,
      title: 'Document Delete Failed',
      message:
        err.response?.data?.message ||
        err.message ||
        'The document could not be deleted.'
    });

  }

};

  // ======================================================
  // START EDITING EMPLOYEE
  // ======================================================

  const startEditingEmployee = () => {

    if (!selectedEmployee) {
      return;
    }


    setEmployeeEditForm({

      department:
        selectedEmployee.department ||
        'General',

      position:
        selectedEmployee.position ||
        'Employee',

      employment_status:
        selectedEmployee.employment_status ||
        'Active',

      account_status:
        selectedEmployee.account_status ||
        'Active'

    });


    setIsEditingEmployee(
      true
    );

  };


  // ======================================================
  // SAVE EMPLOYEE CHANGES
  // ======================================================

  const saveEmployeeChanges =
    async () => {

      if (!selectedEmployee) {
        return;
      }


      try {

        setSavingEmployee(
          true
        );


        await axios.put(

          `/api/management/employees/${selectedEmployee.id}`,

          employeeEditForm,

          config

        );


        const updatedEmployee = {

          ...selectedEmployee,

          ...employeeEditForm

        };


        setSelectedEmployee(
          updatedEmployee
        );


        setEmployees(
          (currentEmployees) =>
            currentEmployees.map(
              (employee) =>
                employee.id ===
                selectedEmployee.id
                  ? updatedEmployee
                  : employee
            )
        );


        setIsEditingEmployee(
          false
        );


        await fetchDashboardData();


      } catch (err) {

        console.error(
          '❌ Employee update failed:',
          err.response?.data ||
          err.message
        );


        setLeaveAlert({

          conflict: false,

          title:
            'Employee Update Failed',

          message:
            err.response?.data?.message ||
            err.response?.data?.error ||
            'Unable to update the employee record.'

        });


      } finally {

        setSavingEmployee(
          false
        );

      }

    };


  // ======================================================
  // STYLES
  // ======================================================

  const pageStyle = {

    minHeight:
      '100vh',

    width:
      '100%',

    backgroundImage: `
      linear-gradient(
        rgba(248, 250, 252, 0.80),
        rgba(241, 245, 249, 0.90)
      ),
      url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85")
    `,

    backgroundSize:
      'cover',

    backgroundPosition:
      'center',

    backgroundAttachment:
      'fixed',

    padding:
      '45px 20px 70px 20px',

    boxSizing:
      'border-box',

    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  };


  const shellStyle = {

    maxWidth:
      '1250px',

    margin:
      '0 auto'

  };


  const glassCard = {

    background:
      'rgba(255, 255, 255, 0.72)',

    backdropFilter:
      'blur(20px)',

    WebkitBackdropFilter:
      'blur(20px)',

    border:
      '1px solid rgba(255,255,255,0.85)',

    borderRadius:
      '24px',

    boxShadow:
      '0 18px 45px rgba(15, 23, 42, 0.10)'

  };


  const sectionCard = {

    ...glassCard,

    padding:
      '30px',

    marginBottom:
      '28px'

  };


  const sectionTitle = {

    margin:
      0,

    fontSize:
      '1.45rem',

    fontWeight:
      '900',

    color:
      '#0f172a',

    letterSpacing:
      '-0.02em'

  };


  const sectionSubText = {

    marginTop:
      '6px',

    color:
      '#64748b',

    fontSize:
      '0.92rem',

    fontWeight:
      '500'

  };


  const tableHeaderStyle = {

    padding:
      '15px 16px',

    textAlign:
      'left',

    color:
      '#475569',

    background:
      'rgba(248,250,252,0.85)',

    fontWeight:
      '900',

    fontSize:
      '0.75rem',

    textTransform:
      'uppercase',

    letterSpacing:
      '0.7px',

    borderBottom:
      '1px solid #e2e8f0'

  };


  const tableCellStyle = {

    padding:
      '18px 16px',

    borderBottom:
      '1px solid #edf2f7',

    color:
      '#0f172a',

    fontSize:
      '0.9rem',

    verticalAlign:
      'middle'

  };


  const inputStyle = {

    width:
      '100%',

    padding:
      '12px 14px',

    borderRadius:
      '12px',

    border:
      '1px solid #cbd5e1',

    background:
      '#ffffff',

    color:
      '#0f172a',

    fontWeight:
      '700',

    outline:
      'none',

    boxSizing:
      'border-box'

  };


  const labelStyle = {

    display:
      'block',

    color:
      '#64748b',

    fontSize:
      '0.7rem',

    fontWeight:
      '900',

    marginBottom:
      '7px',

    textTransform:
      'uppercase',

    letterSpacing:
      '0.4px'

  };


  // ======================================================
  // PAGE
  // ======================================================

  return (

    <div style={pageStyle}>


      {/* ================================================= */}
      {/* EMPLOYEE PERSONNEL FILE MODAL */}
      {/* ================================================= */}

      {selectedEmployee && (

        <div
          style={{
            position:
              'fixed',

            inset:
              0,

            background:
              'rgba(15,23,42,0.45)',

            backdropFilter:
              'blur(7px)',

            WebkitBackdropFilter:
              'blur(7px)',

            zIndex:
              99998,

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            padding:
              '20px'
          }}
        >

          <div
            style={{
              width:
                '100%',

              maxWidth:
                '650px',

              maxHeight:
                '88vh',

              overflowY:
                'auto',

              background:
                'rgba(255,255,255,0.97)',

              border:
                '1px solid rgba(255,255,255,0.9)',

              borderRadius:
                '24px',

              boxShadow:
                '0 30px 80px rgba(15,23,42,0.28)',

              padding:
                '30px',

              boxSizing:
                'border-box'
            }}
          >


            {/* TOP */}

            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'flex-start',

                gap:
                  '20px',

                marginBottom:
                  '25px'
              }}
            >

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '15px',

                  alignItems:
                    'center'
                }}
              >

                <div
                  style={{
                    width:
                      '68px',

                    height:
                      '68px',

                    minWidth:
                      '68px',

                    borderRadius:
                      '50%',

                    overflow:
                      'hidden',

                    background:
                      'linear-gradient(135deg,#fed7aa,#fdba74)',

                    position:
                      'relative',

                    display:
                      'flex',

                    alignItems:
                      'center',

                    justifyContent:
                      'center'
                  }}
                >

                  <span>
                    👤
                  </span>


                  {getProfilePhoto(
                    selectedEmployee
                  ) && (

                    <img
                      src={
                        getProfilePhoto(
                          selectedEmployee
                        )
                      }
                      alt={
                        selectedEmployee.name ||
                        'Employee'
                      }
                      style={{
                        position:
                          'absolute',

                        top:
                          0,

                        left:
                          0,

                        width:
                          '100%',

                        height:
                          '100%',

                        objectFit:
                          'cover'
                      }}
                      onError={(
                        event
                      ) => {

                        event.currentTarget.style.display =
                          'none';

                      }}
                    />

                  )}

                </div>


                <div>

                  <div
                    style={{
                      color:
                        '#ea580c',

                      fontWeight:
                        '900',

                      fontSize:
                        '0.7rem',

                      textTransform:
                        'uppercase',

                      letterSpacing:
                        '1px'
                    }}
                  >

                    Employee Personnel File

                  </div>


                  <h2
                    style={{
                      margin:
                        '5px 0 0 0',

                      color:
                        '#0f172a',

                      fontWeight:
                        '900'
                    }}
                  >

                    {
                      selectedEmployee.name ||
                      'Employee'
                    }

                  </h2>


                  <div
                    style={{
                      color:
                        '#64748b',

                      marginTop:
                        '4px'
                    }}
                  >

                    Employee ID: {
                      selectedEmployee.id
                    }

                  </div>

                </div>

              </div>


              <button
                onClick={
                  closeEmployeeFile
                }
                style={{
                  border:
                    'none',

                  background:
                    '#f1f5f9',

                  color:
                    '#475569',

                  width:
                    '38px',

                  height:
                    '38px',

                  minWidth:
                    '38px',

                  borderRadius:
                    '50%',

                  fontWeight:
                    '900',

                  cursor:
                    'pointer',

                  fontSize:
                    '1rem'
                }}
              >

                ✕

              </button>

            </div>


            {/* ================================================= */}
            {/* VIEW MODE */}
            {/* ================================================= */}

            {!isEditingEmployee ? (

              <>

                <div
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(220px, 1fr))',

                    gap:
                      '14px'
                  }}
                >

                  {[
                    [
                      'ID Number',
                      selectedEmployee.idNumber ||
                      'Not provided'
                    ],

                    [
                      'Email',
                      selectedEmployee.email ||
                      'Not provided'
                    ],

                    [
                      'Phone',
                      selectedEmployee.phone ||
                      'Not provided'
                    ],

                    [
                      'Department',
                      selectedEmployee.department ||
                      'General'
                    ],

                    [
                      'Position',
                      selectedEmployee.position ||
                      'Employee'
                    ],

                    [
                      'System Role',
                      selectedEmployee.role ||
                      'employee'
                    ],

                    [
                      'Employment Status',
                      selectedEmployee.employment_status ||
                      'Unknown'
                    ],

                    [
                      'Account Status',
                      selectedEmployee.account_status ||
                      'Unknown'
                    ]

                  ].map(
                    ([label, value]) => (

                      <div
                        key={
                          label
                        }
                        style={{
                          padding:
                            '16px',

                          background:
                            '#f8fafc',

                          border:
                            '1px solid #e2e8f0',

                          borderRadius:
                            '14px'
                        }}
                      >

                        <div
                          style={{
                            color:
                              '#94a3b8',

                            fontWeight:
                              '900',

                            fontSize:
                              '0.68rem',

                            textTransform:
                              'uppercase'
                          }}
                        >

                          {label}

                        </div>


                        <div
                          style={{
                            color:
                              '#0f172a',

                            fontWeight:
                              '800',

                            marginTop:
                              '6px',

                            wordBreak:
                              'break-word'
                          }}
                        >

                          {value}

                        </div>

                      </div>

                    )
                  )}

                </div>


                
                  {/* ================================================= */}
{/* EMPLOYEE DOCUMENTS */}
{/* ================================================= */}

<div
  style={{
    marginTop: '24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(15,23,42,0.05)'
  }}
>

  {/* HEADER */}

  <div
    style={{
      padding: '17px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '15px',
      borderBottom: '1px solid #f1f5f9',
      background: '#ffffff'
    }}
  >

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >

      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '11px',
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem'
        }}
      >
        📁
      </div>


      <div>

        <div
          style={{
            color: '#0f172a',
            fontWeight: '900',
            fontSize: '0.93rem'
          }}
        >
          Employee Documents
        </div>


        <div
          style={{
            color: '#64748b',
            fontSize: '0.75rem',
            marginTop: '3px'
          }}
        >
          Personnel records and supporting files
        </div>

      </div>

    </div>


    <div
      style={{
        minWidth: '30px',
        height: '30px',
        padding: '0 8px',
        borderRadius: '999px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        color: '#ea580c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '900',
        fontSize: '0.75rem'
      }}
    >
      {employeeDocuments.length}
    </div>

  </div>

  {/* ================================================= */}
{/* DOCUMENT UPLOAD FORM */}
{/* ================================================= */}

<div
  style={{
    padding: '16px 17px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  }}
>

  <div
    style={{
      color: '#475569',
      fontWeight: '900',
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginBottom: '12px'
    }}
  >
    Add Document
  </div>


  <div
    style={{
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '10px'
    }}
  >

    {/* DOCUMENT TYPE */}

    <select
      value={
        documentUploadForm.document_type
      }
      onChange={(event) => {

        setDocumentUploadForm({
          ...documentUploadForm,

          document_type:
            event.target.value
        });

      }}
      style={{
        width: '100%',
        padding: '11px 12px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#334155',
        fontWeight: '700',
        fontSize: '0.8rem',
        outline: 'none'
      }}
    >

      <option value="">
        Select document type
      </option>

      <option value="ID Document">
        ID Document
      </option>

      <option value="Employment Contract">
        Employment Contract
      </option>

      <option value="Certificate">
        Certificate
      </option>

      <option value="Qualification">
        Qualification
      </option>

      <option value="Medical Certificate">
        Medical Certificate
      </option>

      <option value="Driver's Licence">
        Driver&apos;s Licence
      </option>

      <option value="Other">
        Other
      </option>

    </select>


    {/* EXPIRY DATE */}

    <input
      type="date"
      value={
        documentUploadForm.expiry_date
      }
      onChange={(event) => {

        setDocumentUploadForm({
          ...documentUploadForm,

          expiry_date:
            event.target.value
        });

      }}
      title="Optional expiry date"
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#334155',
        fontWeight: '700',
        fontSize: '0.8rem',
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />

  </div>


  {/* FILE */}

  <div
    style={{
      marginTop: '10px'
    }}
  >

    <input
      type="file"
      ref={documentFileInputRef}
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      onChange={(event) => {

        const file =
          event.target.files?.[0] ||
          null;

        setDocumentUploadForm({
          ...documentUploadForm,
          file: file
        });

      }}
      style={{
        width: '100%',
        padding: '10px',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        color: '#475569',
        fontSize: '0.78rem',
        boxSizing: 'border-box'
      }}
    />

  </div>


  {/* SELECTED FILE */}

  {documentUploadForm.file && (

    <div
      style={{
        marginTop: '8px',
        color: '#64748b',
        fontSize: '0.72rem',
        fontWeight: '700',
        overflowWrap: 'anywhere'
      }}
    >
      Selected: {
        documentUploadForm.file.name
      }
    </div>

  )}


  {/* UPLOAD BUTTON */}

  <button
    type="button"
    disabled={
      uploadingDocument
    }
    onClick={
      uploadEmployeeDocument
    }
    style={{
      width: '100%',
      marginTop: '12px',
      padding: '11px',
      border: 'none',
      borderRadius: '10px',

      background:
        uploadingDocument
          ? '#cbd5e1'
          : 'linear-gradient(135deg,#f97316,#ea580c)',

      color: '#ffffff',
      fontWeight: '900',
      fontSize: '0.8rem',

      cursor:
        uploadingDocument
          ? 'not-allowed'
          : 'pointer',

      boxShadow:
        uploadingDocument
          ? 'none'
          : '0 6px 14px rgba(249,115,22,0.18)'
    }}
  >

    {
      uploadingDocument
        ? 'Uploading...'
        : 'Upload Document'
    }

  </button>

</div>




  {/* DOCUMENT LIST */}

  <div
    style={{
      padding: '13px'
    }}
  >

    {documentsLoading ? (

      <div
        style={{
          padding: '22px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.82rem',
          fontWeight: '700'
        }}
      >
        Loading documents...
      </div>

    ) : employeeDocuments.length > 0 ? (

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '9px'
        }}
      >

        {employeeDocuments.map((document) => (

          <div
            key={document.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px',
              padding: '13px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}
          >

            {/* LEFT */}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                minWidth: 0
              }}
            >

              <div
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem'
                }}
              >
                📄
              </div>


              <div
                style={{
                  minWidth: 0
                }}
              >

                <div
                  style={{
                    color: '#0f172a',
                    fontWeight: '850',
                    fontSize: '0.84rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {
                    document.document_type ||
                    'Document'
                  }
                </div>


               

              </div>

            </div>


            {/* VIEW */}

            <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}
>

  <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}
>

  <a
    href={document.file_path}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      textDecoration: 'none',
      padding: '8px 12px',
      borderRadius: '10px',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      color: '#334155',
      fontWeight: '900',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap'
    }}
  >
    View
  </a>

  <button
    type="button"
    onClick={() =>
      deleteEmployeeDocument(document)
    }
    style={{
      padding: '8px 12px',
      borderRadius: '10px',
      background: '#fff1f2',
      border: '1px solid #fecdd3',
      color: '#be123c',
      fontWeight: '900',
      fontSize: '0.75rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }}
  >
    Delete
  </button>

</div>


  

</div>

          </div>

        ))}

      </div>

    ) : (

      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          border: '1px dashed #cbd5e1',
          borderRadius: '12px',
          color: '#64748b',
          fontWeight: '700',
          fontSize: '0.8rem'
        }}
      >
        No documents have been uploaded yet.
      </div>

    )}

  </div>

</div>


{/* ================================================= */}
{/* EDIT EMPLOYEE BUTTON */}
{/* ================================================= */}

<button
  onClick={
    startEditingEmployee
  }
  style={{
    width: '100%',
    marginTop: '18px',
    padding: '13px',
    border: 'none',
    borderRadius: '13px',
    background:
      'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#ffffff',
    fontWeight: '900',
    fontSize: '0.86rem',
    cursor: 'pointer',
    boxShadow:
      '0 8px 18px rgba(249,115,22,0.20)'
  }}
>
  Edit Employee
</button>

              </>

            ) : (

              /* ================================================= */
              /* EDIT MODE */
              /* ================================================= */

              <>

                <div
                  style={{
                    background:
                      '#fff7ed',

                    border:
                      '1px solid #fed7aa',

                    borderRadius:
                      '14px',

                    padding:
                      '14px 16px',

                    marginBottom:
                      '20px',

                    color:
                      '#9a3412',

                    fontWeight:
                      '700',

                    fontSize:
                      '0.82rem',

                    lineHeight:
                      '1.5'
                  }}
                >

                  You are editing this employee's
                  municipal personnel record. System
                  role changes are kept separate for
                  security.

                </div>


                <div
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(220px, 1fr))',

                    gap:
                      '16px'
                  }}
                >


                  {/* DEPARTMENT */}

                  <div>

                    <label style={labelStyle}>
                      Department
                    </label>

                    <input
                      type="text"
                      value={
                        employeeEditForm.department
                      }
                      onChange={(
                        event
                      ) => {

                        setEmployeeEditForm({
                          ...employeeEditForm,

                          department:
                            event.target.value
                        });

                      }}
                      style={inputStyle}
                      placeholder="Department"
                    />

                  </div>


                  {/* POSITION */}

                  <div>

                    <label style={labelStyle}>
                      Position
                    </label>

                    <input
                      type="text"
                      value={
                        employeeEditForm.position
                      }
                      onChange={(
                        event
                      ) => {

                        setEmployeeEditForm({
                          ...employeeEditForm,

                          position:
                            event.target.value
                        });

                      }}
                      style={inputStyle}
                      placeholder="Position"
                    />

                  </div>


                  {/* EMPLOYMENT STATUS */}

                  <div>

                    <label style={labelStyle}>
                      Employment Status
                    </label>

                    <select
                      value={
                        employeeEditForm
                          .employment_status
                      }
                      onChange={(
                        event
                      ) => {

                        setEmployeeEditForm({
                          ...employeeEditForm,

                          employment_status:
                            event.target.value
                        });

                      }}
                      style={inputStyle}
                    >

                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>

                      <option value="Suspended">
                        Suspended
                      </option>

                      <option value="Terminated">
                        Terminated
                      </option>

                    </select>

                  </div>


                  {/* ACCOUNT STATUS */}

                  <div>

                    <label style={labelStyle}>
                      Account Status
                    </label>

                    <select
                      value={
                        employeeEditForm
                          .account_status
                      }
                      onChange={(
                        event
                      ) => {

                        setEmployeeEditForm({
                          ...employeeEditForm,

                          account_status:
                            event.target.value
                        });

                      }}
                      style={inputStyle}
                    >

                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>

                      <option value="Suspended">
                        Suspended
                      </option>

                    </select>

                  </div>

                </div>


                {/* READ ONLY DETAILS */}

                <div
                  style={{
                    marginTop:
                      '20px',

                    padding:
                      '16px',

                    background:
                      '#f8fafc',

                    border:
                      '1px solid #e2e8f0',

                    borderRadius:
                      '14px'
                  }}
                >

                  <div
                    style={{
                      color:
                        '#64748b',

                      fontSize:
                        '0.7rem',

                      fontWeight:
                        '900',

                      textTransform:
                        'uppercase',

                      marginBottom:
                        '8px'
                    }}
                  >

                    Read-only information

                  </div>


                  <div
                    style={{
                      color:
                        '#334155',

                      fontSize:
                        '0.85rem',

                      lineHeight:
                        '1.7'
                    }}
                  >

                    <strong>
                      ID Number:
                    </strong>{' '}

                    {
                      selectedEmployee.idNumber ||
                      'Not provided'
                    }

                    <br />


                    <strong>
                      Email:
                    </strong>{' '}

                    {
                      selectedEmployee.email ||
                      'Not provided'
                    }

                    <br />


                    <strong>
                      Phone:
                    </strong>{' '}

                    {
                      selectedEmployee.phone ||
                      'Not provided'
                    }

                    <br />


                    <strong>
                      System Role:
                    </strong>{' '}

                    {
                      selectedEmployee.role ||
                      'employee'
                    }

                  </div>

                </div>


                {/* ACTION BUTTONS */}

                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '12px',

                    marginTop:
                      '22px'
                  }}
                >

                  <button
                    disabled={
                      savingEmployee
                    }
                    onClick={() =>
                      setIsEditingEmployee(
                        false
                      )
                    }
                    style={{
                      flex:
                        1,

                      padding:
                        '13px',

                      borderRadius:
                        '13px',

                      border:
                        '1px solid #cbd5e1',

                      background:
                        '#ffffff',

                      color:
                        '#475569',

                      fontWeight:
                        '900',

                      cursor:
                        savingEmployee
                          ? 'not-allowed'
                          : 'pointer'
                    }}
                  >

                    Cancel

                  </button>


                  <button
                    disabled={
                      savingEmployee
                    }
                    onClick={
                      saveEmployeeChanges
                    }
                    style={{
                      flex:
                        1,

                      padding:
                        '13px',

                      borderRadius:
                        '13px',

                      border:
                        'none',

                      background:
                        'linear-gradient(135deg, #16a34a, #15803d)',

                      color:
                        '#ffffff',

                      fontWeight:
                        '900',

                      cursor:
                        savingEmployee
                          ? 'not-allowed'
                          : 'pointer',

                      opacity:
                        savingEmployee
                          ? 0.7
                          : 1,

                      boxShadow:
                        '0 8px 20px rgba(22,163,74,0.20)'
                    }}
                  >

                    {
                      savingEmployee
                        ? 'Saving...'
                        : 'Save Changes'
                    }

                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      )}


      {/* ================================================= */}
      {/* LEAVE / ERROR MODAL */}
      {/* ================================================= */}

      {leaveAlert && (

        <div
          style={{
            position:
              'fixed',

            top:
              0,

            left:
              0,

            right:
              0,

            bottom:
              0,

            background:
              'rgba(15, 23, 42, 0.45)',

            backdropFilter:
              'blur(6px)',

            WebkitBackdropFilter:
              'blur(6px)',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            padding:
              '20px',

            zIndex:
              99999
          }}
        >

          <div
            style={{
              width:
                '100%',

              maxWidth:
                '470px',

              background:
                'rgba(255,255,255,0.96)',

              border:
                leaveAlert.conflict
                  ? '1px solid #fed7aa'
                  : '1px solid #fecaca',

              borderRadius:
                '24px',

              boxShadow:
                '0 30px 70px rgba(15,23,42,0.25)',

              padding:
                '30px',

              textAlign:
                'center'
            }}
          >

            <div
              style={{
                width:
                  '64px',

                height:
                  '64px',

                margin:
                  '0 auto 18px auto',

                borderRadius:
                  '50%',

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                background:
                  leaveAlert.conflict
                    ? '#fff7ed'
                    : '#fef2f2',

                color:
                  leaveAlert.conflict
                    ? '#ea580c'
                    : '#dc2626',

                fontSize:
                  '1.8rem',

                fontWeight:
                  '900',

                border:
                  leaveAlert.conflict
                    ? '1px solid #fed7aa'
                    : '1px solid #fecaca'
              }}
            >

              !

            </div>


            <h2
              style={{
                margin:
                  0,

                color:
                  '#0f172a',

                fontSize:
                  '1.45rem',

                fontWeight:
                  '900'
              }}
            >

              {leaveAlert.title}

            </h2>


            <p
              style={{
                color:
                  '#64748b',

                lineHeight:
                  '1.6',

                margin:
                  '12px 0 20px 0',

                fontSize:
                  '0.92rem'
              }}
            >

              {leaveAlert.message}

            </p>


            {leaveAlert.conflict && (

              <div
                style={{
                  background:
                    '#fff7ed',

                  border:
                    '1px solid #fed7aa',

                  borderRadius:
                    '16px',

                  padding:
                    '18px',

                  marginBottom:
                    '22px',

                  textAlign:
                    'left'
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    marginBottom:
                      '12px'
                  }}
                >

                  <span
                    style={{
                      color:
                        '#64748b',

                      fontWeight:
                        '700'
                    }}
                  >

                    Employees off

                  </span>


                  <strong
                    style={{
                      color:
                        '#0f172a'
                    }}
                  >

                    {
                      leaveAlert.employeesOff
                    }
                    {' / '}
                    {
                      leaveAlert.totalEmployees
                    }

                  </strong>

                </div>


                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    marginBottom:
                      '12px'
                  }}
                >

                  <span
                    style={{
                      color:
                        '#64748b',

                      fontWeight:
                        '700'
                    }}
                  >

                    Workforce unavailable

                  </span>


                  <strong
                    style={{
                      color:
                        '#dc2626'
                    }}
                  >

                    {
                      leaveAlert.percentage
                    }%

                  </strong>

                </div>


                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between'
                  }}
                >

                  <span
                    style={{
                      color:
                        '#64748b',

                      fontWeight:
                        '700'
                    }}
                  >

                    Maximum permitted

                  </span>


                  <strong
                    style={{
                      color:
                        '#16a34a'
                    }}
                  >

                    {
                      leaveAlert.allowedPercentage
                    }%

                  </strong>

                </div>

              </div>

            )}


            <button
              onClick={() =>
                setLeaveAlert(
                  null
                )
              }
              style={{
                width:
                  '100%',

                padding:
                  '13px 20px',

                border:
                  'none',

                borderRadius:
                  '13px',

                background:
                  'linear-gradient(135deg, #f97316, #ea580c)',

                color:
                  '#ffffff',

                fontWeight:
                  '900',

                fontSize:
                  '0.9rem',

                cursor:
                  'pointer',

                boxShadow:
                  '0 8px 20px rgba(249,115,22,0.25)'
              }}
            >

              Understood

            </button>

          </div>

        </div>

      )}


      <div style={shellStyle}>


        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div
          style={{
            ...glassCard,

            padding:
              '34px',

            marginBottom:
              '28px',

            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              '20px',

            flexWrap:
              'wrap'
          }}
        >

          <div>

            <div
              style={{
                display:
                  'inline-block',

                background:
                  'rgba(249,115,22,0.10)',

                color:
                  '#ea580c',

                border:
                  '1px solid rgba(249,115,22,0.25)',

                borderRadius:
                  '999px',

                padding:
                  '7px 15px',

                fontWeight:
                  '900',

                fontSize:
                  '0.72rem',

                letterSpacing:
                  '1.1px',

                textTransform:
                  'uppercase',

                marginBottom:
                  '14px'
              }}
            >

              Office of the Premier

            </div>


            <h1
              style={{
                margin:
                  0,

                color:
                  '#0f172a',

                fontSize:
                  '2.45rem',

                fontWeight:
                  '900',

                letterSpacing:
                  '-0.035em'
              }}
            >

              Management Dashboard

            </h1>


            <p
              style={{
                margin:
                  '10px 0 0 0',

                color:
                  '#475569',

                fontSize:
                  '1rem'
              }}
            >

              Provincial workforce oversight,
              attendance and employee administration.

            </p>

          </div>


          <div
            style={{
              background:
                'linear-gradient(135deg, #f97316, #ea580c)',

              color:
                '#ffffff',

              borderRadius:
                '16px',

              padding:
                '14px 20px',

              fontWeight:
                '900',

              boxShadow:
                '0 10px 24px rgba(249,115,22,0.24)',

              fontSize:
                '0.82rem'
            }}
          >

            ADMIN SESSION ACTIVE ●

          </div>

        </div>


{/* ================================================= */}
{/* MANAGEMENT NAVIGATION */}
{/* ================================================= */}

<div
  style={{
    ...glassCard,
    padding: '12px',
    marginBottom: '28px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center'
  }}
>

  {[
    {
      key: 'overview',
      label: 'Overview'
    },
    {
      key: 'attendance',
      label: 'Attendance'
    },
    {
      key: 'reports',
      label: 'Reports'
    },
    {
      key: 'employees',
      label: 'Employees'
    },
    {
      key: 'leave',
      label: 'Leave'
    },
    {
      key: 'audit',
      label: 'Audit Logs'
    }
  ].map((item) => {

    const isActive =
      activeManagementSection ===
      item.key;

    return (

      <button
        key={item.key}
        onClick={() =>
          setActiveManagementSection(
            item.key
          )
        }
        style={{
          padding: '11px 17px',
          borderRadius: '12px',

          border:
            isActive
              ? '1px solid #f97316'
              : '1px solid #e2e8f0',

          background:
            isActive
              ? 'linear-gradient(135deg, #f97316, #ea580c)'
              : '#ffffff',

          color:
            isActive
              ? '#ffffff'
              : '#475569',

          fontWeight: '900',
          fontSize: '0.82rem',
          cursor: 'pointer',

          boxShadow:
            isActive
              ? '0 7px 16px rgba(249,115,22,0.20)'
              : 'none',

          transition:
            'all 0.2s ease'
        }}
      >
        {item.label}
      </button>

    );

  })}

</div>
{activeManagementSection === 'overview' && (
<>
        {/* ================================================= */}
        {/* DASHBOARD SUMMARY */}
        {/* ================================================= */}

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',

            gap:
              '18px',

            marginBottom:
              '28px'
          }}
        >

          <SummaryCard
            title="Active Staff"
            value={
              liveStaff.length
            }
            text="Currently clocked in"
            textColor="#16a34a"
            cardStyle={glassCard}
          />


          <SummaryCard
            title="Pending Leave"
            value={
              pendingLeaveCount
            }
            text="Awaiting decision"
            textColor="#ea580c"
            cardStyle={glassCard}
          />


          <SummaryCard
            title="Feedback Messages"
            value={
              suggestions.length
            }
            text="Staff communication log"
            textColor="#2563eb"
            cardStyle={glassCard}
          />


          <SummaryCard
            title="System Status"
            value="Live"
            text="● Auto refresh every 30 sec"
            textColor="#16a34a"
            cardStyle={glassCard}
          />

        </div>


        {/* ================================================= */}
        {/* TODAY'S WORKFORCE OVERVIEW */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              marginBottom:
                '22px'
            }}
          >

            <h2 style={sectionTitle}>

              Today's Workforce Overview

            </h2>


            <div style={sectionSubText}>

              Current provincial workforce availability for today.

            </div>

          </div>


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',

              gap:
                '16px'
            }}
          >

            <WorkforceCard
              title="Total Employees"
              value={
                workforceOverview.total_employees
              }
              description="Active employee records"
              accent="#475569"
              border="#e2e8f0"
            />


            <WorkforceCard
              title="On Duty"
              value={
                workforceOverview.on_duty
              }
              description="Currently clocked in"
              accent="#16a34a"
              border="#bbf7d0"
            />


            <WorkforceCard
              title="Off Duty"
              value={
                workforceOverview.off_duty
              }
              description="Not currently clocked in"
              accent="#2563eb"
              border="#dbeafe"
            />


            <WorkforceCard
              title="On Leave"
              value={
                workforceOverview.on_leave
              }
              description="Approved leave today"
              accent="#ea580c"
              border="#fed7aa"
            />

          </div>

        </div>

  </>
)}

{activeManagementSection === 'attendance' && (
  <>
        {/* ================================================= */}
        {/* ATTENDANCE REGISTER */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              marginBottom:
                '22px',

              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap:
                '20px',

              flexWrap:
                'wrap'
            }}
          >

            <div>

              <h2 style={sectionTitle}>

                Attendance Register

              </h2>


              <div style={sectionSubText}>

                View employee attendance
                for any selected date.

              </div>

            </div>


            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '10px',

                flexWrap:
                  'wrap'
              }}
            >

              <input
                type="date"
                value={
                  selectedAttendanceDate
                }
                max={
                  getLocalDateString()
                }
                onChange={(
                  event
                ) => {

                  const newDate =
                    event.target.value;


                  setSelectedAttendanceDate(
                    newDate
                  );


                  fetchAttendanceByDate(
                    newDate
                  );

                }}
                style={{
                  padding:
                    '11px 14px',

                  borderRadius:
                    '12px',

                  border:
                    '1px solid #cbd5e1',

                  background:
                    'rgba(255,255,255,0.85)',

                  color:
                    '#0f172a',

                  fontWeight:
                    '800',

                  outline:
                    'none',

                  cursor:
                    'pointer'
                }}
              />


              <button
                onClick={() => {

                  const today =
                    getLocalDateString();


                  setSelectedAttendanceDate(
                    today
                  );


                  fetchAttendanceByDate(
                    today
                  );

                }}
                style={{
                  padding:
                    '11px 17px',

                  borderRadius:
                    '12px',

                  border:
                    'none',

                  background:
                    'linear-gradient(135deg, #f97316, #ea580c)',

                  color:
                    '#ffffff',

                  fontWeight:
                    '900',

                  cursor:
                    'pointer',

                  boxShadow:
                    '0 7px 16px rgba(249,115,22,0.20)'
                }}
              >

                Today

              </button>
              <button
  onClick={
    exportDailyAttendanceCSV
  }
  style={{
    padding: '11px 17px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow:
      '0 6px 14px rgba(15,23,42,0.08)'
  }}
>
  Export CSV
</button>

            </div>

          </div>


          <div
            style={{
              overflowX:
                'auto'
            }}
          >

            {/* ================================================= */}
{/* DAILY ATTENDANCE REPORT SUMMARY */}
{/* ================================================= */}

<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '22px'
  }}
>

  <div
    style={{
      padding: '16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Attendance Records
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        color: '#0f172a',
        marginTop: '6px'
      }}
    >
      {dailyReportSummary.totalRecords}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#15803d',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Completed Shifts
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        color: '#0f172a',
        marginTop: '6px'
      }}
    >
      {dailyReportSummary.completedShifts}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#ea580c',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Still Working
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        color: '#0f172a',
        marginTop: '6px'
      }}
    >
      {dailyReportSummary.stillWorking}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#2563eb',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Total Hours
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        color: '#0f172a',
        marginTop: '6px'
      }}
    >
      {dailyReportSummary.totalHours.toFixed(2)}
    </div>
  </div>

</div>

            <table
              style={{
                width:
                  '100%',

                borderCollapse:
                  'collapse'
              }}
            >

              <thead>

                <tr>

                  <th style={tableHeaderStyle}>
                    Employee
                  </th>

                  <th style={tableHeaderStyle}>
                    Department
                  </th>

                  <th style={tableHeaderStyle}>
                    Clock In
                  </th>

                  <th style={tableHeaderStyle}>
                    Clock Out
                  </th>

                  <th style={tableHeaderStyle}>
                    Hours
                  </th>

                  <th style={tableHeaderStyle}>
                    GPS
                  </th>

                  <th style={tableHeaderStyle}>
                    Status
                  </th>

                </tr>

              </thead>


              <tbody>

                {todayAttendance.length > 0 ? (

                  todayAttendance.map(
                    (
                      record,
                      index
                    ) => {

                      const profilePhoto =
                        getProfilePhoto(
                          record
                        );


                      return (

                        <tr
                          key={
                            record.attendance_id ||
                            index
                          }
                        >

                          <td style={tableCellStyle}>

                            <EmployeeIdentity
                              photo={
                                profilePhoto
                              }
                              name={
                                record.name ||
                                record.email ||
                                'Unknown Employee'
                              }
                              subText={
                                `Employee ID: ${
                                  record.employee_id ??
                                  'N/A'
                                }`
                              }
                            />

                          </td>


                          <td style={tableCellStyle}>

                            <div
                              style={{
                                fontWeight:
                                  '800',

                                color:
                                  '#334155'
                              }}
                            >

                              {
                                record.department ||
                                'General'
                              }

                            </div>


                            <div
                              style={{
                                color:
                                  '#64748b',

                                fontSize:
                                  '0.78rem',

                                marginTop:
                                  '3px'
                              }}
                            >

                              {
                                record.position ||
                                'Employee'
                              }

                            </div>

                          </td>


                          <td style={tableCellStyle}>

                            <strong>
                              {
                                formatTime(
                                  record.clock_in
                                )
                              }
                            </strong>

                          </td>


                          <td style={tableCellStyle}>

                            <strong
                              style={{
                                color:
                                  record.clock_out
                                    ? '#0f172a'
                                    : '#ea580c'
                              }}
                            >

                              {
                                record.clock_out
                                  ? formatTime(
                                      record.clock_out
                                    )
                                  : 'Still Working'
                              }

                            </strong>

                          </td>


                          <td style={tableCellStyle}>

                            <strong
                              style={{
                                color:
                                  '#2563eb'
                              }}
                            >

                              {
                                Number(
                                  record.total_hours ||
                                  0
                                ).toFixed(2)
                              }

                            </strong>

                          </td>


                          <td style={tableCellStyle}>

                            <span
                              style={{
                                display:
                                  'inline-block',

                                background:
                                  'rgba(34,197,94,0.10)',

                                color:
                                  '#15803d',

                                border:
                                  '1px solid rgba(34,197,94,0.25)',

                                padding:
                                  '7px 11px',

                                borderRadius:
                                  '999px',

                                fontWeight:
                                  '800',

                                fontSize:
                                  '0.72rem'
                              }}
                            >

                              📍 {
                                record.location_status ||
                                'Verified'
                              }

                            </span>

                          </td>


                          <td style={tableCellStyle}>

                            <span
                              style={{
                                display:
                                  'inline-block',

                                background:
                                  record.status ===
                                  'On Duty'
                                    ? 'rgba(34,197,94,0.12)'
                                    : 'rgba(37,99,235,0.10)',

                                color:
                                  record.status ===
                                  'On Duty'
                                    ? '#15803d'
                                    : '#1d4ed8',

                                border:
                                  record.status ===
                                  'On Duty'
                                    ? '1px solid rgba(34,197,94,0.25)'
                                    : '1px solid rgba(37,99,235,0.20)',

                                padding:
                                  '7px 12px',

                                borderRadius:
                                  '999px',

                                fontWeight:
                                  '900',

                                fontSize:
                                  '0.72rem'
                              }}
                            >

                              {
                                record.status ||
                                'Completed'
                              }

                            </span>

                          </td>

                        </tr>

                      );

                    }
                  )

                ) : (

                  <tr>

                    <td
                      colSpan="7"
                      style={{
                        padding:
                          '36px',

                        textAlign:
                          'center',

                        color:
                          '#64748b',

                        fontWeight:
                          '700'
                      }}
                    >

                      No attendance records found for {
                        selectedAttendanceDate
                      }.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>
  </>
)}

{activeManagementSection === 'reports' && (
  <>

  {/* ================================================= */}
{/* REPORT NAVIGATION */}
{/* ================================================= */}

<div
  style={{
    ...glassCard,
    padding: '10px',
    marginBottom: '22px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center'
  }}
>

  {[
    {
      key: 'weekly',
      label: 'Weekly'
    },
    {
      key: 'monthly',
      label: 'Monthly'
    },
    {
      key: 'hours',
      label: 'Hours Worked'
    },
    {
      key: 'absenteeism',
      label: 'Absenteeism'
    }
  ].map((item) => {

    const isActive =
      activeReportSection ===
      item.key;

    return (

      <button
        key={item.key}
        onClick={() =>
          setActiveReportSection(
            item.key
          )
        }
        style={{
          padding: '9px 15px',
          borderRadius: '10px',

          border:
            isActive
              ? '1px solid #f97316'
              : '1px solid #e2e8f0',

          background:
            isActive
              ? '#fff7ed'
              : '#ffffff',

          color:
            isActive
              ? '#ea580c'
              : '#64748b',

          fontWeight: '900',
          fontSize: '0.78rem',
          cursor: 'pointer',

          boxShadow:
            isActive
              ? '0 4px 12px rgba(249,115,22,0.12)'
              : 'none'
        }}
      >
        {item.label}
      </button>

    );

  })}

</div>
{activeReportSection === 'weekly' && (
  <>
        {/* ================================================= */}
{/* WEEKLY ATTENDANCE REPORT */}
{/* ================================================= */}

<div style={sectionCard}>

  <div
    style={{
      marginBottom: '22px'
    }}
  >

    <h2 style={sectionTitle}>
      Weekly Attendance Report
    </h2>

    <div style={sectionSubText}>
      Select a start date and end date
      to view attendance for a weekly period.
    </div>

  </div>


  <div
    style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'end'
    }}
  >

    <div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        Start Date
      </div>

      <input
        type="date"
        value={weeklyStartDate}
        max={getLocalDateString()}
        onChange={(event) =>
          setWeeklyStartDate(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />
    </div>


    <div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        End Date
      </div>

      <input
        type="date"
        value={weeklyEndDate}
        max={getLocalDateString()}
        onChange={(event) =>
          setWeeklyEndDate(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />
    </div>


    <button
      onClick={
        fetchWeeklyAttendance
      }
      disabled={
        weeklyReportLoading
      }
      style={{
        padding: '11px 18px',
        borderRadius: '12px',
        border: 'none',
        background:
          'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#ffffff',
        fontWeight: '900',
        cursor:
          weeklyReportLoading
            ? 'not-allowed'
            : 'pointer',
        opacity:
          weeklyReportLoading
            ? 0.6
            : 1
      }}
    >

      {
        weeklyReportLoading
          ? 'Loading...'
          : 'Generate Report'
      }


    </button>
    
    
<button
  onClick={
    exportWeeklyAttendanceCSV
  }
  style={{
    padding: '11px 18px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow:
      '0 6px 14px rgba(15,23,42,0.08)'
  }}
>
  Export CSV
</button>

  </div>

{/* ================================================= */}
{/* WEEKLY REPORT SUMMARY */}
{/* ================================================= */}

<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginTop: '22px'
  }}
>

  <div
    style={{
      padding: '16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Attendance Records
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {weeklyReportSummary.totalRecords}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#15803d',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Unique Employees
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {weeklyReportSummary.uniqueEmployees}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#ecfdf5',
      border: '1px solid #a7f3d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#047857',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Completed Shifts
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {weeklyReportSummary.completedShifts}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#ea580c',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Still Working
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {weeklyReportSummary.stillWorking}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#2563eb',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Total Hours
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {weeklyReportSummary.totalHours.toFixed(2)}
    </div>
  </div>

</div>

{/* ================================================= */}
{/* WEEKLY ATTENDANCE TABLE */}
{/* ================================================= */}

<div
  style={{
    overflowX: 'auto',
    marginTop: '22px'
  }}
>

  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}
  >

    <thead>

      <tr>

        <th style={tableHeaderStyle}>
          Date
        </th>

        <th style={tableHeaderStyle}>
          Employee
        </th>

        <th style={tableHeaderStyle}>
          Department
        </th>

        <th style={tableHeaderStyle}>
          Clock In
        </th>

        <th style={tableHeaderStyle}>
          Clock Out
        </th>

        <th style={tableHeaderStyle}>
          Hours
        </th>

        <th style={tableHeaderStyle}>
          Status
        </th>

      </tr>

    </thead>


    <tbody>

      {weeklyAttendance.length > 0 ? (

        weeklyAttendance.map(
          (record, index) => (

            <tr
              key={
                record.attendance_id ||
                index
              }
            >

              <td style={tableCellStyle}>
                <strong>
                  {formatDate(
                    record.attendance_date ||
                    record.clock_in
                  )}
                </strong>
              </td>


              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '900',
                    color: '#0f172a'
                  }}
                >
                  {
                    record.name ||
                    record.email ||
                    'Unknown Employee'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  Employee ID: {
                    record.employee_id ??
                    'N/A'
                  }
                </div>

              </td>


              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '800',
                    color: '#334155'
                  }}
                >
                  {
                    record.department ||
                    'General'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  {
                    record.position ||
                    'Employee'
                  }
                </div>

              </td>


              <td style={tableCellStyle}>
                <strong>
                  {
                    formatTime(
                      record.clock_in
                    )
                  }
                </strong>
              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color:
                      record.clock_out
                        ? '#0f172a'
                        : '#ea580c'
                  }}
                >

                  {
                    record.clock_out
                      ? formatTime(
                          record.clock_out
                        )
                      : 'Still Working'
                  }

                </strong>

              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color: '#2563eb'
                  }}
                >
                  {
                    Number(
                      record.total_hours ||
                      0
                    ).toFixed(2)
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                <span
                  style={{
                    display:
                      'inline-block',

                    background:
                      record.status ===
                      'On Duty'
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(37,99,235,0.10)',

                    color:
                      record.status ===
                      'On Duty'
                        ? '#15803d'
                        : '#1d4ed8',

                    padding:
                      '7px 12px',

                    borderRadius:
                      '999px',

                    fontWeight:
                      '900',

                    fontSize:
                      '0.72rem'
                  }}
                >

                  {
                    record.status ||
                    'Completed'
                  }

                </span>

              </td>

            </tr>

          )
        )

      ) : (

        <tr>

          <td
            colSpan="7"
            style={{
              padding: '36px',
              textAlign: 'center',
              color: '#64748b',
              fontWeight: '700'
            }}
          >

            Generate a weekly report
            to view attendance records.

          </td>

        </tr>

      )}

    </tbody>

  </table>

</div>

</div>

  </>
)}
{activeReportSection === 'monthly' && (
  <>
{/* ================================================= */}
{/* MONTHLY ATTENDANCE REPORT */}
{/* ================================================= */}

<div style={sectionCard}>

  <div
    style={{
      marginBottom: '22px'
    }}
  >

    <h2 style={sectionTitle}>
      Monthly Attendance Report
    </h2>

    <div style={sectionSubText}>
      Select a month to view attendance
      for the entire month.
    </div>


  </div>


  <div
    style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'end'
    }}
  >

    <div>

      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        Month
      </div>

      <input
        type="month"
        value={selectedMonth}
        onChange={(event) =>
          setSelectedMonth(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />

    </div>


    <button
      onClick={
        fetchMonthlyAttendance
      }
      disabled={
        monthlyReportLoading
      }
      style={{
        padding: '11px 18px',
        borderRadius: '12px',
        border: 'none',
        background:
          'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#ffffff',
        fontWeight: '900',
        cursor:
          monthlyReportLoading
            ? 'not-allowed'
            : 'pointer',
        opacity:
          monthlyReportLoading
            ? 0.6
            : 1
      }}
    >

      {
        monthlyReportLoading
          ? 'Loading...'
          : 'Generate Report'
      }

    </button>

<button
  onClick={
    exportMonthlyAttendanceCSV
  }
  style={{
    padding: '11px 18px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow:
      '0 6px 14px rgba(15,23,42,0.08)'
  }}
>
  Export CSV
</button>

</div>
{/* ================================================= */}
{/* MONTHLY REPORT SUMMARY */}
{/* ================================================= */}

<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginTop: '22px'
  }}
>

  <div
    style={{
      padding: '16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Attendance Records
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {monthlyReportSummary.totalRecords}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#15803d',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Unique Employees
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {monthlyReportSummary.uniqueEmployees}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#ecfdf5',
      border: '1px solid #a7f3d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#047857',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Completed Shifts
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {monthlyReportSummary.completedShifts}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#ea580c',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Still Working
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {monthlyReportSummary.stillWorking}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#2563eb',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Total Hours
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {monthlyReportSummary.totalHours.toFixed(2)}
    </div>
  </div>

</div>
{/* ================================================= */}
{/* MONTHLY ATTENDANCE TABLE */}
{/* ================================================= */}

<div
  style={{
    overflowX: 'auto',
    marginTop: '22px'
  }}
>

  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}
  >

    <thead>

      <tr>

        <th style={tableHeaderStyle}>
          Date
        </th>

        <th style={tableHeaderStyle}>
          Employee
        </th>

        <th style={tableHeaderStyle}>
          Department
        </th>

        <th style={tableHeaderStyle}>
          Clock In
        </th>

        <th style={tableHeaderStyle}>
          Clock Out
        </th>

        <th style={tableHeaderStyle}>
          Hours
        </th>

        <th style={tableHeaderStyle}>
          Status
        </th>

      </tr>

    </thead>


    <tbody>

      {monthlyAttendance.length > 0 ? (

        monthlyAttendance.map(
          (record, index) => (

            <tr
              key={
                record.attendance_id ||
                index
              }
            >

              <td style={tableCellStyle}>
                <strong>
                  {formatDate(
                    record.attendance_date ||
                    record.clock_in
                  )}
                </strong>
              </td>


              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '900',
                    color: '#0f172a'
                  }}
                >
                  {
                    record.name ||
                    record.email ||
                    'Unknown Employee'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  Employee ID: {
                    record.employee_id ??
                    'N/A'
                  }
                </div>

              </td>


              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '800',
                    color: '#334155'
                  }}
                >
                  {
                    record.department ||
                    'General'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  {
                    record.position ||
                    'Employee'
                  }
                </div>

              </td>


              <td style={tableCellStyle}>
                <strong>
                  {
                    formatTime(
                      record.clock_in
                    )
                  }
                </strong>
              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color:
                      record.clock_out
                        ? '#0f172a'
                        : '#ea580c'
                  }}
                >

                  {
                    record.clock_out
                      ? formatTime(
                          record.clock_out
                        )
                      : 'Still Working'
                  }

                </strong>

              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color: '#2563eb'
                  }}
                >
                  {
                    Number(
                      record.total_hours ||
                      0
                    ).toFixed(2)
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                <span
                  style={{
                    display:
                      'inline-block',

                    background:
                      record.status ===
                      'On Duty'
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(37,99,235,0.10)',

                    color:
                      record.status ===
                      'On Duty'
                        ? '#15803d'
                        : '#1d4ed8',

                    padding:
                      '7px 12px',

                    borderRadius:
                      '999px',

                    fontWeight:
                      '900',

                    fontSize:
                      '0.72rem'
                  }}
                >

                  {
                    record.status ||
                    'Completed'
                  }

                </span>

              </td>

            </tr>

          )
        )

      ) : (

        <tr>

          <td
            colSpan="7"
            style={{
              padding: '36px',
              textAlign: 'center',
              color: '#64748b',
              fontWeight: '700'
            }}
          >

            Generate a monthly report
            to view attendance records.

          </td>

        </tr>

      )}

    </tbody>

  </table>

</div>
</div>
  </>
)}
{activeReportSection === 'hours' && (
  <>
{/* ================================================= */}
{/* HOURS WORKED REPORT */}
{/* ================================================= */}

<div style={sectionCard}>

  <div
    style={{
      marginBottom: '22px'
    }}
  >

    <h2 style={sectionTitle}>
      Hours Worked Report
    </h2>

    <div style={sectionSubText}>
      View total shifts and hours worked
      by each employee for a selected period.
    </div>

  </div>


  <div
    style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'end'
    }}
  >

    <div>

      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        Start Date
      </div>

      <input
        type="date"
        value={
          hoursWorkedStartDate
        }
        max={
          getLocalDateString()
        }
        onChange={(event) =>
          setHoursWorkedStartDate(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />

    </div>


    <div>

      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        End Date
      </div>

      <input
        type="date"
        value={
          hoursWorkedEndDate
        }
        max={
          getLocalDateString()
        }
        onChange={(event) =>
          setHoursWorkedEndDate(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />

    </div>


    <button
      onClick={
        fetchHoursWorkedReport
      }
      disabled={
        hoursWorkedLoading
      }
      style={{
        padding: '11px 18px',
        borderRadius: '12px',
        border: 'none',
        background:
          'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#ffffff',
        fontWeight: '900',
        cursor:
          hoursWorkedLoading
            ? 'not-allowed'
            : 'pointer',
        opacity:
          hoursWorkedLoading
            ? 0.6
            : 1
      }}
    >

      {
        hoursWorkedLoading
          ? 'Loading...'
          : 'Generate Report'
      }

    </button>

    <button
  onClick={
    exportHoursWorkedCSV
  }
  style={{
    padding: '11px 18px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow:
      '0 6px 14px rgba(15,23,42,0.08)'
  }}
>
  Export CSV
</button>

  </div>

  {/* ================================================= */}
{/* HOURS WORKED SUMMARY */}
{/* ================================================= */}

<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px',
    marginTop: '22px'
  }}
>

  <div
    style={{
      padding: '16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Employees
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {hoursWorkedSummary.totalEmployees}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#15803d',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Total Shifts
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {hoursWorkedSummary.totalShifts}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#2563eb',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Total Hours
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {hoursWorkedSummary.totalHours.toFixed(2)}
    </div>
  </div>


  <div
    style={{
      padding: '16px',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#ea580c',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Average Hours
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {hoursWorkedSummary.averageHours.toFixed(2)}
    </div>
  </div>

</div>

{/* ================================================= */}
{/* HOURS WORKED TABLE */}
{/* ================================================= */}

<div
  style={{
    overflowX: 'auto',
    marginTop: '22px'
  }}
>

  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}
  >

    <thead>

      <tr>

        <th style={tableHeaderStyle}>
          Employee
        </th>

        <th style={tableHeaderStyle}>
          Department
        </th>

        <th style={tableHeaderStyle}>
          Position
        </th>

        <th style={tableHeaderStyle}>
          Total Shifts
        </th>

        <th style={tableHeaderStyle}>
          Total Hours
        </th>

      </tr>

    </thead>


    <tbody>

      {hoursWorkedData.length > 0 ? (

        hoursWorkedData.map(
          (employee, index) => (

            <tr
              key={
                employee.employee_id ||
                index
              }
            >

              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '900',
                    color: '#0f172a'
                  }}
                >
                  {
                    employee.name ||
                    employee.email ||
                    'Unknown Employee'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  {
                    employee.email ||
                    `Employee ID: ${employee.employee_id}`
                  }
                </div>

              </td>


              <td style={tableCellStyle}>

                <strong>
                  {
                    employee.department ||
                    'General'
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                {
                  employee.position ||
                  'Employee'
                }

              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color: '#15803d'
                  }}
                >
                  {
                    employee.total_shifts ||
                    0
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                <strong
                  style={{
                    color: '#2563eb'
                  }}
                >
                  {
                    Number(
                      employee.total_hours ||
                      0
                    ).toFixed(2)
                  }
                </strong>

              </td>

            </tr>

          )
        )

      ) : (

        <tr>

          <td
            colSpan="5"
            style={{
              padding: '36px',
              textAlign: 'center',
              color: '#64748b',
              fontWeight: '700'
            }}
          >

            Generate an hours worked report
            to view employee totals.

          </td>

        </tr>

      )}

    </tbody>

  </table>

</div>
</div>
  </>
)}
{activeReportSection === 'absenteeism' && (
  <>
{/* ================================================= */}
{/* ABSENTEEISM REPORT */}
{/* ================================================= */}

<div style={sectionCard}>

  <div
    style={{
      marginBottom: '22px'
    }}
  >

    <h2 style={sectionTitle}>
      Absenteeism Report
    </h2>

    <div style={sectionSubText}>
      View active employees who did not
      clock in on a selected date.
      Employees on approved leave are excluded.
    </div>

  </div>


  <div
    style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'end'
    }}
  >

    <div>

      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#475569',
          marginBottom: '6px'
        }}
      >
        Attendance Date
      </div>


      <input
        type="date"
        value={
          absenteeismDate
        }
        max={
          getLocalDateString()
        }
        onChange={(event) =>
          setAbsenteeismDate(
            event.target.value
          )
        }
        style={{
          padding: '11px 14px',
          borderRadius: '12px',
          border:
            '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          fontWeight: '800',
          outline: 'none'
        }}
      />

    </div>


    <button
      onClick={
        fetchAbsenteeismReport
      }
      disabled={
        absenteeismLoading
      }
      style={{
        padding: '11px 18px',
        borderRadius: '12px',
        border: 'none',
        background:
          'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#ffffff',
        fontWeight: '900',
        cursor:
          absenteeismLoading
            ? 'not-allowed'
            : 'pointer',
        opacity:
          absenteeismLoading
            ? 0.6
            : 1
      }}
    >

      {
        absenteeismLoading
          ? 'Loading...'
          : 'Generate Report'
      }

    </button>

  </div>
{/* ================================================= */}
{/* ABSENTEEISM SUMMARY */}
{/* ================================================= */}

<div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '22px'
  }}
>

  <div
    style={{
      padding: '16px',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#ea580c',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Absent Employees
    </div>

    <div
      style={{
        fontSize: '1.7rem',
        fontWeight: '900',
        marginTop: '6px'
      }}
    >
      {absenteeismData.length}
    </div>

  </div>


  <div
    style={{
      padding: '16px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '14px'
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '900',
        textTransform: 'uppercase'
      }}
    >
      Report Date
    </div>

    <div
      style={{
        fontSize: '1.15rem',
        fontWeight: '900',
        marginTop: '9px',
        color: '#0f172a'
      }}
    >
      {formatDate(absenteeismDate)}
    </div>

  </div>

</div>

{/* ================================================= */}
{/* ABSENTEEISM TABLE */}
{/* ================================================= */}

<div
  style={{
    overflowX: 'auto',
    marginTop: '22px'
  }}
>

  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}
  >

    <thead>

      <tr>

        <th style={tableHeaderStyle}>
          Employee
        </th>

        <th style={tableHeaderStyle}>
          Department
        </th>

        <th style={tableHeaderStyle}>
          Position
        </th>

        <th style={tableHeaderStyle}>
          Date
        </th>

        <th style={tableHeaderStyle}>
          Status
        </th>

        <th style={tableHeaderStyle}>
          Reason
        </th>

      </tr>

    </thead>


    <tbody>

      {absenteeismData.length > 0 ? (

        absenteeismData.map(
          (employee, index) => (

            <tr
              key={
                employee.id ||
                index
              }
            >

              <td style={tableCellStyle}>

                <div
                  style={{
                    fontWeight: '900',
                    color: '#0f172a'
                  }}
                >
                  {
                    employee.name ||
                    employee.email ||
                    'Unknown Employee'
                  }
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    marginTop: '3px'
                  }}
                >
                  {
                    employee.email ||
                    `Employee ID: ${employee.id}`
                  }
                </div>

              </td>


              <td style={tableCellStyle}>

                <strong>
                  {
                    employee.department ||
                    'General'
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                {
                  employee.position ||
                  'Employee'
                }

              </td>


              <td style={tableCellStyle}>

                <strong>
                  {
                    formatDate(
                      employee.absence_date
                    )
                  }
                </strong>

              </td>


              <td style={tableCellStyle}>

                <span
                  style={{
                    display: 'inline-block',
                    background:
                      'rgba(239,68,68,0.10)',
                    color: '#dc2626',
                    padding: '7px 12px',
                    borderRadius: '999px',
                    fontWeight: '900',
                    fontSize: '0.72rem'
                  }}
                >
                  {
                    employee.absence_status ||
                    'Absent'
                  }
                </span>

              </td>


              <td style={tableCellStyle}>

                {
                  employee.reason ||
                  'No attendance record'
                }

              </td>

            </tr>

          )
        )

      ) : (

        <tr>

          <td
            colSpan="6"
            style={{
              padding: '36px',
              textAlign: 'center',
              color: '#64748b',
              fontWeight: '700'
            }}
          >

            Generate an absenteeism report
            to view absent employees.

          </td>

        </tr>

      )}

    </tbody>

  </table>

</div>
</div>

  </>
)}
  </>
)}
{activeManagementSection === 'employees' && (
  <>
        {/* ================================================= */}
        {/* EMPLOYEE DIRECTORY */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap:
                '20px',

              flexWrap:
                'wrap',

              marginBottom:
                '22px'
            }}
          >

            <div>

              <h2 style={sectionTitle}>

                Employee Directory

              </h2>


              <div style={sectionSubText}>

                View and manage provincial government 
                personnel records.

              </div>

            </div>


            <input
              type="text"
              value={
                employeeSearch
              }
              onChange={(
                event
              ) =>
                setEmployeeSearch(
                  event.target.value
                )
              }
              placeholder="Search employees..."
              style={{
                width:
                  '100%',

                maxWidth:
                  '290px',

                padding:
                  '12px 15px',

                borderRadius:
                  '13px',

                border:
                  '1px solid #cbd5e1',

                background:
                  'rgba(255,255,255,0.88)',

                color:
                  '#0f172a',

                fontWeight:
                  '700',

                outline:
                  'none',

                boxSizing:
                  'border-box'
              }}
            />

          </div>


          <div
            style={{
              color:
                '#64748b',

              fontSize:
                '0.8rem',

              fontWeight:
                '800',

              marginBottom:
                '15px'
            }}
          >

            Showing {
              filteredEmployees.length
            } of {
              employees.length
            } employees

          </div>


          <div
            style={{
              overflowX:
                'auto'
            }}
          >

            <table
              style={{
                width:
                  '100%',

                borderCollapse:
                  'collapse'
              }}
            >

              <thead>

                <tr>

                  <th style={tableHeaderStyle}>
                    Employee
                  </th>

                  <th style={tableHeaderStyle}>
                    Department
                  </th>

                  <th style={tableHeaderStyle}>
                    Position
                  </th>

                  <th style={tableHeaderStyle}>
                    Role
                  </th>

                  <th style={tableHeaderStyle}>
                    Status
                  </th>

                  <th style={tableHeaderStyle}>
                    Personnel File
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  filteredEmployees.length >
                  0
                    ? (

                      filteredEmployees.map(
                        (employee) => {

                          const profilePhoto =
                            getProfilePhoto(
                              employee
                            );


                          const employeeRole =
                            (
                              employee.role ||
                              'employee'
                            ).toLowerCase();


                          return (

                            <tr
                              key={
                                employee.id
                              }
                            >

                              <td style={tableCellStyle}>

                                <EmployeeIdentity
                                  photo={
                                    profilePhoto
                                  }
                                  name={
                                    employee.name ||
                                    'Unnamed Employee'
                                  }
                                  subText={
                                    `ID: ${employee.id} • ${
                                      employee.email ||
                                      'No email'
                                    }`
                                  }
                                />

                              </td>


                              <td style={tableCellStyle}>

                                <strong>

                                  {
                                    employee.department ||
                                    'General'
                                  }

                                </strong>

                              </td>


                              <td style={tableCellStyle}>

                                {
                                  employee.position ||
                                  'Employee'
                                }

                              </td>


                              <td style={tableCellStyle}>

                                <span
                                  style={{
                                    display:
                                      'inline-block',

                                    padding:
                                      '6px 10px',

                                    borderRadius:
                                      '999px',

                                    background:
                                      employeeRole ===
                                      'admin'
                                        ? '#fff7ed'
                                        : employeeRole ===
                                          'manager'
                                        ? '#f3e8ff'
                                        : '#eff6ff',

                                    color:
                                      employeeRole ===
                                      'admin'
                                        ? '#ea580c'
                                        : employeeRole ===
                                          'manager'
                                        ? '#7e22ce'
                                        : '#2563eb',

                                    fontWeight:
                                      '900',

                                    fontSize:
                                      '0.72rem',

                                    textTransform:
                                      'capitalize'
                                  }}
                                >

                                  {
                                    employee.role ||
                                    'employee'
                                  }

                                </span>

                              </td>


                              <td style={tableCellStyle}>

                                <div
                                  style={{
                                    fontWeight:
                                      '800',

                                    color:
                                      (
                                        employee.employment_status ||
                                        ''
                                      ).toLowerCase() ===
                                      'active'
                                        ? '#16a34a'
                                        : '#dc2626'
                                  }}
                                >

                                  ● {
                                    employee.employment_status ||
                                    'Unknown'
                                  }

                                </div>


                                <div
                                  style={{
                                    marginTop:
                                      '4px',

                                    color:
                                      '#64748b',

                                    fontSize:
                                      '0.75rem'
                                  }}
                                >

                                  Account: {
                                    employee.account_status ||
                                    'Unknown'
                                  }

                                </div>

                              </td>


                              <td style={tableCellStyle}>

                                <button
                                  onClick={() =>
                                    openEmployeeFile(
                                      employee
                                    )
                                  }
                                  style={{
                                    padding:
                                      '9px 14px',

                                    borderRadius:
                                      '11px',

                                    border:
                                      '1px solid #fdba74',

                                    background:
                                      '#fff7ed',

                                    color:
                                      '#ea580c',

                                    fontWeight:
                                      '900',

                                    fontSize:
                                      '0.76rem',

                                    cursor:
                                      'pointer'
                                  }}
                                >

                                  View File

                                </button>

                              </td>

                            </tr>

                          );

                        }
                      )

                    )
                    : (

                      <tr>

                        <td
                          colSpan="6"
                          style={{
                            padding:
                              '35px',

                            textAlign:
                              'center',

                            color:
                              '#64748b',

                            fontWeight:
                              '700'
                          }}
                        >

                          No employees match
                          your search.

                        </td>

                      </tr>

                    )
                }

              </tbody>

            </table>

          </div>

        </div>

  </>
)}
{activeManagementSection === 'overview' && (
  <>
        {/* ================================================= */}
        {/* LIVE ACTIVE PERSONNEL */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              marginBottom:
                '20px'
            }}
          >

            <h2 style={sectionTitle}>

              Live Active Personnel

            </h2>


            <div style={sectionSubText}>

             Employees currently clocked in
and active on provincial duty.

            </div>

          </div>


          {loading ? (

            <div
              style={{
                padding:
                  '30px',

                textAlign:
                  'center',

                color:
                  '#64748b',

                fontWeight:
                  '700'
              }}
            >

              Loading active personnel...

            </div>

          ) : (

            <div
              style={{
                overflowX:
                  'auto'
              }}
            >

              <table
                style={{
                  width:
                    '100%',

                  borderCollapse:
                    'collapse'
                }}
              >

                <thead>

                  <tr>

                    <th style={tableHeaderStyle}>
                      Staff Member
                    </th>

                    <th style={tableHeaderStyle}>
                      Position
                    </th>

                    <th style={tableHeaderStyle}>
                      Department
                    </th>

                    <th style={tableHeaderStyle}>
                      GPS Status
                    </th>

                    <th style={tableHeaderStyle}>
                      Session Start
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {
                    liveStaff.length > 0
                      ? (

                        liveStaff.map(
                          (
                            staff,
                            index
                          ) => {

                            const profilePhoto =
                              getProfilePhoto(
                                staff
                              );


                            return (

                              <tr
                                key={
                                  staff.attendance_id ||
                                  `${staff.employee_id}-${index}`
                                }
                              >

                                <td style={tableCellStyle}>

                                  <EmployeeIdentity
                                    photo={
                                      profilePhoto
                                    }
                                    name={
                                      staff.name ||
                                      staff.email ||
                                      'Unknown Employee'
                                    }
                                    subText={
                                      `Employee ID: ${
                                        staff.employee_id ??
                                        staff.employeeId ??
                                        staff.id ??
                                        'N/A'
                                      }`
                                    }
                                  />

                                </td>


                                <td style={tableCellStyle}>

                                  <strong
                                    style={{
                                      color:
                                        '#334155'
                                    }}
                                  >

                                    {
                                      staff.position ||
                                      'Employee'
                                    }

                                  </strong>

                                </td>


                                <td style={tableCellStyle}>

                                  {
                                    staff.department ||
                                    'General'
                                  }

                                </td>


                                <td style={tableCellStyle}>

                                  <span
                                    style={{
                                      background:
                                        '#ecfdf5',

                                      color:
                                        '#15803d',

                                      border:
                                        '1px solid #bbf7d0',

                                      padding:
                                        '7px 11px',

                                      borderRadius:
                                        '999px',

                                      fontWeight:
                                        '800',

                                      fontSize:
                                        '0.75rem'
                                    }}
                                  >

                                    📍 {
                                      staff.location_status ||
                                      'Verified'
                                    }

                                  </span>

                                </td>


                                <td style={tableCellStyle}>

                                  <strong>

                                    {
                                      formatDateTime(
                                        staff.clock_in
                                      )
                                    }

                                  </strong>

                                </td>

                              </tr>

                            );

                          }
                        )

                      )
                      : (

                        <tr>

                          <td
                            colSpan="5"
                            style={{
                              padding:
                                '35px',

                              textAlign:
                                'center',

                              color:
                                '#64748b',

                              fontWeight:
                                '700'
                            }}
                          >

                            No employees are
                            currently clocked in.

                          </td>

                        </tr>

                      )
                  }

                </tbody>

              </table>

            </div>

          )}

        </div>

  </>
)}
{activeManagementSection === 'leave' && (
  <>
        {/* ================================================= */}
        {/* LEAVE ANALYTICS */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              marginBottom:
                '20px'
            }}
          >

            <h2 style={sectionTitle}>

              Leave Analytics

            </h2>


            <div style={sectionSubText}>

              Overview of provincial government employee
              leave applications.

            </div>

          </div>


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',

              gap:
                '15px'
            }}
          >

            <LeaveAnalyticsCard
              title="Total Applications"
              value={
                totalLeaveCount
              }
              percentage={
                totalLeaveCount > 0
                  ? 100
                  : 0
              }
              accent="#475569"
              track="#e2e8f0"
            />


            <LeaveAnalyticsCard
              title="Pending"
              value={
                pendingLeaveCount
              }
              percentage={
                getLeavePercentage(
                  pendingLeaveCount
                )
              }
              accent="#ea580c"
              track="#ffedd5"
            />


            <LeaveAnalyticsCard
              title="Approved"
              value={
                approvedLeaveCount
              }
              percentage={
                getLeavePercentage(
                  approvedLeaveCount
                )
              }
              accent="#16a34a"
              track="#dcfce7"
            />


            <LeaveAnalyticsCard
              title="Denied"
              value={
                deniedLeaveCount
              }
              percentage={
                getLeavePercentage(
                  deniedLeaveCount
                )
              }
              accent="#dc2626"
              track="#fee2e2"
            />

          </div>

        </div>


        {/* ================================================= */}
        {/* PENDING LEAVE APPLICATIONS */}
        {/* ================================================= */}

        <div style={sectionCard}>

          <div
            style={{
              marginBottom:
                '20px'
            }}
          >

            <h2 style={sectionTitle}>

              Pending Leave Applications

            </h2>


            <div style={sectionSubText}>

              Review and process employee
              leave requests.

            </div>

          </div>


          {
            leaveRequests.filter(
              (request) =>
                (
                  request.status ||
                  ''
                ).toLowerCase() ===
                'pending'
            ).length > 0
              ? (

                leaveRequests

                  .filter(
                    (request) =>
                      (
                        request.status ||
                        ''
                      ).toLowerCase() ===
                      'pending'
                  )

                  .map(
                    (
                      request,
                      index
                    ) => (

                      <div
                        key={
                          request.id ||
                          index
                        }
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          alignItems:
                            'center',

                          gap:
                            '20px',

                          flexWrap:
                            'wrap',

                          padding:
                            '20px 0',

                          borderBottom:
                            index <
                            pendingLeaveCount - 1
                              ? '1px solid #e2e8f0'
                              : 'none'
                        }}
                      >

                        <div
                          style={{
                            flex:
                              1,

                            minWidth:
                              '250px'
                          }}
                        >

                          <div
                            style={{
                              fontWeight:
                                '900',

                              color:
                                '#0f172a',

                              fontSize:
                                '1rem'
                            }}
                          >

                            {
                              request.employee ||
                              `Employee ${
                                request.employee_id ||
                                ''
                              }`
                            }

                          </div>


                          <div
                            style={{
                              color:
                                '#475569',

                              fontWeight:
                                '700',

                              marginTop:
                                '6px',

                              fontSize:
                                '0.85rem'
                            }}
                          >

                            {
                              request.type ||
                              'Leave'
                            }

                            {' • '}

                            {
                              formatDate(
                                request.start_date
                              )
                            }

                            {' → '}

                            {
                              formatDate(
                                request.end_date
                              )
                            }

                          </div>


                          <div
                            style={{
                              color:
                                '#64748b',

                              marginTop:
                                '8px',

                              fontSize:
                                '0.85rem',

                              lineHeight:
                                '1.5'
                            }}
                          >

                            "
                            {
                              request.reason ||
                              'No reason supplied'
                            }
                            "

                          </div>

                        </div>


                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '10px'
                          }}
                        >

                          <button
                            onClick={() =>
                              updateLeaveStatus(
                                request.id,
                                'Denied'
                              )
                            }
                            style={{
                              padding:
                                '10px 18px',

                              borderRadius:
                                '11px',

                              border:
                                '1px solid #ef4444',

                              background:
                                '#ffffff',

                              color:
                                '#dc2626',

                              fontWeight:
                                '900',

                              cursor:
                                'pointer'
                            }}
                          >

                            Deny

                          </button>


                          <button
                            onClick={() =>
                              updateLeaveStatus(
                                request.id,
                                'Approved'
                              )
                            }
                            style={{
                              padding:
                                '10px 18px',

                              borderRadius:
                                '11px',

                              border:
                                'none',

                              background:
                                'linear-gradient(135deg,#22c55e,#16a34a)',

                              color:
                                '#ffffff',

                              fontWeight:
                                '900',

                              cursor:
                                'pointer',

                              boxShadow:
                                '0 7px 16px rgba(34,197,94,0.20)'
                            }}
                          >

                            Approve

                          </button>

                        </div>

                      </div>

                    )
                  )

              )
              : (

                <div
                  style={{
                    padding:
                      '22px',

                    textAlign:
                      'center',

                    color:
                      '#64748b',

                    fontWeight:
                      '700'
                  }}
                >

                  No pending leave requests
                  at this time.

                </div>

              )
          }

        </div>

  </>
)}
{activeManagementSection === 'audit' && (
  <>
{/* ================================================= */}
{/* AUDIT LOG */}
{/* ================================================= */}

<div style={sectionCard}>

  <div
    style={{
      marginBottom: '20px'
    }}
  >

    <h2 style={sectionTitle}>
      System Audit Log
    </h2>

    <div style={sectionSubText}>
      Recent administrative and employee system activity.
    </div>

  </div>


  <div
    style={{
      overflowX: 'auto'
    }}
  >

    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '850px'
      }}
    >

      <thead>

        <tr>

          <th
            style={{
              textAlign: 'left',
              padding: '14px',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: '900',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            DATE / TIME
          </th>

          <th
            style={{
              textAlign: 'left',
              padding: '14px',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: '900',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            USER
          </th>

          <th
            style={{
              textAlign: 'left',
              padding: '14px',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: '900',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            ACTION
          </th>

          <th
            style={{
              textAlign: 'left',
              padding: '14px',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: '900',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            DETAILS
          </th>

          <th
            style={{
              textAlign: 'left',
              padding: '14px',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: '900',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            IP ADDRESS
          </th>

        </tr>

      </thead>


      <tbody>

        {
          auditLogs.length > 0
            ? (

              auditLogs.map((log) => (

                <tr key={log.id}>

                  <td
                    style={{
                      padding: '14px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#475569',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatDateTime(log.created_at)}
                  </td>


                  <td
                    style={{
                      padding: '14px',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >

                    <div
                      style={{
                        fontWeight: '900',
                        color: '#0f172a'
                      }}
                    >
                      {log.user_name || 'System'}
                    </div>

                    <div
                      style={{
                        color: '#64748b',
                        fontSize: '0.78rem',
                        marginTop: '3px'
                      }}
                    >
                      {log.email || 'N/A'}
                    </div>

                  </td>


                  <td
                    style={{
                      padding: '14px',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >

                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: '999px',
                        background: '#f1f5f9',
                        color: '#334155',
                        fontWeight: '900',
                        fontSize: '0.72rem'
                      }}
                    >
                      {log.action}
                    </span>

                  </td>


                  <td
                    style={{
                      padding: '14px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#334155',
                      fontSize: '0.85rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {log.details || 'No details available.'}
                  </td>


                  <td
                    style={{
                      padding: '14px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {log.ip_address || 'N/A'}
                  </td>

                </tr>

              ))

            )
            : (

              <tr>

                <td
                  colSpan="5"
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontWeight: '700'
                  }}
                >
                  No audit activity has been recorded yet.
                </td>

              </tr>

            )
        }

      </tbody>

    </table>

  </div>

</div>
  </>
)}
        

      </div>

    </div>

  );

};


// ======================================================
// EMPLOYEE PHOTO + NAME COMPONENT
// ======================================================

const EmployeeIdentity = ({
  photo,
  name,
  subText
}) => {

  return (

    <div
      style={{
        display:
          'flex',

        alignItems:
          'center',

        gap:
          '12px'
      }}
    >

      <div
        style={{
          width:
            '48px',

          height:
            '48px',

          minWidth:
            '48px',

          borderRadius:
            '50%',

          overflow:
            'hidden',

          position:
            'relative',

          background:
            'linear-gradient(135deg, #fed7aa, #fdba74)',

          border:
            '3px solid #ffffff',

          boxShadow:
            '0 4px 12px rgba(15,23,42,0.12)',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center'
        }}
      >

        <span>
          👤
        </span>


        {photo && (

          <img
            src={photo}
            alt={
              name ||
              'Employee'
            }
            style={{
              position:
                'absolute',

              top:
                0,

              left:
                0,

              width:
                '100%',

              height:
                '100%',

              objectFit:
                'cover'
            }}
            onError={(
              event
            ) => {

              event.currentTarget.style.display =
                'none';

            }}
          />

        )}

      </div>


      <div>

        <div
          style={{
            fontWeight:
              '900',

            color:
              '#0f172a'
          }}
        >

          {name}

        </div>


        <div
          style={{
            color:
              '#64748b',

            fontSize:
              '0.75rem',

            marginTop:
              '3px',

            maxWidth:
              '260px',

            overflowWrap:
              'anywhere'
          }}
        >

          {subText}

        </div>

      </div>

    </div>

  );

};


// ======================================================
// SUMMARY CARD
// ======================================================

const SummaryCard = ({
  title,
  value,
  text,
  textColor,
  cardStyle
}) => {

  return (

    <div
      style={{
        ...cardStyle,

        padding:
          '24px'
      }}
    >

      <div
        style={{
          color:
            '#64748b',

          fontWeight:
            '900',

          fontSize:
            '0.72rem',

          textTransform:
            'uppercase',

          letterSpacing:
            '0.8px'
        }}
      >

        {title}

      </div>


      <div
        style={{
          fontSize:
            '2.2rem',

          fontWeight:
            '900',

          color:
            '#0f172a',

          marginTop:
            '10px'
        }}
      >

        {value}

      </div>


      <div
        style={{
          color:
            textColor,

          fontWeight:
            '700',

          marginTop:
            '4px',

          fontSize:
            '0.85rem'
        }}
      >

        {text}

      </div>

    </div>

  );

};


// ======================================================
// WORKFORCE CARD
// ======================================================

const WorkforceCard = ({
  title,
  value,
  description,
  accent,
  border
}) => {

  return (

    <div
      style={{
        background:
          'rgba(255,255,255,0.72)',

        border:
          `1px solid ${border}`,

        borderRadius:
          '18px',

        padding:
          '22px'
      }}
    >

      <div
        style={{
          fontSize:
            '0.75rem',

          fontWeight:
            '900',

          color:
            accent,

          textTransform:
            'uppercase',

          letterSpacing:
            '0.8px'
        }}
      >

        {title}

      </div>


      <div
        style={{
          fontSize:
            '2.2rem',

          fontWeight:
            '900',

          color:
            '#0f172a',

          marginTop:
            '10px'
        }}
      >

        {value}

      </div>


      <div
        style={{
          color:
            accent,

          fontWeight:
            '700',

          fontSize:
            '0.85rem',

          marginTop:
            '4px'
        }}
      >

        {description}

      </div>

    </div>

  );

};


// ======================================================
// LEAVE ANALYTICS CARD
// ======================================================

const LeaveAnalyticsCard = ({
  title,
  value,
  percentage,
  accent,
  track
}) => {

  return (

    <div
      style={{
        background:
          'rgba(255,255,255,0.68)',

        border:
          '1px solid rgba(226,232,240,0.9)',

        borderRadius:
          '17px',

        padding:
          '20px'
      }}
    >

      <div
        style={{
          color:
            accent,

          fontSize:
            '0.72rem',

          fontWeight:
            '900',

          textTransform:
            'uppercase',

          letterSpacing:
            '0.75px'
        }}
      >

        {title}

      </div>


      <div
        style={{
          fontSize:
            '2rem',

          fontWeight:
            '900',

          color:
            '#0f172a',

          marginTop:
            '8px'
        }}
      >

        {value}

      </div>


      <div
        style={{
          color:
            '#64748b',

          fontSize:
            '0.78rem',

          fontWeight:
            '700',

          marginTop:
            '3px'
        }}
      >

        {percentage}% of applications

      </div>


      <div
        style={{
          height:
            '7px',

          background:
            track,

          borderRadius:
            '999px',

          overflow:
            'hidden',

          marginTop:
            '13px'
        }}
      >

        <div
          style={{
            height:
              '100%',

            width:
              `${Math.min(
                percentage,
                100
              )}%`,

            background:
              accent,

            borderRadius:
              '999px',

            transition:
              'width 0.4s ease'
          }}
        />

      </div>

    </div>

  );

};


export default ManagementView;