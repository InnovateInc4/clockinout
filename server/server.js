const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
// REQUIRE OFFICIAL REGISTRATION PASSWORD
// --------------------------------------------------

if (
  String(password) !== 'Office@premier2026'
) {

  return res.status(400).json({
    success: 0,
    message:
      'The registration password is incorrect.'
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
// REQUIRE OFFICIAL PASSWORD
// --------------------------------------------------

if (
  String(password) !== 'Office@premier2026'
) {

  return res.status(401).json({
    success: 0,
    message: 'Invalid email or password.'
  });

}

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

const requireManagement = async (req, res, next) => {

  return requireAuth(req, res, () => {

    const role =
      (
        req.user.role ||
        ''
      ).toLowerCase();


    // Only current Admin or Manager accounts
    // are allowed into management routes.
    if (
      role !== 'admin' &&
      role !== 'manager'
    ) {

      return res.status(403).json({
        success: 0,
        message:
          'Management access required.'
      });

    }


    next();

  });

};


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
  requireManagement,
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
  requireManagement,
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
  requireManagement,
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
  requireManagement,
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

  }
);

// ======================================================
// MANAGEMENT - UPDATE EMPLOYEE
// ======================================================

app.put(
  '/api/management/employees/:id',
  requireManagement,
  async (req, res) => {

    

    const employeeId =
      req.params.id;

    const {
      department,
      position,
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
          employment_status = ?,
          account_status = ?
        WHERE id = ?
        `,
        [
          department || 'General',
          position || 'Employee',
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
  `Employee ID ${employeeId} updated. Department: ${department || 'General'}, Position: ${position || 'Employee'}, Employment Status: ${employment_status || 'Active'}, Account Status: ${account_status || 'Active'}`,
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

// ------------------------------------------------------
// 4. Get Leave Requests
// ------------------------------------------------------
app.get(
  '/api/tickets/get-leave-requests',
  requireManagement,
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

app.put(
  '/api/tickets/update-leave-status',
  requireManagement,
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
      // AUDIT LOG
      // --------------------------------------------------

      await writeAuditLog(
        req.user.userId,
        'LEAVE_STATUS_UPDATED',
        `Leave request ID ${id} for employee ID ${leaveRequest.employee_id} was marked as ${finalStatus}.`,
        req.ip
      );


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
      loggedInRole === 'manager';


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
      loggedInRole === 'manager';

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
            expiry_date,
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
  file_path
} = req.body;


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
      loggedInRole === 'manager';

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
      file_path
    )
    VALUES (?, ?, ?)
    `,
    [
      employeeId,
      String(document_type).trim(),
      file_path
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
  requireManagement,
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
// SOL PLAATJE UNIVERSITY CENTRAL CAMPUS GEOFENCE
// ======================================================

const WORKPLACE_LOCATION = {
  lat: -28.74759,
  lng: 24.76484
};

const GEOFENCE_RADIUS_METERS = 20;


// ------------------------------------------------------
// Calculate distance between two GPS coordinates
// using the Haversine formula
// ------------------------------------------------------
const calculateDistanceMeters = (
  lat1,
  lon1,
  lat2,
  lon2
) => {

  const earthRadius = 6371000;

  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return earthRadius * c;
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
  // Calculate distance from SPU Central Campus
  // --------------------------------------------------

  const distanceFromWorkplace = calculateDistanceMeters(
    employeeLatitude,
    employeeLongitude,
    WORKPLACE_LOCATION.lat,
    WORKPLACE_LOCATION.lng
  );


  console.log(
    `📍 Employee ${employee_id} is ${distanceFromWorkplace.toFixed(2)}m from SPU Central Campus.`
  );


  // --------------------------------------------------
  // Reject if outside 20 metre geofence
  // --------------------------------------------------

  if (
    distanceFromWorkplace > GEOFENCE_RADIUS_METERS
  ) {

    console.log(
      `❌ Clock-in blocked for employee ${employee_id}. Outside geofence.`
    );

    return res.status(403).json({
      success: 0,
      message: `Clock-in denied. You are ${distanceFromWorkplace.toFixed(1)} metres from the permitted clock-in point.`,
      distance: Number(
        distanceFromWorkplace.toFixed(1)
      ),
      allowedRadius: GEOFENCE_RADIUS_METERS
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
      `Sol Plaatje University Central Campus ✅ (${distanceFromWorkplace.toFixed(1)}m)`;


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
  // Calculate distance from SPU Central Campus
  // --------------------------------------------------

  const distanceFromWorkplace = calculateDistanceMeters(
    employeeLatitude,
    employeeLongitude,
    WORKPLACE_LOCATION.lat,
    WORKPLACE_LOCATION.lng
  );


  console.log(
    `📍 Employee ${employee_id} is ${distanceFromWorkplace.toFixed(2)}m from SPU Central Campus during clock-out.`
  );


  // --------------------------------------------------
  // Reject Clock Out outside 20 metre zone
  // --------------------------------------------------

  if (
    distanceFromWorkplace > GEOFENCE_RADIUS_METERS
  ) {

    console.log(
      `❌ Clock-out blocked for employee ${employee_id}. Outside geofence.`
    );

    return res.status(403).json({
      success: 0,
      message: `Clock-out denied. You are ${distanceFromWorkplace.toFixed(1)} metres from the permitted clock-out point.`,
      distance: Number(
        distanceFromWorkplace.toFixed(1)
      ),
      allowedRadius: GEOFENCE_RADIUS_METERS
    });

  }


  try {

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
      `Sol Plaatje University Central Campus ✅ (${distanceFromWorkplace.toFixed(1)}m)`;


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
      loggedInRole === 'manager';


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
  requireManagement,
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
// MANAGEMENT REPORTS - WEEKLY ATTENDANCE
// ======================================================

app.get(
  '/api/management/attendance-weekly',
  requireManagement,
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


      return res.status(200).json({

        success: 1,

        start:
          startDate,

        end:
          endDate,

        count:
          attendance.length,

        attendance:
          attendance

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
// START SERVER
// ======================================================

app.listen(PORT, () => {

  console.log(
    `🚀 Server running on port ${PORT}`
  );

});