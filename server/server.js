const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  countSouthAfricanWorkingDays,
  getCalendarLeaveCycle,
  ensurePhase4Infrastructure,
  ensureCurrentLeaveBalances,
  ensureAllCurrentLeaveBalances,
  recalculateCurrentLeaveBalance,
  createTrustedTimeService,
  registerPhase4EnhancementRoutes
} = require('./phase4Enhancements');

const trustedTimeService =
  createTrustedTimeService(db);

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    '❌ JWT_SECRET is missing from .env'
  );

  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Increase JSON payload size limits for Base64 biometric images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// ======================================================
// AUTHENTICATION ROUTES
// ======================================================

// ------------------------------------------------------
// Registration Endpoint
// ------------------------------------------------------
// ------------------------------------------------------
// Registration Endpoint
// ------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {

  const {
    fullName,
    name,
    surname,
    email,
    password,
    idNumber,
    phone,
    department,
    department_id,
    position,
    position_id,
    faceReferenceImage,
    profile_photo
  } = req.body;


  try {

    // --------------------------------------------------
// VALIDATE REQUIRED FIELDS
// --------------------------------------------------

if (!email || !password) {

  return res.status(400).json({
    success: 0,
    message: 'Email and password are required.'
  });

}


// --------------------------------------------------
// CLEAN EMAIL
// --------------------------------------------------

const cleanEmail =
  String(email)
    .trim()
    .toLowerCase();


// --------------------------------------------------
// REQUIRE OFFICIAL NCPG EMAIL ADDRESS
// --------------------------------------------------

if (
  !/^[^@\s]+@ncpg\.gov\.za$/.test(cleanEmail)
) {

  return res.status(400).json({
    success: 0,
    message:
      'Please use your official @ncpg.gov.za email address.'
  });

}


// --------------------------------------------------
// REQUIRE A REASONABLY STRONG EMPLOYEE PASSWORD
// --------------------------------------------------

if (String(password).length < 8) {

  return res.status(400).json({
    success: 0,
    message:
      'Password must be at least 8 characters long.'
  });

}


    // --------------------------------------------------
    // CHECK IF EMAIL ALREADY EXISTS
    // --------------------------------------------------

    const [existingUsers] =
      await db.query(
        `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [cleanEmail]
      );


    if (existingUsers.length > 0) {

      return res.status(409).json({
        success: 0,
        message:
          'An account with this email already exists.'
      });

    }


    // --------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );


    // --------------------------------------------------
    // CREATE EMPLOYEE
    // --------------------------------------------------

    const query = `
      INSERT INTO users (
        name,
        surname,
        email,
        password,
        idNumber,
        phone,
        role,
        department,
        department_id,
        position,
        position_id,
        employment_status,
        account_status,
        faceReferenceImage,
        profile_photo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;


    const [result] =
      await db.execute(
        query,
        [
          name || fullName || 'Employee',
          surname || null,
          cleanEmail,
          hashedPassword,
          idNumber || null,
          phone || null,

          // Public registration can only create employees.
          'employee',

          department || 'General',
          department_id || null,
          position || null,
          position_id || null,
          'Active',
          'Active',
          faceReferenceImage || null,
          profile_photo ||
            faceReferenceImage ||
            null
        ]
      );


    // Automatically initialise leave balances for the new employee.
    await ensureCurrentLeaveBalances(
      db,
      result.insertId
    );


    console.log(
      `✅ Employee registered securely: ${cleanEmail} | ID: ${result.insertId}`
    );


    return res.status(201).json({
      success: 1,
      message:
        'Employee registered successfully!',
      userId:
        result.insertId
    });


  } catch (err) {

    console.error(
      '❌ Error saving employee:',
      err
    );


    return res.status(500).json({
      success: 0,
      message:
        'Database insertion error',
      details:
        err.sqlMessage ||
        err.message
    });

  }

});

// ======================================================
// LOGIN
// ======================================================

app.post('/api/auth/login-admin', async (req, res) => {

  const { email, password } = req.body;

  try {

    // --------------------------------------------------
// VALIDATE LOGIN DETAILS
// --------------------------------------------------

if (!email || !password) {

  return res.status(400).json({
    success: 0,
    message: 'Email and password are required.'
  });

}


// --------------------------------------------------
// CLEAN EMAIL
// --------------------------------------------------

const cleanEmail =
  String(email)
    .trim()
    .toLowerCase();


// --------------------------------------------------
// REQUIRE OFFICIAL NCPG EMAIL
// --------------------------------------------------

if (
  !/^[^@\s]+@ncpg\.gov\.za$/.test(cleanEmail)
) {

  return res.status(401).json({
    success: 0,
    message:
      'Please use your official @ncpg.gov.za email address.'
  });

}


// --------------------------------------------------
// PASSWORD IS VERIFIED AGAINST THIS ACCOUNT BELOW
// --------------------------------------------------
// No shared repository-wide password gate is used.

    // --------------------------------------------------
    // Find user
    // --------------------------------------------------

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        surname,
        email,
        password,
        idNumber,
        phone,
        role,
        department,
        department_id,
        position,
        position_id,
        employment_status,
        account_status,
        profile_photo,
        faceReferenceImage,
        created_at
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (rows.length === 0) {

      console.log(`❌ Login failed - email not found: ${email}`);

      return res.status(401).json({
        success: 0,
        message: 'Invalid credentials.'
      });

    }

    const user = rows[0];

    // --------------------------------------------------
// CHECK PASSWORD
// --------------------------------------------------

let passwordCorrect = false;


const passwordIsBcryptHash =
  typeof user.password === 'string' &&
  (
    user.password.startsWith('$2a$') ||
    user.password.startsWith('$2b$') ||
    user.password.startsWith('$2y$')
  );


if (passwordIsBcryptHash) {

  // Modern secure account
  passwordCorrect =
    await bcrypt.compare(
      password,
      user.password
    );

} else {

  // ------------------------------------------------
  // OLD ACCOUNT MIGRATION
  // ------------------------------------------------
  // Temporary support for old plaintext passwords.
  // Once the old user successfully logs in,
  // automatically convert their password to bcrypt.
  // ------------------------------------------------

  passwordCorrect =
    password === user.password;


  if (passwordCorrect) {

    const upgradedPassword =
      await bcrypt.hash(
        password,
        12
      );


    await db.query(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
      [
        upgradedPassword,
        user.id
      ]
    );


    console.log(
      `🔐 Password upgraded to bcrypt for user ID ${user.id}`
    );

  }

}
    // --------------------------------------------------
    // PASSWORD INCORRECT
    // --------------------------------------------------

    if (!passwordCorrect) {

      console.log(`❌ Incorrect password for: ${email}`);

      return res.status(401).json({
        success: 0,
        message: 'Invalid credentials.'
      });

    }

    // --------------------------------------------------
    // CHECK ACCOUNT STATUS
    // --------------------------------------------------

    if (
      user.account_status &&
      user.account_status.toLowerCase() !== 'active'
    ) {

      return res.status(403).json({
        success: 0,
        message: 'Your account is not active. Please contact management.'
      });

    }

    // --------------------------------------------------
// CHECK EMPLOYMENT STATUS
// --------------------------------------------------

if (
  user.employment_status &&
  user.employment_status.toLowerCase() !== 'active'
) {

  return res.status(403).json({
    success: 0,
    message:
      'Your employment status is not active. Please contact management.'
  });

}

    // --------------------------------------------------
    // REMOVE PASSWORD
    // --------------------------------------------------

    delete user.password;

    // --------------------------------------------------
    // LOGIN SUCCESSFUL
    // --------------------------------------------------

    console.log(
      `✅ Login successful: ${user.email} | ID: ${user.id} | Role: ${user.role}`
    );

    const token = jwt.sign(
  {
    userId: user.id,

    email:
      user.email,

    role:
      (user.role || 'employee')
        .toLowerCase()
  },

  JWT_SECRET,

  {
    expiresIn: '8h'
  }
);
// --------------------------------------------------
// AUDIT LOG - LOGIN
// --------------------------------------------------

await writeAuditLog(
  user.id,
  'LOGIN_SUCCESS',
  `User ${user.email} logged in successfully. Role: ${user.role}.`,
  req.ip
);

    return res.status(200).json({
      success: 1,
      message: 'Login successful.',
      token: token,
      user: user
    });

  } catch (err) {

    console.error('❌ Login error:', err);

    return res.status(500).json({
      success: 0,
      message: 'Server error during login.',
      details: err.sqlMessage || err.message
    });

  }

});

// ======================================================
// AUTHORIZATION MIDDLEWARE
// ======================================================

// ======================================================
// AUTHENTICATED USER MIDDLEWARE
// ======================================================

const requireAuth = async (req, res, next) => {

  try {

    // --------------------------------------------------
    // GET AUTHORIZATION HEADER
    // --------------------------------------------------

    const authHeader =
      req.headers.authorization;


    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {

      return res.status(401).json({
        success: 0,
        message: 'Authentication required.'
      });

    }


    // --------------------------------------------------
    // GET TOKEN
    // --------------------------------------------------

    const token =
      authHeader.split(' ')[1];


    if (!token) {

      return res.status(401).json({
        success: 0,
        message: 'Authentication token missing.'
      });

    }


    // --------------------------------------------------
    // VERIFY JWT
    // --------------------------------------------------

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    if (!decoded.userId) {

      return res.status(401).json({
        success: 0,
        message: 'Invalid authentication token.'
      });

    }


    // --------------------------------------------------
    // MAKE SURE USER STILL EXISTS
    // --------------------------------------------------

    const [rows] =
      await db.query(
        `
        SELECT
          id,
          email,
          role,
          employment_status,
          account_status
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [decoded.userId]
      );


    if (rows.length === 0) {

      return res.status(401).json({
        success: 0,
        message: 'User account no longer exists.'
      });

    }


    const user =
      rows[0];


    // --------------------------------------------------
    // CHECK ACCOUNT STATUS
    // --------------------------------------------------

    if (
      user.account_status &&
      user.account_status
        .toLowerCase() !== 'active'
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'Your account is not active. Please contact management.'
      });

    }

    // --------------------------------------------------
// CHECK EMPLOYMENT STATUS
// --------------------------------------------------

if (
  user.employment_status &&
  user.employment_status
    .toLowerCase() !== 'active'
) {

  return res.status(403).json({
    success: 0,
    message:
      'Your employment status is not active. Please contact management.'
  });

}

    // --------------------------------------------------
    // SAVE AUTHENTICATED USER
    // --------------------------------------------------

    req.user = {

      userId:
        user.id,

      email:
        user.email,

      role:
        (
          user.role ||
          'employee'
        ).toLowerCase(),

      employment_status:
        user.employment_status,

      account_status:
        user.account_status

    };


    next();


  } catch (err) {

    console.error(
      '❌ Authentication error:',
      err.message
    );


    return res.status(401).json({
      success: 0,
      message:
        'Invalid or expired authentication token.'
    });

  }

};


// ======================================================
// MANAGEMENT AUTHORIZATION MIDDLEWARE
// ======================================================

// ======================================================
// ROLE-BASED AUTHORIZATION
// ======================================================

// ------------------------------------------------------
// NORMALISE SYSTEM ROLE
// ------------------------------------------------------

const normalizeSystemRole = (role) => {

  const normalized =
    String(role || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');


  // Old employee accounts are treated as Workers.
  if (normalized === 'employee') {
    return 'worker';
  }


  // Accept a few HR spelling variations.
  if (
    normalized === 'hr' ||
    normalized === 'hradmin' ||
    normalized === 'hr_admin'
  ) {
    return 'hr_admin';
  }


  return normalized;

};


// ======================================================
// GENERIC ROLE AUTHORIZATION
// ======================================================

const requireRoles =
  (...allowedRoles) => {

    const normalizedAllowedRoles =
      allowedRoles.map(
        normalizeSystemRole
      );


    return (req, res, next) => {

      return requireAuth(
        req,
        res,
        () => {

          const role =
            normalizeSystemRole(
              req.user.role
            );


          if (
            !normalizedAllowedRoles.includes(
              role
            )
          ) {

            return res.status(403).json({

              success: 0,

              message:
                'You do not have permission to perform this action.'

            });

          }


          // Store canonical role for later routes.
          req.user.role = role;


          next();

        }
      );

    };

};


// ======================================================
// LEGACY FULL MANAGEMENT ACCESS
// ======================================================
// Keep the existing Admin/Manager behaviour working
// while we migrate each route to the new role model.
// ======================================================

const requireManagement =
  requireRoles(
    'admin',
    'manager'
  );


// ======================================================
// SUPERVISOR ACCESS
// ======================================================

const requireSupervisorAccess =
  requireRoles(
    'supervisor',
    'hr_admin',
    'admin',
    'manager'
  );


// ======================================================
// HR ACCESS
// ======================================================

const requireHRAccess =
  requireRoles(
    'hr_admin',
    'admin',
    'manager'
  );


// ======================================================
// FINANCE ACCESS
// ======================================================

const requireFinanceAccess =
  requireRoles(
    'finance',
    'hr_admin',
    'admin',
    'manager'
  );


// ======================================================
// AUDIT LOG HELPER
// ======================================================

const writeAuditLog = async (
  userId,
  action,
  details,
  ipAddress = null
) => {

  try {

    await db.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        details,
        ip_address
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        userId || null,
        action,
        details || null,
        ipAddress || null
      ]
    );

  } catch (err) {

    console.error(
      '❌ Audit log error:',
      err.message
    );

  }

};


// ======================================================
// TICKET / MANAGEMENT ROUTES
// ======================================================

// ------------------------------------------------------
// 1. Get All Tickets / Active Shifts
// ------------------------------------------------------
// ======================================================
// MANAGEMENT DASHBOARD - LIVE ACTIVE STAFF
// ======================================================

app.get(
  '/api/management/live-staff',
  requireSupervisorAccess,
  async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT
        a.id AS attendance_id,
        a.employee_id,
        a.clock_in,
        a.clock_in_latitude,
        a.clock_in_longitude,
        a.location_status,
        a.sync_status,

        u.name,
        u.surname,
        u.email,
        u.role,
        u.department,
        u.position,
        u.employment_status,
        u.account_status,

        COALESCE(
          NULLIF(u.profile_photo, ''),
          NULLIF(u.faceReferenceImage, '')
        ) AS profile_photo,

        d.name AS department_name,
        p.title AS position_title

      FROM attendance a

      INNER JOIN users u
        ON a.employee_id = u.id

      LEFT JOIN departments d
        ON u.department_id = d.id

      LEFT JOIN positions p
        ON u.position_id = p.id

      WHERE a.clock_in IS NOT NULL
        AND a.clock_out IS NULL

        AND a.id = (
          SELECT a2.id
          FROM attendance a2
          WHERE a2.employee_id = a.employee_id
            AND a2.clock_in IS NOT NULL
            AND a2.clock_out IS NULL
          ORDER BY a2.clock_in DESC, a2.id DESC
          LIMIT 1
        )

      ORDER BY a.clock_in DESC
    `);


    const liveStaff = rows.map((row) => ({

      attendance_id: row.attendance_id,

      employee_id: row.employee_id,

      name:
        `${row.name || ''} ${row.surname || ''}`.trim(),

      email: row.email,

      role: row.role,

      department:
        row.department_name ||
        row.department ||
        'General',

      position:
        row.position_title ||
        row.position ||
        'Employee',

      employment_status:
        row.employment_status,

      account_status:
        row.account_status,

      profile_photo:
        row.profile_photo || null,

      clock_in:
        row.clock_in,

      coords:
        row.clock_in_latitude !== null &&
        row.clock_in_longitude !== null
          ? {
              lat: Number(row.clock_in_latitude),
              lng: Number(row.clock_in_longitude)
            }
          : null,

      location_status:
        row.location_status,

      sync_status:
        row.sync_status,

      status: 'Working'

    }));


    return res.status(200).json({
      success: 1,
      count: liveStaff.length,
      staff: liveStaff
    });


  } catch (err) {

    console.error(
      '❌ Management live staff error:',
      err
    );

    return res.status(500).json({
      success: 0,
      message: 'Server error retrieving live staff.',
      details: err.sqlMessage || err.message
    });

  }

});

// ======================================================
// MANAGEMENT DASHBOARD - TODAY'S WORKFORCE OVERVIEW
// ======================================================

app.get(
  '/api/management/today-overview',
  requireSupervisorAccess,
  async (req, res) => {

    try {

      const [rows] = await db.query(`
        SELECT

          COUNT(*) AS total_employees,

          SUM(
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM attendance a
                WHERE a.employee_id = u.id
                  AND a.clock_in IS NOT NULL
                  AND a.clock_out IS NULL
              )
              THEN 1
              ELSE 0
            END
          ) AS on_duty,

          SUM(
            CASE
              WHEN NOT EXISTS (
                SELECT 1
                FROM attendance a
                WHERE a.employee_id = u.id
                  AND a.clock_in IS NOT NULL
                  AND a.clock_out IS NULL
              )
              AND EXISTS (
                SELECT 1
                FROM leave_requests lr
                WHERE lr.employee_id = u.id
                  AND LOWER(lr.status) = 'approved'
                  AND CURDATE()
                      BETWEEN lr.start_date
                      AND lr.end_date
              )
              THEN 1
              ELSE 0
            END
          ) AS on_leave

        FROM users u

        WHERE
          LOWER(
            COALESCE(
              u.employment_status,
              'active'
            )
          ) = 'active'

          AND

          LOWER(
            COALESCE(
              u.account_status,
              'active'
            )
          ) = 'active'
      `);


      const totalEmployees =
        Number(rows[0].total_employees || 0);

      const onDuty =
        Number(rows[0].on_duty || 0);

      const onLeave =
        Number(rows[0].on_leave || 0);


      const offDuty =
        Math.max(
          totalEmployees -
          onDuty -
          onLeave,
          0
        );


      return res.status(200).json({

        success: 1,

        overview: {

          total_employees:
            totalEmployees,

          on_duty:
            onDuty,

          off_duty:
            offDuty,

          on_leave:
            onLeave

        }

      });


    } catch (err) {

      console.error(
        '❌ Today overview error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving workforce overview.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// ======================================================
// MANAGEMENT - EMPLOYEE DIRECTORY
// ======================================================

app.get(
  '/api/management/employees',
  requireHRAccess,
  async (req, res) => {

    try {

      const [rows] = await db.query(`
        SELECT
          u.id,
          u.name,
          u.surname,
          u.email,
          u.idNumber,
          u.phone,
          u.role,

          COALESCE(
            d.name,
            u.department,
            'General'
          ) AS department,

          u.department_id,

          COALESCE(
            p.title,
            u.position,
            'Employee'
          ) AS position,

          u.position_id,

          u.employment_status,
          u.account_status,

          COALESCE(
            NULLIF(u.profile_photo, ''),
            NULLIF(u.faceReferenceImage, '')
          ) AS profile_photo,

          u.created_at

        FROM users u

        LEFT JOIN departments d
          ON u.department_id = d.id

        LEFT JOIN positions p
          ON u.position_id = p.id

        ORDER BY
          u.name ASC,
          u.surname ASC
      `);


      const employees = rows.map(
        (employee) => ({

          id:
            employee.id,

          name:
            `${employee.name || ''} ${employee.surname || ''}`.trim(),

          first_name:
            employee.name,

          surname:
            employee.surname,

          email:
            employee.email,

          idNumber:
            employee.idNumber,

          phone:
            employee.phone,

          role:
            employee.role,

          department:
            employee.department,

          department_id:
            employee.department_id,

          position:
            employee.position,

          position_id:
            employee.position_id,

          employment_status:
            employee.employment_status,

          account_status:
            employee.account_status,

          profile_photo:
            employee.profile_photo || null,

          created_at:
            employee.created_at

        })
      );


      return res.status(200).json({

        success: 1,

        count:
          employees.length,

        employees:
          employees

      });


    } catch (err) {

      console.error(
        '❌ Employee directory error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving employees.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// ======================================================
// MANAGEMENT - AUDIT LOGS
// ======================================================

app.get(
  '/api/management/audit-logs',
  requireHRAccess,
  async (req, res) => {

    try {

      const [rows] =
        await db.query(
          `
          SELECT
            al.id,
            al.user_id,
            al.action,
            al.details,
            al.ip_address,
            al.created_at,

            u.name,
            u.surname,
            u.email,
            u.role

          FROM audit_logs al

          LEFT JOIN users u
            ON al.user_id = u.id

          ORDER BY
            al.created_at DESC,
            al.id DESC

          LIMIT 200
          `
        );


      const logs =
        rows.map((log) => ({

          id:
            log.id,

          user_id:
            log.user_id,

          user_name:
            `${log.name || ''} ${log.surname || ''}`.trim() ||
            'System',

          email:
            log.email || null,

          role:
            log.role || null,

          action:
            log.action,

          details:
            log.details,

          ip_address:
            log.ip_address,

          created_at:
            log.created_at

        }));


      return res.status(200).json({

        success: 1,

        count:
          logs.length,

        logs:
          logs

      });


    } catch (err) {

      console.error(
        '❌ Audit log retrieval error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving audit logs.',

        details:
          err.sqlMessage ||
          err.message

     
    });

  }

});
      
      // ======================================================
// MANAGEMENT - ABSENTEEISM REPORT
// Finance-safe report endpoint
// ======================================================

app.get(
  '/api/management/absenteeism',
  requireFinanceAccess,
  async (req, res) => {

    try {

      const selectedDate =
        req.query.date;


      // --------------------------------------------------
      // VALIDATE DATE
      // --------------------------------------------------

      if (!selectedDate) {

        return res.status(400).json({
          success: 0,
          message:
            'Please provide a date.'
        });

      }


      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;


      if (
        !datePattern.test(
          selectedDate
        )
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Invalid date format. Use YYYY-MM-DD.'
        });

      }


      // --------------------------------------------------
      // FIND ACTIVE EMPLOYEES WHO:
      // 1. DID NOT CLOCK IN
      // 2. ARE NOT ON APPROVED LEAVE
      // --------------------------------------------------

      const [rows] =
        await db.query(
          `
          SELECT
            u.id,

            TRIM(
              CONCAT(
                COALESCE(u.name, ''),
                ' ',
                COALESCE(u.surname, '')
              )
            ) AS name,

            COALESCE(
              d.name,
              u.department,
              'General'
            ) AS department,

            COALESCE(
              p.title,
              u.position,
              'Employee'
            ) AS position

          FROM users u

          LEFT JOIN departments d
            ON u.department_id = d.id

          LEFT JOIN positions p
            ON u.position_id = p.id

          WHERE
            LOWER(
              COALESCE(
                u.employment_status,
                'Active'
              )
            ) = 'active'

          AND
            LOWER(
              COALESCE(
                u.account_status,
                'Active'
              )
            ) = 'active'

          AND NOT EXISTS (

            SELECT 1

            FROM attendance a

            WHERE
              a.employee_id = u.id

            AND
              DATE(a.clock_in) = ?

          )

          AND NOT EXISTS (

            SELECT 1

            FROM leave_requests lr

            WHERE
              lr.employee_id = u.id

            AND
              LOWER(
                COALESCE(
                  lr.status,
                  ''
                )
              ) = 'approved'

            AND
              ? BETWEEN
                lr.start_date
                AND lr.end_date

          )

          ORDER BY
            u.name ASC,
            u.surname ASC
          `,
          [
            selectedDate,
            selectedDate
          ]
        );


      // --------------------------------------------------
      // RETURN REPORT-SAFE DATA ONLY
      // --------------------------------------------------

      const absenteeism =
        rows.map(
          (employee) => ({

            id:
              employee.id,

            name:
              employee.name ||
              'Unknown Employee',

            department:
              employee.department,

            position:
              employee.position,

            absence_date:
              selectedDate,

            absence_status:
              'Absent',

            reason:
              'No attendance record'

          })
        );


      return res.status(200).json({

        success: 1,

        date:
          selectedDate,

        count:
          absenteeism.length,

        absenteeism:
          absenteeism

      });


    } catch (err) {

      console.error(
        '❌ Absenteeism report error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error generating absenteeism report.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

   

// ======================================================
// MANAGEMENT - UPDATE EMPLOYEE
// ======================================================

app.put(
  '/api/management/employees/:id',
  requireHRAccess,
  async (req, res) => {

    

    const employeeId =
      req.params.id;

    const {
  department,
  position,
  role,
  employment_status,
  account_status
} = req.body;


    try {

      // --------------------------------------------------
      // CHECK EMPLOYEE EXISTS
      // --------------------------------------------------

      const [employeeRows] =
        await db.query(
          `
          SELECT
            id,
            role
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [employeeId]
        );


      if (employeeRows.length === 0) {

        return res.status(404).json({
          success: 0,
          message: 'Employee not found.'
        });

      }
      // --------------------------------------------------
// VALIDATE / NORMALISE ROLE
// --------------------------------------------------

const currentRole =
  normalizeSystemRole(
    employeeRows[0].role
  );


const requestedRole =
  role
    ? normalizeSystemRole(role)
    : currentRole;


const validRoles = [
  'worker',
  'supervisor',
  'hr_admin',
  'finance',

  // Legacy management roles retained
  // so existing accounts are not broken.
  'admin',
  'manager'
];

// --------------------------------------------------
// PREVENT HR ADMIN FROM MANAGING ADMIN / MANAGER ROLES
// --------------------------------------------------

const requestingUserRole =
  normalizeSystemRole(
    req.user.role
  );


const protectedManagementRoles = [
  'admin',
  'manager'
];


if (
  requestingUserRole === 'hr_admin' &&
  (
    protectedManagementRoles.includes(
      currentRole
    ) ||
    protectedManagementRoles.includes(
      requestedRole
    )
  )
) {

  return res.status(403).json({
    success: 0,
    message:
      'HR administrators cannot assign or modify Admin or Manager accounts.'
  });

}


if (
  !validRoles.includes(
    requestedRole
  )
) {

  return res.status(400).json({
    success: 0,
    message:
      'Invalid employee role.'
  });

}


      // --------------------------------------------------
      // VALIDATE EMPLOYMENT STATUS
      // --------------------------------------------------

      const validEmploymentStatuses = [
        'Active',
        'Inactive',
        'Suspended',
        'Terminated'
      ];


      if (
        employment_status &&
        !validEmploymentStatuses.includes(
          employment_status
        )
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Invalid employment status.'
        });

      }


      // --------------------------------------------------
      // VALIDATE ACCOUNT STATUS
      // --------------------------------------------------

      const validAccountStatuses = [
        'Active',
        'Inactive',
        'Suspended'
      ];


      if (
        account_status &&
        !validAccountStatuses.includes(
          account_status
        )
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Invalid account status.'
        });

      }


      // --------------------------------------------------
      // UPDATE EMPLOYEE
      // --------------------------------------------------

      await db.query(
        `
        UPDATE users
SET
  department = ?,
  position = ?,
  role = ?,
  employment_status = ?,
  account_status = ?
WHERE id = ?
        `,
        [
  department || 'General',

  position || 'Employee',

  requestedRole,

  employment_status || 'Active',

  account_status || 'Active',

  employeeId
]
      );


      console.log(
  `✅ Employee ${employeeId} updated successfully`
);


// --------------------------------------------------
// AUDIT LOG
// --------------------------------------------------

await writeAuditLog(
  req.user.userId,
  'EMPLOYEE_UPDATED',
  `Employee ID ${employeeId} updated. ` +
`Department: ${department || 'General'}, ` +
`Position: ${position || 'Employee'}, ` +
`Role: ${requestedRole}, ` +
`Employment Status: ${employment_status || 'Active'}, ` +
`Account Status: ${account_status || 'Active'}`,
  req.ip
);


return res.status(200).json({
  success: 1,
  message:
    'Employee record updated successfully.'
});


    } catch (err) {

      console.error(
        '❌ Employee update error:',
        err
      );


      return res.status(500).json({
        success: 0,
        message:
          'Server error updating employee.',
        details:
          err.sqlMessage ||
          err.message
      });

    }

  }
);

// ------------------------------------------------------
// 2. Get Staff Suggestions / Feedback
// ------------------------------------------------------
app.get(
  '/api/tickets/get-suggestions',
  requireManagement,
  async (req, res) => {

  try {

    const [rows] = await db.query(
      'SELECT * FROM suggestions ORDER BY created_at DESC'
    );

    res.json(rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error fetching suggestions'
    });

  }

});


// ------------------------------------------------------
// 3. Clear Staff Feedback
// ------------------------------------------------------
app.delete(
  '/api/tickets/clear-suggestions',
  requireManagement,
  async (req, res) => {

  try {

    await db.query(
      'DELETE FROM suggestions'
    );

    res.json({
      message: 'Feedback log cleared successfully'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error clearing suggestions'
    });

  }

});


// ======================================================
// EMPLOYEE - SUBMIT LEAVE REQUEST
// ======================================================

app.post('/api/tickets/submit-leave', async (req, res) => {

  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      success: 0,
      message: 'Authentication required.'
    });
  }

  try {

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const employeeId = decoded.userId;

    const {
      type,
      startDate,
      endDate,
      reason
    } = req.body;


    if (
      !type ||
      !startDate ||
      !endDate ||
      !reason
    ) {
      return res.status(400).json({
        success: 0,
        message: 'Please complete all leave fields.'
      });
    }


    if (
      new Date(endDate) <
      new Date(startDate)
    ) {
      return res.status(400).json({
        success: 0,
        message:
          'Leave end date cannot be before the start date.'
      });
    }


    const [employees] = await db.query(
      `
      SELECT
        id,
        name,
        surname
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [employeeId]
    );


    if (employees.length === 0) {
      return res.status(404).json({
        success: 0,
        message: 'Employee not found.'
      });
    }


    const employee = employees[0];

    const employeeName =
      `${employee.name || ''} ${employee.surname || ''}`
        .trim();


    const [result] = await db.query(
      `
      INSERT INTO leave_requests (
        employee_id,
        employee,
        type,
        start_date,
        end_date,
        reason,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [
        employeeId,
        employeeName || 'Employee',
        type,
        startDate,
        endDate,
        reason
      ]
    );


    return res.status(201).json({
      success: 1,
      message:
        'Leave application submitted to management.',
      leaveRequestId: result.insertId
    });


  } catch (err) {

    console.error(
      '❌ Leave submission error:',
      err
    );

    return res.status(500).json({
      success: 0,
      message:
        'Unable to submit leave application.',
      details:
        err.sqlMessage || err.message
    });

  }

});

// ======================================================
// EMPLOYEE - GET OWN LEAVE REQUESTS
// ======================================================

app.get('/api/employee/leave-requests', async (req, res) => {

  const authHeader = req.headers.authorization;


  // --------------------------------------------------
  // CHECK AUTHENTICATION
  // --------------------------------------------------

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {

    return res.status(401).json({
      success: 0,
      message: 'Authentication required.'
    });

  }


  const token =
    authHeader.split(' ')[1];


  let decoded;


  try {

    decoded = jwt.verify(
      token,
      JWT_SECRET
    );

  } catch (err) {

    return res.status(401).json({
      success: 0,
      message:
        'Invalid or expired authentication token.'
    });

  }


  const employeeId =
    decoded.userId;


  try {

    const [rows] = await db.query(
      `
      SELECT
        id,
        employee_id,
        employee,
        type,
        start_date,
        end_date,
        reason,
        status,
        created_at
      FROM leave_requests
      WHERE employee_id = ?
      ORDER BY created_at DESC
      `,
      [employeeId]
    );


    return res.status(200).json({
      success: 1,
      leaveRequests: rows
    });


  } catch (err) {

    console.error(
      '❌ Employee leave history error:',
      err
    );


    return res.status(500).json({
      success: 0,
      message:
        'Unable to retrieve leave applications.',
      details:
        err.sqlMessage || err.message
    });

  }

});

// ======================================================
// EMPLOYEE - GET OWN NOTIFICATIONS
// ======================================================

app.get(
  '/api/employee/notifications',
  requireAuth,
  async (req, res) => {

    try {

      const employeeId =
        req.user.userId;


      const [rows] =
        await db.query(
          `
          SELECT
            id,
            notification_type,
            title,
            message,
            is_read,
            created_at
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 50
          `,
          [employeeId]
        );


      return res.status(200).json({
        success: 1,
        notifications: rows
      });


    } catch (err) {

      console.error(
        '❌ Employee notifications error:',
        err
      );


      return res.status(500).json({
        success: 0,
        message:
          'Unable to retrieve notifications.',
        details:
          err.sqlMessage ||
          err.message
      });

    }

  }
);

// ------------------------------------------------------
// 4. Get Leave Requests
// ------------------------------------------------------
// ======================================================
// EMPLOYEE - MARK ALL OWN NOTIFICATIONS AS READ
// ======================================================

app.put(
  '/api/employee/notifications/read-all',
  requireAuth,
  async (req, res) => {
    try {
      const [result] = await db.query(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
          AND is_read = 0
        `,
        [req.user.userId]
      );

      return res.status(200).json({
        success: 1,
        message: 'Notifications marked as read.',
        updated: result.affectedRows
      });
    } catch (err) {
      console.error('❌ Mark-all notifications error:', err);
      return res.status(500).json({
        success: 0,
        message: 'Unable to update notifications.',
        details: err.sqlMessage || err.message
      });
    }
  }
);

// ======================================================
// EMPLOYEE - MARK OWN NOTIFICATION AS READ
// ======================================================

app.put(
  '/api/employee/notifications/:id/read',
  requireAuth,
  async (req, res) => {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: 0,
        message: 'Invalid notification ID.'
      });
    }

    try {
      const [result] = await db.query(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE id = ?
          AND user_id = ?
        `,
        [notificationId, req.user.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: 0,
          message: 'Notification not found.'
        });
      }

      return res.status(200).json({
        success: 1,
        message: 'Notification marked as read.'
      });
    } catch (err) {
      console.error('❌ Notification read update error:', err);
      return res.status(500).json({
        success: 0,
        message: 'Unable to update notification.',
        details: err.sqlMessage || err.message
      });
    }
  }
);

app.get(
  '/api/tickets/get-leave-requests',
  requireSupervisorAccess,
  async (req, res) => {

  try {

    const [rows] = await db.query(
      'SELECT * FROM leave_requests ORDER BY created_at DESC'
    );

    res.json(rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error fetching leave requests'
    });

  }

});


// ------------------------------------------------------
// 5. Update Leave Request Status
// ------------------------------------------------------
// ======================================================
// UPDATE LEAVE STATUS + 30% WORKFORCE CONFLICT CHECK
// ======================================================
// ======================================================
// LEAVE BALANCE HELPERS
// ======================================================

// South African working-day calculation automatically excludes
// weekends, fixed public holidays, Good Friday, Family Day and
// observed Mondays when a public holiday falls on a Sunday.
const countWorkingLeaveDays =
  countSouthAfricanWorkingDays;


// Recalculate only the leave cycle containing referenceValue.
const recalculateLeaveBalance =
  async (
    employeeId,
    leaveType,
    referenceValue = new Date()
  ) => {

    return recalculateCurrentLeaveBalance(
      db,
      employeeId,
      leaveType,
      referenceValue
    );

  };



  // ======================================================
// EMPLOYEE - VIEW OWN LEAVE BALANCES
// ======================================================

app.get(
  '/api/leave/my-balances',
  requireAuth,
  async (req, res) => {

    try {

      const employeeId =
        req.user.userId;


      // Keep the employee on the current automatic leave cycle.
      await ensureCurrentLeaveBalances(
        db,
        employeeId
      );


      // Recalculate each policy so approved leave and public
      // holidays are reflected before balances are displayed.
      for (const leaveType of [
        'Annual Leave',
        'Sick Leave',
        'Family Responsibility Leave'
      ]) {
        await recalculateLeaveBalance(
          employeeId,
          leaveType
        );
      }


      const [rows] =
        await db.query(
          `
          SELECT
            id,
            employee_id,
            leave_type,
            allocated_days,
            used_days,
            remaining_days,
            cycle_start,
            cycle_end
          FROM leave_balances
          WHERE employee_id = ?
          ORDER BY
            CASE leave_type
              WHEN 'Annual Leave' THEN 1
              WHEN 'Sick Leave' THEN 2
              WHEN 'Family Responsibility Leave' THEN 3
              ELSE 4
            END,
            leave_type
          `,
          [employeeId]
        );


      const balances =
        rows.map(
          (balance) => ({

            id:
              balance.id,

            employee_id:
              balance.employee_id,

            leave_type:
              balance.leave_type,

            allocated_days:
              Number(
                balance.allocated_days || 0
              ),

            used_days:
              Number(
                balance.used_days || 0
              ),

            remaining_days:
              Number(
                balance.remaining_days || 0
              ),

            cycle_start:
              balance.cycle_start,

            cycle_end:
              balance.cycle_end

          })
        );


      return res.status(200).json({

        success: 1,

        count:
          balances.length,

        balances:
          balances

      });


    } catch (err) {

      console.error(
        '❌ Leave balance retrieval error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving leave balances.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

app.put(
  '/api/tickets/update-leave-status',
  requireSupervisorAccess,
  async (req, res) => {

    const { id, status } = req.body;


    // --------------------------------------------------
    // VALIDATE INPUT
    // --------------------------------------------------

    if (!id || !status) {

      return res.status(400).json({
        success: 0,
        message:
          'Missing required fields (id, status).'
      });

    }


    const normalizedStatus =
      String(status).trim().toLowerCase();


    if (
      normalizedStatus !== 'approved' &&
      normalizedStatus !== 'denied' &&
      normalizedStatus !== 'rejected'
    ) {

      return res.status(400).json({
        success: 0,
        message:
          'Invalid leave status.'
      });

    }


    try {

      // --------------------------------------------------
      // GET THE LEAVE REQUEST
      // --------------------------------------------------

      const [leaveRows] =
        await db.query(
          `
          SELECT
            id,
            employee_id,
            employee,
            type,
            start_date,
            end_date,
            status
          FROM leave_requests
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );


      if (leaveRows.length === 0) {

        return res.status(404).json({
          success: 0,
          message:
            'Leave request not found.'
        });

      }


      const leaveRequest =
        leaveRows[0];


      const requestStartCycle =
        getCalendarLeaveCycle(
          leaveRequest.start_date
        );

      const requestEndCycle =
        getCalendarLeaveCycle(
          leaveRequest.end_date
        );


      if (
        requestStartCycle.year !==
        requestEndCycle.year
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Leave requests that cross two calendar leave cycles must be submitted as separate requests.'
        });

      }


      // Create or roll over the correct cycle before any
      // balance validation is performed.
      await ensureCurrentLeaveBalances(
        db,
        leaveRequest.employee_id,
        leaveRequest.start_date
      );


      // --------------------------------------------------
      // ONLY RUN 30% CHECK WHEN APPROVING
      // --------------------------------------------------

      if (normalizedStatus === 'approved') {

        if (
          !leaveRequest.start_date ||
          !leaveRequest.end_date
        ) {

          return res.status(400).json({
            success: 0,
            message:
              'Leave request has invalid dates.'
          });

        }

        // --------------------------------------------------
        // CHECK AVAILABLE LEAVE BALANCE
        // --------------------------------------------------

        const requestedWorkingDays =
          countWorkingLeaveDays(
            leaveRequest.start_date,
            leaveRequest.end_date
          );


        const currentLeaveStatus =
          String(
            leaveRequest.status || ''
          )
            .trim()
            .toLowerCase();


        // Only perform a new deduction check when
        // the request is not already approved.
        if (
          currentLeaveStatus !== 'approved'
        ) {

          const [balanceRows] =
            await db.query(
              `
              SELECT
                allocated_days,
                used_days,
                remaining_days
              FROM leave_balances
              WHERE employee_id = ?
                AND leave_type = ?
              LIMIT 1
              `,
              [
                leaveRequest.employee_id,
                leaveRequest.type
              ]
            );


          if (
            balanceRows.length === 0
          ) {

            return res.status(400).json({
              success: 0,
              message:
                `No ${leaveRequest.type} balance exists for this employee.`
            });

          }


          const remainingDays =
            Number(
              balanceRows[0]
                .remaining_days || 0
            );


          if (
            requestedWorkingDays >
            remainingDays
          ) {

            return res.status(409).json({

              success: 0,

              balance_conflict: true,

              message:
                `Leave approval blocked. ` +
                `This request requires ${requestedWorkingDays} working day(s), ` +
                `but the employee only has ${remainingDays.toFixed(2)} day(s) remaining.`,

              leave_type:
                leaveRequest.type,

              requested_days:
                requestedWorkingDays,

              remaining_days:
                remainingDays

            });

          }

        }
        // --------------------------------------------------
        // COUNT ACTIVE EMPLOYEES
        // --------------------------------------------------

        const [employeeCountRows] =
          await db.query(
            `
            SELECT
              COUNT(*) AS total_employees
            FROM users
            WHERE
              LOWER(
                COALESCE(
                  employment_status,
                  'active'
                )
              ) = 'active'

              AND

              LOWER(
                COALESCE(
                  account_status,
                  'active'
                )
              ) = 'active'
            `
          );


        const totalEmployees =
          Number(
            employeeCountRows[0]
              .total_employees || 0
          );


        if (totalEmployees === 0) {

          return res.status(400).json({
            success: 0,
            message:
              'No active employees were found.'
          });

        }


        // --------------------------------------------------
        // GET OTHER APPROVED OVERLAPPING LEAVE
        // --------------------------------------------------

        const [approvedLeaves] =
          await db.query(
            `
            SELECT
              id,
              employee_id,
              start_date,
              end_date
            FROM leave_requests
            WHERE
              LOWER(status) = 'approved'

              AND id <> ?

              AND start_date <= ?

              AND end_date >= ?
            `,
            [
              id,
              leaveRequest.end_date,
              leaveRequest.start_date
            ]
          );


        // --------------------------------------------------
        // CHECK EACH DAY
        // --------------------------------------------------

        const startDate =
          new Date(
            leaveRequest.start_date
          );

        const endDate =
          new Date(
            leaveRequest.end_date
          );


        startDate.setHours(
          0,
          0,
          0,
          0
        );

        endDate.setHours(
          0,
          0,
          0,
          0
        );


        if (startDate > endDate) {

          return res.status(400).json({
            success: 0,
            message:
              'Leave start date cannot be after the end date.'
          });

        }


        let currentDate =
          new Date(startDate);

        let conflictFound =
          false;

        let conflictDate =
          null;

        let employeesOff =
          0;

        let leavePercentage =
          0;


        while (
          currentDate <= endDate
        ) {

          const employeesOffToday =
            new Set();


          if (
            leaveRequest.employee_id
          ) {

            employeesOffToday.add(
              Number(
                leaveRequest.employee_id
              )
            );

          }


          approvedLeaves.forEach(
            (approvedLeave) => {

              if (
                !approvedLeave.start_date ||
                !approvedLeave.end_date
              ) {
                return;
              }


              const approvedStart =
                new Date(
                  approvedLeave.start_date
                );

              const approvedEnd =
                new Date(
                  approvedLeave.end_date
                );


              approvedStart.setHours(
                0,
                0,
                0,
                0
              );

              approvedEnd.setHours(
                0,
                0,
                0,
                0
              );


              if (
                currentDate >= approvedStart &&
                currentDate <= approvedEnd
              ) {

                if (
                  approvedLeave.employee_id
                ) {

                  employeesOffToday.add(
                    Number(
                      approvedLeave.employee_id
                    )
                  );

                }

              }

            }
          );


          const percentage =
            (
              employeesOffToday.size /
              totalEmployees
            ) * 100;


          if (percentage > 30) {

            conflictFound =
              true;

            conflictDate =
              new Date(currentDate);

            employeesOff =
              employeesOffToday.size;

            leavePercentage =
              percentage;

            break;

          }


          currentDate.setDate(
            currentDate.getDate() + 1
          );

        }


        // --------------------------------------------------
        // BLOCK CONFLICT
        // --------------------------------------------------

        if (conflictFound) {

          return res.status(409).json({

            success: 0,

            conflict: true,

            message:
              `Leave approval blocked. ` +
              `${employeesOff} of ${totalEmployees} active employees ` +
              `would be on leave on ` +
              `${conflictDate.toLocaleDateString()}. ` +
              `This equals ${leavePercentage.toFixed(1)}%, ` +
              `which exceeds the 30% workforce limit.`,

            conflict_date:
              conflictDate,

            employees_off:
              employeesOff,

            total_employees:
              totalEmployees,

            percentage:
              Number(
                leavePercentage.toFixed(1)
              ),

            allowed_percentage:
              30

          });

        }

      }


      // --------------------------------------------------
      // SAVE STATUS
      // --------------------------------------------------

      const finalStatus =
        normalizedStatus === 'approved'
          ? 'Approved'
          : 'Denied';



      const leaveStatusChanged =
        String(leaveRequest.status || '')
          .trim()
          .toLowerCase() !==
        finalStatus.toLowerCase();


      await db.query(
        `
        UPDATE leave_requests
        SET status = ?
        WHERE id = ?
        `,
        [
          finalStatus,
          id
        ]
      );

      // --------------------------------------------------
// RECALCULATE EMPLOYEE LEAVE BALANCE
// --------------------------------------------------

const updatedLeaveBalance =
  await recalculateLeaveBalance(
    leaveRequest.employee_id,
    leaveRequest.type,
    leaveRequest.start_date
  );


      // --------------------------------------------------
      // AUDIT LOG
      // --------------------------------------------------

      await writeAuditLog(
        req.user.userId,
        'LEAVE_STATUS_UPDATED',
        `Leave request ID ${id} for employee ID ${leaveRequest.employee_id} was marked as ${finalStatus}.`,
        req.ip
      );
      // --------------------------------------------------
// NOTIFY EMPLOYEE ABOUT LEAVE DECISION
// --------------------------------------------------

const leaveType =
  leaveRequest.type ||
  'Leave';


const notificationTitle =
  finalStatus === 'Approved'
    ? `✅ ${leaveType} Approved`
    : `❌ ${leaveType} Denied`;


const notificationMessage =
  finalStatus === 'Approved'
    ? `Your ${leaveType} request has been approved.`
    : `Your ${leaveType} request has been denied.`;


if (leaveStatusChanged) {

  try {

    await db.query(
      `
      INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        is_read
      )
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        leaveRequest.employee_id,
        'leave',
        notificationTitle,
        notificationMessage
      ]
    );

  } catch (notificationError) {

    console.error(
      '❌ Leave notification error:',
      notificationError
    );

  }

}


      return res.status(200).json({

        success: 1,

        message:
          `Leave request marked as ${finalStatus}.`

      });


    } catch (err) {

      console.error(
        '❌ Leave status update error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error updating leave status.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);
// ======================================================
// EMPLOYEE PERSONNEL FILE (PF)
// ======================================================

app.get(
  '/api/employees/:id',
  requireAuth,
  async (req, res) => {

    const employeeId =
      Number(req.params.id);


    // --------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid employee ID.'
      });

    }


    // --------------------------------------------------
    // ACCESS CONTROL
    // --------------------------------------------------
    // Employees may only view their own PF.
    // Admins and managers may view any employee PF.
    // --------------------------------------------------

    const loggedInUserId =
      Number(req.user.userId);

    const loggedInRole =
      (
        req.user.role ||
        'employee'
      ).toLowerCase();


    const isManagement =
  loggedInRole === 'admin' ||
  loggedInRole === 'manager' ||
  loggedInRole === 'hr_admin';


    const isOwnProfile =
      loggedInUserId === employeeId;


    if (
      !isManagement &&
      !isOwnProfile
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'You are not authorized to view this employee record.'
      });

    }


    try {

      const [rows] =
        await db.query(
          `
          SELECT
            u.id,
            u.name,
            u.surname,
            u.email,
            u.idNumber,
            u.phone,
            u.role,
            u.department,
            u.department_id,
            u.position,
            u.position_id,
            u.employment_status,
            u.account_status,

            COALESCE(
              NULLIF(u.profile_photo, ''),
              NULLIF(u.faceReferenceImage, '')
            ) AS profile_photo,

            u.faceReferenceImage,
            u.created_at,

            d.name AS department_name,

            p.title AS position_title

          FROM users u

          LEFT JOIN departments d
            ON u.department_id = d.id

          LEFT JOIN positions p
            ON u.position_id = p.id

          WHERE u.id = ?

          LIMIT 1
          `,
          [employeeId]
        );


      // --------------------------------------------------
      // EMPLOYEE NOT FOUND
      // --------------------------------------------------

      if (
        rows.length === 0
      ) {

        return res.status(404).json({
          success: 0,
          message: 'Employee not found.'
        });

      }


      const employee =
        rows[0];


      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      return res.status(200).json({
        success: 1,
        message:
          'Employee PF retrieved successfully.',
        employee:
          employee
      });


    } catch (err) {

      console.error(
        '❌ Error retrieving employee PF:',
        err
      );


      return res.status(500).json({
        success: 0,
        message:
          'Server error retrieving employee PF.',
        details:
          err.sqlMessage ||
          err.message
      });

    }

  }
);

// ======================================================
// EMPLOYEE DOCUMENTS - GET DOCUMENTS
// ======================================================

app.get(
  '/api/documents/employee/:id',
  requireAuth,
  async (req, res) => {

    const employeeId =
      Number(req.params.id);

    const loggedInUserId =
      Number(req.user.userId);

    const loggedInRole =
      (req.user.role || 'employee')
        .toLowerCase();


    // --------------------------------------------------
    // VALIDATE EMPLOYEE ID
    // --------------------------------------------------

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid employee ID.'
      });

    }


    // --------------------------------------------------
    // ACCESS CONTROL
    // --------------------------------------------------

    const isManagement =
  loggedInRole === 'admin' ||
  loggedInRole === 'manager' ||
  loggedInRole === 'hr_admin';

    const isOwnProfile =
      loggedInUserId === employeeId;


    if (
      !isManagement &&
      !isOwnProfile
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'You are not authorized to view these documents.'
      });

    }


    try {

      const [rows] =
        await db.query(
          `
          SELECT
            id,
            employee_id,
            document_type,
            file_path,
            DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
            uploaded_at,
            updated_at
          FROM documents
          WHERE employee_id = ?
          ORDER BY uploaded_at DESC
          `,
          [employeeId]
        );


      return res.status(200).json({

        success: 1,

        count:
          rows.length,

        documents:
          rows

      });


    } catch (err) {

      console.error(
        '❌ Employee documents error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving employee documents.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);
// ======================================================
// EMPLOYEE DOCUMENTS - UPLOAD DOCUMENT
// ======================================================

app.post(
  '/api/documents/upload',
  requireAuth,
  async (req, res) => {

   const {
  employee_id,
  document_type,
  file_path,
  expiry_date
} = req.body;

const normalizedExpiryDate =
  expiry_date &&
  String(expiry_date).trim()
    ? String(expiry_date).trim()
    : null;


    const employeeId =
      Number(employee_id);

    const loggedInUserId =
      Number(req.user.userId);

    const loggedInRole =
      (req.user.role || 'employee')
        .toLowerCase();


     
    // --------------------------------------------------
    // VALIDATE EMPLOYEE ID
    // --------------------------------------------------

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid employee ID.'
      });

    }


    // --------------------------------------------------
    // ACCESS CONTROL
    // --------------------------------------------------

    const isManagement =
  loggedInRole === 'admin' ||
  loggedInRole === 'manager' ||
  loggedInRole === 'hr_admin';

    const isOwnProfile =
      loggedInUserId === employeeId;


    if (
      !isManagement &&
      !isOwnProfile
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'You are not authorized to upload documents for this employee.'
      });

    }


    // --------------------------------------------------
    // VALIDATE DOCUMENT
    // --------------------------------------------------

    if (
      !document_type ||
      !String(document_type).trim()
    ) {

      return res.status(400).json({
        success: 0,
        message:
          'Document type is required.'
      });

    }


    if (
      !file_path ||
      !String(file_path).trim()
    ) {

      return res.status(400).json({
        success: 0,
        message:
          'Document file is required.'
      });

    }


    try {

      // --------------------------------------------------
      // MAKE SURE EMPLOYEE EXISTS
      // --------------------------------------------------

      const [employeeRows] =
        await db.query(
          `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [employeeId]
        );


      if (employeeRows.length === 0) {

        return res.status(404).json({
          success: 0,
          message:
            'Employee not found.'
        });

      }


      // --------------------------------------------------
      // SAVE DOCUMENT
      // --------------------------------------------------

      const [result] =
  await db.query(
    `
    INSERT INTO documents (
      employee_id,
      document_type,
      file_path,
      expiry_date
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      employeeId,
      String(document_type).trim(),
      file_path,
      normalizedExpiryDate
    ]
  );


      // --------------------------------------------------
      // AUDIT LOG
      // --------------------------------------------------

      await writeAuditLog(
        req.user.userId,
        'DOCUMENT_UPLOADED',
        `Document ID ${result.insertId} (${String(document_type).trim()}) uploaded for employee ID ${employeeId}.`,
        req.ip
      );


      return res.status(201).json({

        success: 1,

        message:
          'Document uploaded successfully.',

        documentId:
          result.insertId

      });


    } catch (err) {

      console.error(
        '❌ Document upload error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error uploading document.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);
   // ======================================================
// EMPLOYEE DOCUMENTS - DELETE DOCUMENT
// ======================================================

app.delete(
  '/api/documents/:id',
  requireHRAccess,
  async (req, res) => {

    const documentId =
      Number(req.params.id);


    // --------------------------------------------------
    // VALIDATE DOCUMENT ID
    // --------------------------------------------------

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid document ID.'
      });

    }


    try {

      // --------------------------------------------------
      // FIND DOCUMENT FIRST
      // --------------------------------------------------

      const [rows] =
        await db.query(
          `
          SELECT
            id,
            employee_id,
            document_type
          FROM documents
          WHERE id = ?
          LIMIT 1
          `,
          [documentId]
        );


      if (rows.length === 0) {

        return res.status(404).json({
          success: 0,
          message: 'Document not found.'
        });

      }


      const document =
        rows[0];


      // --------------------------------------------------
      // DELETE DOCUMENT
      // --------------------------------------------------

      await db.query(
        `
        DELETE FROM documents
        WHERE id = ?
        `,
        [documentId]
      );


      // --------------------------------------------------
      // AUDIT LOG
      // --------------------------------------------------

      await writeAuditLog(
        req.user.userId,
        'DOCUMENT_DELETED',
        `Document ID ${documentId} (${document.document_type}) deleted from employee ID ${document.employee_id}.`,
        req.ip
      );


      return res.status(200).json({

        success: 1,

        message:
          'Document deleted successfully.'

      });


    } catch (err) {

      console.error(
        '❌ Document deletion error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error deleting document.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// ======================================================
// ATTENDANCE / CLOCK-IN & CLOCK-OUT
// ======================================================


// ======================================================
// AUTHORISED ATTENDANCE GEOFENCES
// ======================================================

// Required Phase 2/3 geofence radius
const GEOFENCE_RADIUS_METERS = 50;


// ------------------------------------------------------
// AUTHORISED WORK LOCATIONS
// ------------------------------------------------------


const AUTHORIZED_WORK_LOCATIONS = [

  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 1
  // Current tested Central Campus point
  // ====================================================
  {
    id: 'spu-central-zone-1',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.748350,

    lng:
      24.763800,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  },


  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 2
  // Moroka Hall C001 area
  // ====================================================
  {
    id: 'spu-central-zone-2',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.748433,

    lng:
      24.764289,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  },


  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 3
  // Moroka Hall C002 area
  // ====================================================
  {
    id: 'spu-central-zone-3',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.749019,

    lng:
      24.764469,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  },


  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 4
  // Library & Student Resource Centre area
  // ====================================================
  {
    id: 'spu-central-zone-4',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.748950,

    lng:
      24.765020,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  }

];

// ------------------------------------------------------
// LOCATION 2: TEMPORARY DEVELOPMENT LOCATION
//
// The coordinates are stored in server/.env so that
// private location information is NOT pushed to GitHub.
// ------------------------------------------------------

const developmentLatitude =
  Number(
    process.env.DEV_GEOFENCE_LAT
  );

const developmentLongitude =
  Number(
    process.env.DEV_GEOFENCE_LNG
  );


if (
  Number.isFinite(
    developmentLatitude
  ) &&
  Number.isFinite(
    developmentLongitude
  )
) {

  AUTHORIZED_WORK_LOCATIONS.push({

    id:
      'temporary-development-site',

    name:
      'Temporary Development Site',

    lat:
      developmentLatitude,

    lng:
      developmentLongitude,

    radiusMeters:
      GEOFENCE_RADIUS_METERS

  });

}


// ======================================================
// HAVERSINE DISTANCE CALCULATION
// ======================================================

const calculateDistanceMeters = (
  lat1,
  lon1,
  lat2,
  lon2
) => {

  const earthRadius =
    6371000;

  const toRadians = (
    degrees
  ) => {

    return (
      degrees *
      (Math.PI / 180)
    );

  };


  const dLat =
    toRadians(
      lat2 - lat1
    );

  const dLon =
    toRadians(
      lon2 - lon1
    );


  const a =

    Math.sin(
      dLat / 2
    ) *
    Math.sin(
      dLat / 2
    )

    +

    Math.cos(
      toRadians(lat1)
    ) *

    Math.cos(
      toRadians(lat2)
    ) *

    Math.sin(
      dLon / 2
    ) *

    Math.sin(
      dLon / 2
    );


  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );


  return (
    earthRadius * c
  );

};


// ======================================================
// CHECK USER AGAINST ALL AUTHORISED LOCATIONS
// ======================================================

const evaluateGeofence = (
  latitude,
  longitude
) => {

  if (
    AUTHORIZED_WORK_LOCATIONS.length === 0
  ) {

    return {
      inZone: false,
      locationName: null,
      distance: null,
      allowedRadius:
        GEOFENCE_RADIUS_METERS
    };

  }


  const locationResults =
    AUTHORIZED_WORK_LOCATIONS.map(
      (location) => {

        const distance =
          calculateDistanceMeters(

            latitude,
            longitude,

            location.lat,
            location.lng

          );


        return {

          ...location,

          distance

        };

      }
    );


  // Find the closest authorised workplace
  locationResults.sort(
    (a, b) =>
      a.distance -
      b.distance
  );


  const nearestLocation =
    locationResults[0];


  return {

    inZone:

      nearestLocation.distance <=
      nearestLocation.radiusMeters,

    locationName:
      nearestLocation.name,

    locationId:
      nearestLocation.id,

    distance:
      nearestLocation.distance,

    allowedRadius:
      nearestLocation.radiusMeters

  };
};

// ======================================================
// PHASE 4 - OFFLINE SYNC, PUBLIC HOLIDAYS AND TRUSTED TIME
// ======================================================
registerPhase4EnhancementRoutes({
  app,
  db,
  requireAuth,
  evaluateGeofence,
  authorizedLocations:
    AUTHORIZED_WORK_LOCATIONS,
  writeAuditLog,
  trustedTimeService
});


  // ======================================================
// ATTENDANCE - CHECK CURRENT LOCATION
// ======================================================

app.post(
  '/api/attendance/check-location',
  requireAuth,
  async (req, res) => {

    const {
      latitude,
      longitude
    } = req.body;


    // --------------------------------------------------
    // GPS LOCATION REQUIRED
    // --------------------------------------------------

    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {

      return res.status(400).json({
        success: 0,
        message: 'GPS location is required.'
      });

    }


    // --------------------------------------------------
    // CONVERT GPS VALUES TO NUMBERS
    // --------------------------------------------------

    const employeeLatitude =
      Number(latitude);

    const employeeLongitude =
      Number(longitude);


    // --------------------------------------------------
    // VALIDATE GPS VALUES
    // --------------------------------------------------

    if (
      !Number.isFinite(employeeLatitude) ||
      !Number.isFinite(employeeLongitude)
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid GPS coordinates.'
      });

    }


    // --------------------------------------------------
    // VALIDATE GPS RANGES
    // --------------------------------------------------

    if (
      employeeLatitude < -90 ||
      employeeLatitude > 90 ||
      employeeLongitude < -180 ||
      employeeLongitude > 180
    ) {

      return res.status(400).json({
        success: 0,
        message:
          'GPS coordinates are outside valid ranges.'
      });

    }


    // --------------------------------------------------
    // CHECK AGAINST AUTHORISED GEOFENCES
    // --------------------------------------------------

    const geofence =
      evaluateGeofence(
        employeeLatitude,
        employeeLongitude
      );


    console.log(
      `📍 Location check for employee ${req.user.userId}: ` +
      `${geofence.distance.toFixed(2)}m from ` +
      `${geofence.locationName}`
    );


    // --------------------------------------------------
    // RETURN LOCATION RESULT
    // --------------------------------------------------

    return res.status(200).json({

      success: 1,

      inZone:
        geofence.inZone,

      locationName:
        geofence.locationName,

      locationId:
        geofence.locationId,

      distance:
        Number(
          geofence.distance.toFixed(1)
        ),

      allowedRadius:
        geofence.allowedRadius

    });

  }
);
// ======================================================
// AUTO CLOCK-OUT - LEFT AUTHORISED GEOFENCE
// ======================================================

app.put(
  '/api/attendance/auto-clock-out-geofence',
  requireAuth,
  async (req, res) => {

    const employeeId =
      Number(req.user.userId);


    const {
      latitude,
      longitude
    } = req.body;


    // --------------------------------------------------
    // VALIDATE EMPLOYEE
    // --------------------------------------------------

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0
    ) {

      return res.status(401).json({
        success: 0,
        message: 'Invalid authenticated user.'
      });

    }


    // --------------------------------------------------
    // VALIDATE GPS
    // --------------------------------------------------

    const employeeLatitude =
      Number(latitude);

    const employeeLongitude =
      Number(longitude);


    if (
      !Number.isFinite(employeeLatitude) ||
      !Number.isFinite(employeeLongitude)
    ) {

      return res.status(400).json({
        success: 0,
        message:
          'Valid GPS coordinates are required.'
      });

    }


    // --------------------------------------------------
    // CHECK AUTHORISED GEOFENCE
    // --------------------------------------------------

    const geofence =
      evaluateGeofence(
        employeeLatitude,
        employeeLongitude
      );


    // This endpoint must NEVER auto clock-out
    // somebody who is still inside an authorised zone.

    if (geofence.inZone) {

      return res.status(400).json({
        success: 0,
        message:
          'Employee is still inside the authorised geofence.'
      });

    }


    try {

      // --------------------------------------------------
      // FIND ACTIVE SHIFT
      // --------------------------------------------------

      const [activeShift] =
        await db.query(
          `
          SELECT
            id,
            clock_in
          FROM attendance
          WHERE employee_id = ?
            AND clock_in IS NOT NULL
            AND clock_out IS NULL
          ORDER BY clock_in DESC
          LIMIT 1
          `,
          [employeeId]
        );


      if (
        activeShift.length === 0
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'No active clock-in found.'
        });

      }


      const attendanceId =
        activeShift[0].id;


      // --------------------------------------------------
      // AUTO CLOCK-OUT
      // --------------------------------------------------

      await db.query(
        `
        UPDATE attendance
        SET
          clock_out = NOW(),

          clock_out_latitude = ?,

          clock_out_longitude = ?,

          location_status =
            'Outside Geofence',

          sync_status =
            'Auto Clock-Out - Left Geofence',

          total_hours = ROUND(
            TIMESTAMPDIFF(
              SECOND,
              clock_in,
              NOW()
            ) / 3600,
            2
          )

        WHERE id = ?
        `,
        [
          employeeLatitude,
          employeeLongitude,
          attendanceId
        ]
      );


      console.log(
        `⚠️ Employee ${employeeId} auto clocked out after leaving authorised geofence.`
      );


      // --------------------------------------------------
      // AUDIT LOG
      // --------------------------------------------------

      await writeAuditLog(
        employeeId,
        'AUTO_CLOCK_OUT_GEOFENCE',
        `Attendance ID ${attendanceId} automatically closed after employee left authorised geofence.`,
        req.ip
      );


      return res.status(200).json({

        success: 1,

        message:
          'Shift automatically closed after leaving the authorised geofence.',

        attendanceId,

        distance:
          Number(
            geofence.distance.toFixed(1)
          )

      });


    } catch (err) {

      console.error(
        '❌ Auto geofence clock-out error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error during automatic geofence clock-out.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// ======================================================
// AUTOMATIC STALE SHIFT CLOSURE
// ======================================================

// Safety limit.
// A shift that remains open longer than this
// must be reviewed instead of continuing forever.
const MAX_SHIFT_HOURS = 12;


const closeStaleAttendanceShifts =
  async () => {

    try {

      const [result] =
        await db.query(
          `
          UPDATE attendance
SET
  clock_out =
    DATE_ADD(
      clock_in,
      INTERVAL 12 HOUR
    ),

  total_hours = 0,

  sync_status =
    'Auto Closed - Review'

          WHERE
            clock_in IS NOT NULL

            AND clock_out IS NULL

            AND clock_in <=
              DATE_SUB(
                NOW(),
                INTERVAL ${MAX_SHIFT_HOURS} HOUR
              )
          `
        );


      if (
        result.affectedRows > 0
      ) {

        console.log(
          `⚠️ Auto-closed ${result.affectedRows} stale attendance shift(s).`
        );

      }

    } catch (err) {

      console.error(
        '❌ Stale shift auto-close error:',
        err
      );

    }

  };

// ------------------------------------------------------
// 1. CLOCK IN
// ------------------------------------------------------

app.post(
  '/api/attendance/clock-in',
  requireAuth,
  async (req, res) => {

  // The employee ID comes from the verified login token.
  // We no longer trust employee_id sent from the browser.
  const employee_id =
    Number(req.user.userId);

  const {
    latitude,
    longitude,
    sync_status
  } = req.body;


  if (
    !Number.isInteger(employee_id) ||
    employee_id <= 0
  ) {

    return res.status(401).json({
      success: 0,
      message: 'Invalid authenticated user.'
    });

  }


  // --------------------------------------------------
  // Validate GPS coordinates
  // --------------------------------------------------

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {

    return res.status(400).json({
      success: 0,
      message: 'GPS location is required to clock in.'
    });

  }


  const employeeLatitude = Number(latitude);
  const employeeLongitude = Number(longitude);


  if (
    !Number.isFinite(employeeLatitude) ||
    !Number.isFinite(employeeLongitude)
  ) {

    return res.status(400).json({
      success: 0,
      message: 'Invalid GPS coordinates.'
    });

  }


  // --------------------------------------------------
  // Check GPS coordinate ranges
  // --------------------------------------------------

  if (
    employeeLatitude < -90 ||
    employeeLatitude > 90 ||
    employeeLongitude < -180 ||
    employeeLongitude > 180
  ) {

    return res.status(400).json({
      success: 0,
      message: 'GPS coordinates are outside valid ranges.'
    });

  }


  
  // --------------------------------------------------
// CHECK AUTHORISED 50 METRE GEOFENCE
// --------------------------------------------------

const geofence =
  evaluateGeofence(
    employeeLatitude,
    employeeLongitude
  );


const distanceFromWorkplace =
  geofence.distance;


console.log(
  `📍 Employee ${employee_id} is ` +
  `${distanceFromWorkplace.toFixed(2)}m from ` +
  `${geofence.locationName}.`
);


// --------------------------------------------------
// REJECT IF OUTSIDE ALL AUTHORISED LOCATIONS
// --------------------------------------------------

if (!geofence.inZone) {

  console.log(
    `❌ Clock-out blocked for employee ${employee_id}. ` +
    `Outside authorised geofence.`
  );


  return res.status(403).json({

    success: 0,

    message:
      `Clock-out denied. You are ` +
      `${distanceFromWorkplace.toFixed(1)} metres ` +
      `from the nearest authorised workplace.`,

    distance:
      Number(
        distanceFromWorkplace.toFixed(1)
      ),

    allowedRadius:
      geofence.allowedRadius

  });

}


  try {

    // --------------------------------------------------
    // Check employee exists
    // --------------------------------------------------

    const [employee] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [employee_id]
    );


    if (employee.length === 0) {

      return res.status(404).json({
        success: 0,
        message: 'Employee not found.'
      });

    }


    // --------------------------------------------------
    // Check if employee already has an active shift
    // --------------------------------------------------

    const [activeShift] = await db.query(
      `
      SELECT id
      FROM attendance
      WHERE employee_id = ?
        AND clock_in IS NOT NULL
        AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
      `,
      [employee_id]
    );


    if (activeShift.length > 0) {

      return res.status(400).json({
        success: 0,
        message: 'Employee is already clocked in.'
      });

    }


    // --------------------------------------------------
    // Create attendance record
    // --------------------------------------------------

    const verifiedLocationStatus =
  `${geofence.locationName} ✅ (${distanceFromWorkplace.toFixed(1)}m)`;


    const [result] = await db.query(
      `
      INSERT INTO attendance (
        employee_id,
        clock_in,
        clock_in_latitude,
        clock_in_longitude,
        location_status,
        sync_status
      )
      VALUES (
        ?,
        NOW(),
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        employee_id,
        employeeLatitude,
        employeeLongitude,
        verifiedLocationStatus,
        sync_status || 'Online'
      ]
    );


    console.log(
      `✅ Employee ${employee_id} clocked in successfully.`
    );

    // --------------------------------------------------
// AUDIT LOG - CLOCK IN
// --------------------------------------------------

await writeAuditLog(
  req.user.userId,
  'CLOCK_IN',
  `Employee ID ${employee_id} clocked in successfully. Attendance ID: ${result.insertId}. Location: ${verifiedLocationStatus}`,
  req.ip
);


    return res.status(201).json({
      success: 1,
      message: 'Clock-in successful.',
      attendanceId: result.insertId,
      distance: Number(
        distanceFromWorkplace.toFixed(1)
      ),
      location_status: verifiedLocationStatus
    });


  } catch (err) {

    console.error('❌ Clock-in error:', err);

    return res.status(500).json({
      success: 0,
      message: 'Server error during clock-in.',
      details: err.sqlMessage || err.message
    });

  }

});


// ------------------------------------------------------
// 2. CLOCK OUT
// ------------------------------------------------------

// ------------------------------------------------------
// 2. CLOCK OUT
// ------------------------------------------------------

app.put(
  '/api/attendance/clock-out',
  requireAuth,
  async (req, res) => {

  // Employee identity comes from the verified login token.
  const employee_id =
    Number(req.user.userId);

  const {
    latitude,
    longitude,
    sync_status
  } = req.body;


  if (
    !Number.isInteger(employee_id) ||
    employee_id <= 0
  ) {

    return res.status(401).json({
      success: 0,
      message: 'Invalid authenticated user.'
    });

  }


  // --------------------------------------------------
  // Validate GPS coordinates
  // --------------------------------------------------

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {

    return res.status(400).json({
      success: 0,
      message: 'GPS location is required to clock out.'
    });

  }


  const employeeLatitude = Number(latitude);
  const employeeLongitude = Number(longitude);


  if (
    !Number.isFinite(employeeLatitude) ||
    !Number.isFinite(employeeLongitude)
  ) {

    return res.status(400).json({
      success: 0,
      message: 'Invalid GPS coordinates.'
    });

  }


  // --------------------------------------------------
  // Validate GPS ranges
  // --------------------------------------------------

  if (
    employeeLatitude < -90 ||
    employeeLatitude > 90 ||
    employeeLongitude < -180 ||
    employeeLongitude > 180
  ) {

    return res.status(400).json({
      success: 0,
      message: 'GPS coordinates are outside valid ranges.'
    });

  }


  // --------------------------------------------------
// CHECK AUTHORISED 50 METRE GEOFENCE
// --------------------------------------------------

const geofence =
  evaluateGeofence(
    employeeLatitude,
    employeeLongitude
  );


const distanceFromWorkplace =
  geofence.distance;


console.log(
  `📍 Employee ${employee_id} is ` +
  `${distanceFromWorkplace.toFixed(2)}m from ` +
  `${geofence.locationName}.`
);


// --------------------------------------------------
// REJECT IF OUTSIDE ALL AUTHORISED LOCATIONS
// --------------------------------------------------

if (!geofence.inZone) {

  console.log(
    `❌ Clock-in blocked for employee ${employee_id}. ` +
    `Outside authorised geofence.`
  );


  return res.status(403).json({

    success: 0,

    message:
      `Clock-in denied. You are ` +
      `${distanceFromWorkplace.toFixed(1)} metres ` +
      `from the nearest authorised workplace.`,

    distance:
      Number(
        distanceFromWorkplace.toFixed(1)
      ),

    allowedRadius:
      geofence.allowedRadius

  });

}


try {

  // --------------------------------------------------
  // Check employee exists
  // --------------------------------------------------

  const [employee] = await db.query(
    `
    SELECT id
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [employee_id]
  );


  if (employee.length === 0) {

    return res.status(404).json({
      success: 0,
      message: 'Employee not found.'
    });

  }


  

    // --------------------------------------------------
    // Find employee's active shift
    // --------------------------------------------------

    const [activeShift] = await db.query(
      `
      SELECT
        id,
        clock_in
      FROM attendance
      WHERE employee_id = ?
        AND clock_in IS NOT NULL
        AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
      `,
      [employee_id]
    );


    if (activeShift.length === 0) {

      return res.status(400).json({
        success: 0,
        message: 'No active clock-in found.'
      });

    }


    const attendanceId =
      activeShift[0].id;


    // --------------------------------------------------
    // Server-generated verified location status
    // --------------------------------------------------

    const verifiedLocationStatus =
  `${geofence.locationName} ✅ (${distanceFromWorkplace.toFixed(1)}m)`;


    // --------------------------------------------------
    // Clock Out + calculate total hours
    // --------------------------------------------------

    await db.query(
      `
      UPDATE attendance
      SET
        clock_out = NOW(),
        clock_out_latitude = ?,
        clock_out_longitude = ?,
        location_status = ?,
        sync_status = ?,
        total_hours = ROUND(
          TIMESTAMPDIFF(
            SECOND,
            clock_in,
            NOW()
          ) / 3600,
          2
        )
      WHERE id = ?
      `,
      [
        employeeLatitude,
        employeeLongitude,
        verifiedLocationStatus,
        sync_status || 'Online',
        attendanceId
      ]
    );


    console.log(
      `✅ Employee ${employee_id} clocked out successfully.`
    );
    // --------------------------------------------------
// AUDIT LOG - CLOCK OUT
// --------------------------------------------------

await writeAuditLog(
  req.user.userId,
  'CLOCK_OUT',
  `Employee ID ${employee_id} clocked out successfully. Attendance ID: ${attendanceId}. Location: ${verifiedLocationStatus}`,
  req.ip
);


    return res.status(200).json({
      success: 1,
      message: 'Clock-out successful.',
      attendanceId: attendanceId,
      distance: Number(
        distanceFromWorkplace.toFixed(1)
      ),
      location_status: verifiedLocationStatus
    });


  } catch (err) {

    console.error(
      '❌ Clock-out error:',
      err
    );

    return res.status(500).json({
      success: 0,
      message: 'Server error during clock-out.',
      details: err.sqlMessage || err.message
    });

  }

});

// ======================================================
// GET EMPLOYEE ATTENDANCE HISTORY
// ======================================================

app.get(
  '/api/attendance/employee/:id',
  requireAuth,
  async (req, res) => {

    const employeeId =
      Number(req.params.id);


    // --------------------------------------------------
    // VALIDATE EMPLOYEE ID
    // --------------------------------------------------

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0
    ) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid employee ID.'
      });

    }


    // --------------------------------------------------
    // ACCESS CONTROL
    // --------------------------------------------------

    const loggedInUserId =
      Number(req.user.userId);

    const loggedInRole =
      (
        req.user.role ||
        'employee'
      ).toLowerCase();


    const isManagement =
  loggedInRole === 'admin' ||
  loggedInRole === 'manager' ||
  loggedInRole === 'hr_admin';


    const isOwnAttendance =
      loggedInUserId === employeeId;


    // Normal employees may only view their own attendance.
    if (
      !isManagement &&
      !isOwnAttendance
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'You are not authorized to view this employee attendance.'
      });

    }


    try {

      // --------------------------------------------------
      // MAKE SURE EMPLOYEE EXISTS
      // --------------------------------------------------

      const [employeeRows] =
        await db.query(
          `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [employeeId]
        );


      if (
        employeeRows.length === 0
      ) {

        return res.status(404).json({
          success: 0,
          message: 'Employee not found.'
        });

      }


      // --------------------------------------------------
      // GET ATTENDANCE
      // --------------------------------------------------

      const [rows] =
        await db.query(
          `
          SELECT
            id,
            employee_id,
            clock_in,
            clock_out,
            clock_in_latitude,
            clock_in_longitude,
            clock_out_latitude,
            clock_out_longitude,
            location_status,
            sync_status,
            total_hours,
            created_at,
            updated_at
          FROM attendance
          WHERE employee_id = ?
          ORDER BY clock_in DESC
          `,
          [employeeId]
        );


      return res.status(200).json({
        success: 1,
        count: rows.length,
        attendance: rows
      });


    } catch (err) {

      console.error(
        '❌ Attendance retrieval error:',
        err
      );


      return res.status(500).json({
        success: 0,
        message:
          'Server error retrieving attendance.',
        details:
          err.sqlMessage ||
          err.message
      });

    }

  }
);
// ======================================================
// MANAGEMENT DASHBOARD - LIVE ACTIVE STAFF
// ======================================================




// ======================================================
// MANAGEMENT DASHBOARD - TODAY'S ATTENDANCE REGISTER
// ======================================================

app.get(
  '/api/management/today-attendance',
  requireManagement,
  async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT
        a.id AS attendance_id,
        a.employee_id,

        a.clock_in,
        a.clock_out,

        CASE
          WHEN a.clock_out IS NULL
          THEN ROUND(
            TIMESTAMPDIFF(
              SECOND,
              a.clock_in,
              NOW()
            ) / 3600,
            2
          )
          ELSE a.total_hours
        END AS total_hours,

        a.location_status,
        a.sync_status,

        u.name,
        u.surname,
        u.email,
        u.role,

        COALESCE(
          d.name,
          u.department,
          'General'
        ) AS department,

        COALESCE(
          p.title,
          u.position,
          'Employee'
        ) AS position,

        COALESCE(
          NULLIF(u.profile_photo, ''),
          NULLIF(u.faceReferenceImage, '')
        ) AS profile_photo,

        CASE
          WHEN a.clock_out IS NULL
          THEN 'On Duty'
          ELSE 'Completed'
        END AS attendance_status

      FROM attendance a

      INNER JOIN users u
        ON a.employee_id = u.id

      LEFT JOIN departments d
        ON u.department_id = d.id

      LEFT JOIN positions p
        ON u.position_id = p.id

      WHERE DATE(a.clock_in) = CURDATE()

      ORDER BY a.clock_in DESC
    `);


    const attendance = rows.map((row) => ({

      attendance_id:
        row.attendance_id,

      employee_id:
        row.employee_id,

      name:
        `${row.name || ''} ${row.surname || ''}`.trim(),

      email:
        row.email,

      role:
        row.role,

      department:
        row.department,

      position:
        row.position,

      profile_photo:
        row.profile_photo || null,

      clock_in:
        row.clock_in,

      clock_out:
        row.clock_out,

      total_hours:
        Number(row.total_hours || 0),

      location_status:
        row.location_status,

      sync_status:
        row.sync_status,

      status:
        row.attendance_status

    }));


    return res.status(200).json({

      success: 1,

      count:
        attendance.length,

      attendance:
        attendance

    });


  } catch (err) {

    console.error(
      '❌ Today attendance error:',
      err
    );


    return res.status(500).json({

      success: 0,

      message:
        'Server error retrieving today attendance.',

      details:
        err.sqlMessage ||
        err.message

    });

  }

});

// ======================================================
// MANAGEMENT DASHBOARD - ATTENDANCE BY DATE
// ======================================================

app.get(
  '/api/management/attendance-by-date',
  requireSupervisorAccess,
  async (req, res) => {

  try {

    const selectedDate = req.query.date;


    // Make sure a date was supplied
    if (!selectedDate) {

      return res.status(400).json({
        success: 0,
        message: 'Please provide a date.'
      });

    }


    // Basic YYYY-MM-DD validation
    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;


    if (!datePattern.test(selectedDate)) {

      return res.status(400).json({
        success: 0,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });

    }


    const [rows] = await db.query(`
      SELECT
        a.id AS attendance_id,
        a.employee_id,

        a.clock_in,
        a.clock_out,

        CASE
          WHEN a.clock_out IS NULL
          THEN ROUND(
            TIMESTAMPDIFF(
              SECOND,
              a.clock_in,
              NOW()
            ) / 3600,
            2
          )
          ELSE a.total_hours
        END AS total_hours,

        a.location_status,
        a.sync_status,

        u.name,
        u.surname,
        u.email,
        u.role,

        COALESCE(
          d.name,
          u.department,
          'General'
        ) AS department,

        COALESCE(
          p.title,
          u.position,
          'Employee'
        ) AS position,

        COALESCE(
          NULLIF(u.profile_photo, ''),
          NULLIF(u.faceReferenceImage, '')
        ) AS profile_photo,

        CASE
          WHEN a.clock_out IS NULL
          THEN 'On Duty'
          ELSE 'Completed'
        END AS attendance_status

      FROM attendance a

      INNER JOIN users u
        ON a.employee_id = u.id

      LEFT JOIN departments d
        ON u.department_id = d.id

      LEFT JOIN positions p
        ON u.position_id = p.id

      WHERE DATE(a.clock_in) = ?

      ORDER BY a.clock_in DESC
    `, [selectedDate]);


    const attendance = rows.map((row) => ({

      attendance_id:
        row.attendance_id,

      employee_id:
        row.employee_id,

      name:
        `${row.name || ''} ${row.surname || ''}`.trim(),

      email:
        row.email,

      role:
        row.role,

      department:
        row.department,

      position:
        row.position,

      profile_photo:
        row.profile_photo || null,

      clock_in:
        row.clock_in,

      clock_out:
        row.clock_out,

      total_hours:
        Number(row.total_hours || 0),

      location_status:
        row.location_status,

      sync_status:
        row.sync_status,

      status:
        row.attendance_status

    }));


    return res.status(200).json({

      success: 1,

      date:
        selectedDate,

      count:
        attendance.length,

      attendance:
        attendance

    });


  } catch (err) {

    console.error(
      '❌ Attendance by date error:',
      err
    );


    return res.status(500).json({

      success: 0,

      message:
        'Server error retrieving attendance.',

      details:
        err.sqlMessage ||
        err.message

    });

  }

});
// ======================================================
// WEEKLY ATTENDANCE REPORT HASH
// ======================================================

const createWeeklyAttendanceReportHash = (
  startDate,
  endDate,
  attendance
) => {

  const normalizedAttendance =
    [...attendance]
      .map((record) => ({

        attendance_id:
          record.attendance_id,

        employee_id:
          record.employee_id,

        attendance_date:
          record.attendance_date,

        name:
          record.name || '',

        email:
          record.email || '',

        role:
          record.role || '',

        department:
          record.department || '',

        position:
          record.position || '',

        clock_in:
          record.clock_in,

        clock_out:
          record.clock_out,

        total_hours:
          Number(
            record.total_hours || 0
          ),

        location_status:
          record.location_status || '',

        sync_status:
          record.sync_status || '',

        status:
          record.status || ''

      }))
      .sort(
        (a, b) =>
          Number(a.attendance_id) -
          Number(b.attendance_id)
      );


  const reportData =
    JSON.stringify({
      report_type: 'weekly',
      start_date: startDate,
      end_date: endDate,
      attendance: normalizedAttendance
    });


  return crypto
    .createHash('sha256')
    .update(reportData)
    .digest('hex');
};
// ======================================================
// MANAGEMENT REPORTS - WEEKLY ATTENDANCE
// ======================================================

app.get(
  '/api/management/attendance-weekly',
  requireFinanceAccess,
  async (req, res) => {

    try {

      const startDate =
        req.query.start;

      const endDate =
        req.query.end;


      if (!startDate || !endDate) {

        return res.status(400).json({
          success: 0,
          message:
            'Please provide start and end dates.'
        });

      }


      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;


      if (
        !datePattern.test(startDate) ||
        !datePattern.test(endDate)
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Invalid date format. Use YYYY-MM-DD.'
        });

      }


      if (startDate > endDate) {

        return res.status(400).json({
          success: 0,
          message:
            'Start date cannot be after end date.'
        });

      }


      const [rows] =
        await db.query(
          `
          SELECT
            a.id AS attendance_id,
            a.employee_id,

            DATE(a.clock_in)
              AS attendance_date,

            a.clock_in,
            a.clock_out,

           CASE
  WHEN a.clock_out IS NULL
  THEN 0

  ELSE COALESCE(
    a.total_hours,
    ROUND(
      TIMESTAMPDIFF(
        SECOND,
        a.clock_in,
        a.clock_out
      ) / 3600,
      2
    )
  )
END AS total_hours,

            a.location_status,
            a.sync_status,

            u.name,
            u.surname,
            u.email,
            u.role,

            COALESCE(
              d.name,
              u.department,
              'General'
            ) AS department,

            COALESCE(
              p.title,
              u.position,
              'Employee'
            ) AS position,

          CASE
  WHEN a.sync_status =
       'Auto Clock-Out - Left Geofence'
  THEN 'Auto Clock-Out - Left Geofence'

  WHEN a.sync_status =
       'Auto Closed - Review'
  THEN 'Auto Closed - Review'

  WHEN a.clock_out IS NULL
       AND DATE(a.clock_in) = CURDATE()
  THEN 'On Duty'

  WHEN a.clock_out IS NULL
  THEN 'Open Shift - Review'

  ELSE 'Completed'
END AS attendance_status

          FROM attendance a

          INNER JOIN users u
            ON a.employee_id = u.id

          LEFT JOIN departments d
            ON u.department_id = d.id

          LEFT JOIN positions p
            ON u.position_id = p.id

          WHERE DATE(a.clock_in)
            BETWEEN ? AND ?

          ORDER BY
            DATE(a.clock_in) DESC,
            a.clock_in DESC
          `,
          [
            startDate,
            endDate
          ]
        );


      const attendance =
        rows.map((row) => ({

          attendance_id:
            row.attendance_id,

          employee_id:
            row.employee_id,

          attendance_date:
            row.attendance_date,

          name:
            `${row.name || ''} ${row.surname || ''}`.trim(),

          email:
            row.email,

          role:
            row.role,

          department:
            row.department,

          position:
            row.position,

          clock_in:
            row.clock_in,

          clock_out:
            row.clock_out,

          total_hours:
            Number(
              row.total_hours || 0
            ),

          location_status:
            row.location_status,

          sync_status:
            row.sync_status,

          status:
            row.attendance_status

        }));

        // --------------------------------------------------
// CHECK WEEKLY REPORT DIGITAL SIGNATURE
// --------------------------------------------------

const currentReportHash =
  createWeeklyAttendanceReportHash(
    startDate,
    endDate,
    attendance
  );


const [signatureRows] =
  await db.query(
    `
    SELECT
      id,
      report_type,

      DATE_FORMAT(
        start_date,
        '%Y-%m-%d'
      ) AS start_date,

      DATE_FORMAT(
        end_date,
        '%Y-%m-%d'
      ) AS end_date,

      signed_by,
      signer_name,
      signer_role,
      record_count,
      report_hash,
      signed_at

    FROM attendance_report_signatures

    WHERE report_type = 'weekly'
      AND start_date = ?
      AND end_date = ?

    LIMIT 1
    `,
    [
      startDate,
      endDate
    ]
  );


let signature = null;


if (signatureRows.length > 0) {

  const savedSignature =
    signatureRows[0];


  const isValid =
    savedSignature.report_hash ===
    currentReportHash;


  signature = {

    id:
      savedSignature.id,

    report_type:
      savedSignature.report_type,

    start_date:
      savedSignature.start_date,

    end_date:
      savedSignature.end_date,

    signed_by:
      savedSignature.signed_by,

    signer_name:
      savedSignature.signer_name,

    signer_role:
      savedSignature.signer_role,

    record_count:
      savedSignature.record_count,

    signed_at:
      savedSignature.signed_at,

    is_valid:
      isValid,

    status:
      isValid
        ? 'Signed'
        : 'Changed After Signing'

  };

}

      return res.status(200).json({

  success: 1,

  start:
    startDate,

  end:
    endDate,

  count:
    attendance.length,

  attendance:
    attendance,

  signature:
    signature

});


    } catch (err) {

      console.error(
        '❌ Weekly attendance report error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error retrieving weekly attendance report.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// ======================================================
// SIGN WEEKLY ATTENDANCE REPORT
// ======================================================

app.post(
  '/api/management/attendance-weekly/sign',
  requireHRAccess,
  async (req, res) => {

    try {

      const {
        start,
        end
      } = req.body;


      if (!start || !end) {

        return res.status(400).json({
          success: 0,
          message:
            'Please provide start and end dates.'
        });

      }


      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;


      if (
        !datePattern.test(start) ||
        !datePattern.test(end)
      ) {

        return res.status(400).json({
          success: 0,
          message:
            'Invalid date format. Use YYYY-MM-DD.'
        });

      }


      if (start > end) {

        return res.status(400).json({
          success: 0,
          message:
            'Start date cannot be after end date.'
        });

      }


      // --------------------------------------------------
      // CHECK IF THIS PERIOD IS ALREADY SIGNED
      // --------------------------------------------------

      const [existingSignatures] =
        await db.query(
          `
          SELECT *
          FROM attendance_report_signatures
          WHERE report_type = 'weekly'
            AND start_date = ?
            AND end_date = ?
          LIMIT 1
          `,
          [
            start,
            end
          ]
        );


      if (existingSignatures.length > 0) {

        return res.status(409).json({
          success: 0,
          message:
            'This weekly attendance report has already been digitally signed.',
          signature:
            existingSignatures[0]
        });

      }


      // --------------------------------------------------
      // LOAD ATTENDANCE FOR THIS REPORT PERIOD
      // --------------------------------------------------

      const [rows] =
        await db.query(
          `
          SELECT
            a.id AS attendance_id,
            a.employee_id,

            DATE(a.clock_in)
              AS attendance_date,

            a.clock_in,
            a.clock_out,

            CASE
              WHEN a.clock_out IS NULL
              THEN 0

              ELSE COALESCE(
                a.total_hours,
                ROUND(
                  TIMESTAMPDIFF(
                    SECOND,
                    a.clock_in,
                    a.clock_out
                  ) / 3600,
                  2
                )
              )
            END AS total_hours,

            a.location_status,
            a.sync_status,

            u.name,
            u.surname,
            u.email,
            u.role,

            COALESCE(
              d.name,
              u.department,
              'General'
            ) AS department,

            COALESCE(
              p.title,
              u.position,
              'Employee'
            ) AS position,

            CASE
              WHEN a.sync_status =
                   'Auto Clock-Out - Left Geofence'
              THEN 'Auto Clock-Out - Left Geofence'

              WHEN a.sync_status =
                   'Auto Closed - Review'
              THEN 'Auto Closed - Review'

              WHEN a.clock_out IS NULL
                   AND DATE(a.clock_in) = CURDATE()
              THEN 'On Duty'

              WHEN a.clock_out IS NULL
              THEN 'Open Shift - Review'

              ELSE 'Completed'
            END AS attendance_status

          FROM attendance a

          INNER JOIN users u
            ON a.employee_id = u.id

          LEFT JOIN departments d
            ON u.department_id = d.id

          LEFT JOIN positions p
            ON u.position_id = p.id

          WHERE DATE(a.clock_in)
            BETWEEN ? AND ?

          ORDER BY
            DATE(a.clock_in) DESC,
            a.clock_in DESC
          `,
          [
            start,
            end
          ]
        );


      const attendance =
        rows.map((row) => ({

          attendance_id:
            row.attendance_id,

          employee_id:
            row.employee_id,

          attendance_date:
            row.attendance_date,

          name:
            `${row.name || ''} ${row.surname || ''}`.trim(),

          email:
            row.email,

          role:
            row.role,

          department:
            row.department,

          position:
            row.position,

          clock_in:
            row.clock_in,

          clock_out:
            row.clock_out,

          total_hours:
            Number(
              row.total_hours || 0
            ),

          location_status:
            row.location_status,

          sync_status:
            row.sync_status,

          status:
            row.attendance_status

        }));


      // --------------------------------------------------
      if (attendance.length === 0) {
        return res.status(400).json({
          success: 0,
          message: 'There are no attendance records in this weekly report to sign.'
        });
      }

      // CREATE REPORT HASH
      // --------------------------------------------------

      const reportHash =
        createWeeklyAttendanceReportHash(
          start,
          end,
          attendance
        );


      // --------------------------------------------------
      // LOAD SIGNER DETAILS
      // --------------------------------------------------

      const [signerRows] =
        await db.query(
          `
          SELECT
            id,
            name,
            surname,
            role
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [
            req.user.userId
          ]
        );


      if (signerRows.length === 0) {

        return res.status(404).json({
          success: 0,
          message:
            'Signing user could not be found.'
        });

      }


      const signer =
        signerRows[0];


      const signerName =
        `${signer.name || ''} ${signer.surname || ''}`
          .trim();


      const signerRole =
        normalizeSystemRole(
          signer.role
        );


      // --------------------------------------------------
      // SAVE DIGITAL SIGNATURE
      // --------------------------------------------------

      const [result] =
        await db.query(
          `
          INSERT INTO attendance_report_signatures (
            report_type,
            start_date,
            end_date,
            signed_by,
            signer_name,
            signer_role,
            record_count,
            report_hash
          )
          VALUES (
            'weekly',
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
          `,
          [
            start,
            end,
            signer.id,
            signerName,
            signerRole,
            attendance.length,
            reportHash
          ]
        );


      await writeAuditLog(
        req.user.userId,
        'WEEKLY_ATTENDANCE_REPORT_SIGNED',
        `Weekly attendance report ${start} to ${end} digitally signed. Signature ID: ${result.insertId}. Records: ${attendance.length}.`,
        req.ip
      );

      return res.status(201).json({

        success: 1,

        message:
          'Weekly attendance report digitally signed successfully.',

        signature: {

          id:
            result.insertId,

          report_type:
            'weekly',

          start_date:
            start,

          end_date:
            end,

          signed_by:
            signer.id,

          signer_name:
            signerName,

          signer_role:
            signerRole,

          record_count:
            attendance.length,

          report_hash:
            reportHash

        }

      });


    } catch (err) {

      console.error(
        '❌ Weekly report signing error:',
        err
      );


      return res.status(500).json({

        success: 0,

        message:
          'Server error signing weekly attendance report.',

        details:
          err.sqlMessage ||
          err.message

      });

    }

  }
);

// Trusted time endpoint is registered by phase4Enhancements.js.

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, async () => {

  console.log(
    `🚀 Server running on port ${PORT}`
  );

  // Ensure final Phase 4 support tables exist before accepting work.
  await ensurePhase4Infrastructure(db);

  const leaveBalancesInitialised =
    await ensureAllCurrentLeaveBalances(db);

  console.log(
    `✅ Phase 4 support tables are ready. Leave balances checked for ${leaveBalancesInitialised} active employee(s).`
  );

  // Start periodic external NTP verification. Attendance timestamps
  // remain MySQL-authoritative if the NTP server is temporarily unavailable.
  trustedTimeService.start();


  // Check once immediately when server starts
  await closeStaleAttendanceShifts();


  // Check again every 30 minutes
  setInterval(
    closeStaleAttendanceShifts,
    30 * 60 * 1000
  );

});