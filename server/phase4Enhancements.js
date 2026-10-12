const dgram = require('dgram');

const LEAVE_POLICIES = Object.freeze({
  'Annual Leave': 21,
  'Sick Leave': 30,
  'Family Responsibility Leave': 3
});

const NTP_UNIX_EPOCH_SECONDS = 2208988800;

const pad2 = (value) => String(value).padStart(2, '0');

const dateToKey = (date) =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

const toDateOnlyUtc = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return new Date(Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    ));
  }

  const text = String(value).trim();
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  ));
};

const addUtcDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const calculateEasterSunday = (year) => {
  // Meeus/Jones/Butcher Gregorian Easter algorithm.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
};

const getSouthAfricanPublicHolidays = (year) => {
  const holidays = new Map();

  const addHoliday = (date, name) => {
    const key = dateToKey(date);

    if (holidays.has(key)) {
      const existing = holidays.get(key);
      if (!existing.includes(name)) {
        holidays.set(key, `${existing} / ${name}`);
      }
      return;
    }

    holidays.set(key, name);
  };

  const fixed = [
    [1, 1, "New Year's Day"],
    [3, 21, 'Human Rights Day'],
    [4, 27, 'Freedom Day'],
    [5, 1, "Workers' Day"],
    [6, 16, 'Youth Day'],
    [8, 9, "National Women's Day"],
    [9, 24, 'Heritage Day'],
    [12, 16, 'Day of Reconciliation'],
    [12, 25, 'Christmas Day'],
    [12, 26, 'Day of Goodwill']
  ];

  fixed.forEach(([month, day, name]) => {
    addHoliday(
      new Date(Date.UTC(year, month - 1, day)),
      name
    );
  });

  const easterSunday = calculateEasterSunday(year);
  addHoliday(addUtcDays(easterSunday, -2), 'Good Friday');
  addHoliday(addUtcDays(easterSunday, 1), 'Family Day');

  // Under the Public Holidays Act, when a public holiday falls
  // on a Sunday, the following Monday is also a public holiday.
  const originalHolidays = Array.from(holidays.entries());

  originalHolidays.forEach(([key, name]) => {
    const holidayDate = toDateOnlyUtc(key);

    if (holidayDate && holidayDate.getUTCDay() === 0) {
      addHoliday(
        addUtcDays(holidayDate, 1),
        `${name} (observed)`
      );
    }
  });

  return Array.from(holidays.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const getHolidaySetForRange = (startValue, endValue) => {
  const startDate = toDateOnlyUtc(startValue);
  const endDate = toDateOnlyUtc(endValue);

  if (!startDate || !endDate || startDate > endDate) {
    return new Set();
  }

  const holidaySet = new Set();

  for (
    let year = startDate.getUTCFullYear();
    year <= endDate.getUTCFullYear();
    year += 1
  ) {
    getSouthAfricanPublicHolidays(year)
      .forEach((holiday) => holidaySet.add(holiday.date));
  }

  return holidaySet;
};

const countSouthAfricanWorkingDays = (startValue, endValue) => {
  const startDate = toDateOnlyUtc(startValue);
  const endDate = toDateOnlyUtc(endValue);

  if (!startDate || !endDate || startDate > endDate) {
    return 0;
  }

  const holidaySet = getHolidaySetForRange(startDate, endDate);
  let workingDays = 0;

  for (
    let currentDate = new Date(startDate.getTime());
    currentDate <= endDate;
    currentDate = addUtcDays(currentDate, 1)
  ) {
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = holidaySet.has(dateToKey(currentDate));

    if (!isWeekend && !isPublicHoliday) {
      workingDays += 1;
    }
  }

  return workingDays;
};

const getCalendarLeaveCycle = (referenceValue = new Date()) => {
  const referenceDate = toDateOnlyUtc(referenceValue) || toDateOnlyUtc(new Date());
  const year = referenceDate.getUTCFullYear();

  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    year
  };
};

const clampDateToCycle = (dateValue, cycleStart, cycleEnd) => {
  const date = toDateOnlyUtc(dateValue);
  const start = toDateOnlyUtc(cycleStart);
  const end = toDateOnlyUtc(cycleEnd);

  if (!date || !start || !end) return null;
  if (date < start) return start;
  if (date > end) return end;
  return date;
};

const ensurePhase4Infrastructure = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS leave_balance_history (
      id INT NOT NULL AUTO_INCREMENT,
      source_balance_id INT NULL,
      employee_id INT NOT NULL,
      leave_type VARCHAR(100) NOT NULL,
      allocated_days DECIMAL(6,2) NOT NULL DEFAULT 0,
      used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
      remaining_days DECIMAL(6,2) NOT NULL DEFAULT 0,
      cycle_start DATE NOT NULL,
      cycle_end DATE NOT NULL,
      archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_archived_leave_cycle (
        employee_id,
        leave_type,
        cycle_start,
        cycle_end
      ),
      INDEX idx_leave_history_employee (employee_id, leave_type)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance_offline_events (
      id BIGINT NOT NULL AUTO_INCREMENT,
      client_event_id VARCHAR(100) NOT NULL,
      employee_id INT NOT NULL,
      event_type VARCHAR(40) NOT NULL,
      captured_at DATETIME(3) NOT NULL,
      captured_at_epoch_ms BIGINT NOT NULL,
      timezone_offset_minutes INT NULL,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      accuracy_meters DECIMAL(8,2) NULL,
      face_verified TINYINT(1) NOT NULL DEFAULT 0,
      face_match_distance DECIMAL(8,5) NULL,
      trusted_time_verified_at DATETIME(3) NULL,
      trusted_time_age_ms BIGINT NULL,
      geofence_location_id VARCHAR(100) NULL,
      geofence_distance_meters DECIMAL(10,2) NULL,
      sync_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      rejection_reason VARCHAR(255) NULL,
      attendance_id INT NULL,
      received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      processed_at TIMESTAMP(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY unique_offline_client_event (client_event_id),
      INDEX idx_offline_employee_status (employee_id, sync_status),
      INDEX idx_offline_captured_at (captured_at)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS time_sync_audit (
      id BIGINT NOT NULL AUTO_INCREMENT,
      ntp_server VARCHAR(150) NOT NULL,
      ntp_time DATETIME(3) NULL,
      database_time DATETIME(3) NOT NULL,
      drift_ms BIGINT NULL,
      round_trip_ms INT NULL,
      status VARCHAR(40) NOT NULL,
      error_message VARCHAR(255) NULL,
      checked_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_time_sync_checked (checked_at),
      INDEX idx_time_sync_status (status)
    )
  `);
};

const ensureCurrentLeaveBalances = async (
  db,
  employeeId,
  referenceValue = new Date()
) => {
  const numericEmployeeId = Number(employeeId);
  if (!Number.isInteger(numericEmployeeId) || numericEmployeeId <= 0) {
    return [];
  }

  const cycle = getCalendarLeaveCycle(referenceValue);
  const ensuredBalances = [];

  for (const [leaveType, allocation] of Object.entries(LEAVE_POLICIES)) {
    const [rows] = await db.query(
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
        AND leave_type = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [numericEmployeeId, leaveType]
    );

    if (rows.length === 0) {
      const [insertResult] = await db.query(
        `
        INSERT INTO leave_balances (
          employee_id,
          leave_type,
          allocated_days,
          used_days,
          remaining_days,
          cycle_start,
          cycle_end
        )
        VALUES (?, ?, ?, 0, ?, ?, ?)
        `,
        [
          numericEmployeeId,
          leaveType,
          allocation,
          allocation,
          cycle.start,
          cycle.end
        ]
      );

      ensuredBalances.push({
        id: insertResult.insertId,
        employee_id: numericEmployeeId,
        leave_type: leaveType,
        allocated_days: allocation,
        used_days: 0,
        remaining_days: allocation,
        cycle_start: cycle.start,
        cycle_end: cycle.end
      });

      continue;
    }

    const existing = rows[0];
    const existingCycleStart = existing.cycle_start
      ? dateToKey(toDateOnlyUtc(existing.cycle_start))
      : null;
    const existingCycleEnd = existing.cycle_end
      ? dateToKey(toDateOnlyUtc(existing.cycle_end))
      : null;

    if (
      existingCycleStart !== cycle.start ||
      existingCycleEnd !== cycle.end
    ) {
      if (existingCycleStart && existingCycleEnd) {
        try {
          await db.query(
            `
            INSERT IGNORE INTO leave_balance_history (
              source_balance_id,
              employee_id,
              leave_type,
              allocated_days,
              used_days,
              remaining_days,
              cycle_start,
              cycle_end
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              existing.id,
              numericEmployeeId,
              leaveType,
              Number(existing.allocated_days || 0),
              Number(existing.used_days || 0),
              Number(existing.remaining_days || 0),
              existingCycleStart,
              existingCycleEnd
            ]
          );
        } catch (archiveError) {
          console.error(
            '❌ Leave balance archive warning:',
            archiveError.message
          );
        }
      }

      await db.query(
        `
        UPDATE leave_balances
        SET
          allocated_days = ?,
          used_days = 0,
          remaining_days = ?,
          cycle_start = ?,
          cycle_end = ?
        WHERE id = ?
        `,
        [
          allocation,
          allocation,
          cycle.start,
          cycle.end,
          existing.id
        ]
      );

      ensuredBalances.push({
        id: existing.id,
        employee_id: numericEmployeeId,
        leave_type: leaveType,
        allocated_days: allocation,
        used_days: 0,
        remaining_days: allocation,
        cycle_start: cycle.start,
        cycle_end: cycle.end
      });
    } else {
      if (Number(existing.allocated_days) !== allocation) {
        const usedDays = Number(existing.used_days || 0);
        const remainingDays = Math.max(allocation - usedDays, 0);

        await db.query(
          `
          UPDATE leave_balances
          SET allocated_days = ?, remaining_days = ?
          WHERE id = ?
          `,
          [allocation, remainingDays, existing.id]
        );

        existing.allocated_days = allocation;
        existing.remaining_days = remainingDays;
      }

      ensuredBalances.push(existing);
    }
  }

  return ensuredBalances;
};

const ensureAllCurrentLeaveBalances = async (db) => {
  const [employees] = await db.query(`
    SELECT id
    FROM users
    WHERE LOWER(COALESCE(employment_status, 'Active')) = 'active'
  `);

  for (const employee of employees) {
    await ensureCurrentLeaveBalances(db, employee.id);
  }

  return employees.length;
};

const recalculateCurrentLeaveBalance = async (
  db,
  employeeId,
  leaveType,
  referenceValue = new Date()
) => {
  await ensureCurrentLeaveBalances(db, employeeId, referenceValue);

  const cycle = getCalendarLeaveCycle(referenceValue);

  const [balanceRows] = await db.query(
    `
    SELECT
      id,
      allocated_days,
      cycle_start,
      cycle_end
    FROM leave_balances
    WHERE employee_id = ?
      AND leave_type = ?
    LIMIT 1
    `,
    [employeeId, leaveType]
  );

  if (balanceRows.length === 0) {
    return null;
  }

  const balance = balanceRows[0];
  const allocatedDays = Number(balance.allocated_days || 0);

  const [approvedRows] = await db.query(
    `
    SELECT start_date, end_date
    FROM leave_requests
    WHERE employee_id = ?
      AND type = ?
      AND LOWER(status) = 'approved'
      AND start_date <= ?
      AND end_date >= ?
    `,
    [employeeId, leaveType, cycle.end, cycle.start]
  );

  let usedDays = 0;

  approvedRows.forEach((leave) => {
    const boundedStart = clampDateToCycle(
      leave.start_date,
      cycle.start,
      cycle.end
    );
    const boundedEnd = clampDateToCycle(
      leave.end_date,
      cycle.start,
      cycle.end
    );

    if (boundedStart && boundedEnd && boundedStart <= boundedEnd) {
      usedDays += countSouthAfricanWorkingDays(
        boundedStart,
        boundedEnd
      );
    }
  });

  const remainingDays = Math.max(allocatedDays - usedDays, 0);

  await db.query(
    `
    UPDATE leave_balances
    SET used_days = ?, remaining_days = ?
    WHERE id = ?
    `,
    [usedDays, remainingDays, balance.id]
  );

  return {
    allocated_days: allocatedDays,
    used_days: usedDays,
    remaining_days: remainingDays,
    cycle_start: cycle.start,
    cycle_end: cycle.end
  };
};

const queryNtpServer = (
  host = process.env.NTP_SERVER || 'time.google.com',
  timeoutMs = Number(process.env.NTP_TIMEOUT_MS || 2000)
) => new Promise((resolve, reject) => {
  const socket = dgram.createSocket('udp4');
  const packet = Buffer.alloc(48);
  packet[0] = 0x1b;

  const startedAt = Date.now();
  let finished = false;

  const finish = (error, result) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);

    try {
      socket.close();
    } catch (_) {
      // Socket may already be closed.
    }

    if (error) reject(error);
    else resolve(result);
  };

  const timer = setTimeout(() => {
    finish(new Error(`NTP request to ${host} timed out.`));
  }, Math.max(timeoutMs, 500));

  socket.once('error', (error) => finish(error));

  socket.once('message', (message) => {
    if (!message || message.length < 48) {
      finish(new Error('Invalid NTP response.'));
      return;
    }

    const seconds = message.readUInt32BE(40);
    const fraction = message.readUInt32BE(44);
    const unixSeconds = seconds - NTP_UNIX_EPOCH_SECONDS;
    const fractionalMs = Math.round(
      (fraction / 0x100000000) * 1000
    );
    const epochMs = unixSeconds * 1000 + fractionalMs;

    finish(null, {
      host,
      epochMs,
      date: new Date(epochMs),
      roundTripMs: Date.now() - startedAt
    });
  });

  socket.send(packet, 0, packet.length, 123, host, (error) => {
    if (error) finish(error);
  });
});

const createTrustedTimeService = (db) => {
  const ntpServer = process.env.NTP_SERVER || 'time.google.com';
  const refreshMinutes = Math.max(
    Number(process.env.NTP_REFRESH_MINUTES || 15),
    1
  );

  let state = {
    status: 'not_checked',
    ntpServer,
    ntpEpochMs: null,
    databaseEpochMs: null,
    driftMs: null,
    roundTripMs: null,
    checkedAt: null,
    error: null
  };

  let timer = null;

  const readDatabaseTime = async () => {
    const [rows] = await db.query(`
      SELECT
        NOW(3) AS server_time,
        ROUND(UNIX_TIMESTAMP(NOW(3)) * 1000) AS server_epoch_ms
    `);

    return {
      serverTime: rows[0].server_time,
      serverEpochMs: Number(rows[0].server_epoch_ms)
    };
  };

  const refresh = async () => {
    const databaseTime = await readDatabaseTime();

    try {
      const ntp = await queryNtpServer(ntpServer);
      const driftMs = databaseTime.serverEpochMs - ntp.epochMs;
      const status = Math.abs(driftMs) <= 2000
        ? 'synchronized'
        : 'drift_detected';

      state = {
        status,
        ntpServer,
        ntpEpochMs: ntp.epochMs,
        databaseEpochMs: databaseTime.serverEpochMs,
        driftMs,
        roundTripMs: ntp.roundTripMs,
        checkedAt: new Date().toISOString(),
        error: null
      };

      try {
        await db.query(
          `
          INSERT INTO time_sync_audit (
            ntp_server,
            ntp_time,
            database_time,
            drift_ms,
            round_trip_ms,
            status,
            error_message
          )
          VALUES (?, FROM_UNIXTIME(?), ?, ?, ?, ?, NULL)
          `,
          [
            ntpServer,
            ntp.epochMs / 1000,
            databaseTime.serverTime,
            driftMs,
            ntp.roundTripMs,
            status
          ]
        );
      } catch (auditError) {
        console.error('❌ Time sync audit warning:', auditError.message);
      }
    } catch (error) {
      state = {
        status: 'ntp_unavailable',
        ntpServer,
        ntpEpochMs: null,
        databaseEpochMs: databaseTime.serverEpochMs,
        driftMs: null,
        roundTripMs: null,
        checkedAt: new Date().toISOString(),
        error: error.message
      };

      try {
        await db.query(
          `
          INSERT INTO time_sync_audit (
            ntp_server,
            ntp_time,
            database_time,
            drift_ms,
            round_trip_ms,
            status,
            error_message
          )
          VALUES (?, NULL, ?, NULL, NULL, 'ntp_unavailable', ?)
          `,
          [ntpServer, databaseTime.serverTime, error.message.slice(0, 255)]
        );
      } catch (auditError) {
        console.error('❌ Time sync audit warning:', auditError.message);
      }
    }

    return state;
  };

  const getSnapshot = async () => {
    const databaseTime = await readDatabaseTime();

    return {
      server_time: databaseTime.serverTime,
      server_epoch_ms: databaseTime.serverEpochMs,
      source: 'MySQL server time verified against NTP when available',
      ntp: {
        status: state.status,
        server: state.ntpServer,
        drift_ms: state.driftMs,
        round_trip_ms: state.roundTripMs,
        last_checked_at: state.checkedAt,
        error: state.error
      }
    };
  };

  const start = () => {
    refresh().catch((error) => {
      console.error('❌ Initial NTP verification error:', error.message);
    });

    if (!timer) {
      timer = setInterval(
        () => refresh().catch((error) => {
          console.error('❌ Scheduled NTP verification error:', error.message);
        }),
        refreshMinutes * 60 * 1000
      );

      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    }
  };

  return {
    start,
    refresh,
    getSnapshot,
    getState: () => ({ ...state })
  };
};

const normaliseOfflineEvent = (event) => ({
  clientEventId: String(event?.client_event_id || '').trim(),
  eventType: String(event?.event_type || '').trim().toLowerCase(),
  capturedAt: event?.captured_at,
  timezoneOffsetMinutes: Number(event?.timezone_offset_minutes),
  latitude: Number(event?.latitude),
  longitude: Number(event?.longitude),
  accuracyMeters: Number(event?.accuracy_meters),
  faceVerified: event?.face_verified === true || Number(event?.face_verified) === 1,
  faceMatchDistance:
    event?.face_match_distance === null ||
    event?.face_match_distance === undefined
      ? null
      : Number(event.face_match_distance),
  trustedTimeVerifiedAt: event?.trusted_time_verified_at || null,
  trustedTimeAgeMs:
    event?.trusted_time_age_ms === null ||
    event?.trusted_time_age_ms === undefined
      ? null
      : Number(event.trusted_time_age_ms)
});

const registerPhase4EnhancementRoutes = ({
  app,
  db,
  requireAuth,
  evaluateGeofence,
  authorizedLocations,
  writeAuditLog,
  trustedTimeService
}) => {
  app.get(
    '/api/attendance/geofences',
    requireAuth,
    (req, res) => res.status(200).json({
      success: 1,
      radiusMeters: 50,
      locations: authorizedLocations.map((location) => ({
        id: location.id,
        name: location.name,
        lat: Number(location.lat),
        lng: Number(location.lng),
        radiusMeters: Number(location.radiusMeters)
      }))
    })
  );

  app.get(
    '/api/system/public-holidays',
    requireAuth,
    (req, res) => {
      const requestedYear = Number(req.query.year || new Date().getFullYear());

      if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2100) {
        return res.status(400).json({
          success: 0,
          message: 'Invalid public-holiday year.'
        });
      }

      return res.status(200).json({
        success: 1,
        country: 'South Africa',
        year: requestedYear,
        holidays: getSouthAfricanPublicHolidays(requestedYear)
      });
    }
  );

  app.get(
    '/api/system/time',
    requireAuth,
    async (req, res) => {
      try {
        const snapshot = await trustedTimeService.getSnapshot();

        return res.status(200).json({
          success: 1,
          ...snapshot
        });
      } catch (error) {
        console.error('❌ Trusted time snapshot error:', error);

        return res.status(500).json({
          success: 0,
          message: 'Unable to retrieve authoritative server time.'
        });
      }
    }
  );

  app.post(
    '/api/attendance/sync-offline',
    requireAuth,
    async (req, res) => {
      const employeeId = Number(req.user.userId);
      const events = Array.isArray(req.body?.events)
        ? req.body.events.slice(0, 50)
        : [];

      if (events.length === 0) {
        return res.status(400).json({
          success: 0,
          message: 'No offline attendance events were supplied.'
        });
      }

      const maxAgeHours = Math.max(
        Number(process.env.OFFLINE_SYNC_MAX_AGE_HOURS || 168),
        1
      );
      const maxGpsAccuracy = Math.max(
        Number(process.env.OFFLINE_MAX_GPS_ACCURACY_METERS || 100),
        20
      );

      const sortedEvents = events
        .map(normaliseOfflineEvent)
        .sort((a, b) => {
          const aTime = new Date(a.capturedAt).getTime();
          const bTime = new Date(b.capturedAt).getTime();
          return aTime - bTime;
        });

      const results = [];

      for (const event of sortedEvents) {
        const result = {
          client_event_id: event.clientEventId,
          status: 'Rejected',
          message: '',
          attendance_id: null
        };

        const capturedDate = new Date(event.capturedAt);
        const capturedEpochMs = capturedDate.getTime();
        const ageMs = Date.now() - capturedEpochMs;
        const allowedTypes = [
          'clock_in',
          'clock_out',
          'auto_clock_out_geofence'
        ];

        const basicValidationError = (() => {
          if (!/^[A-Za-z0-9._:-]{10,100}$/.test(event.clientEventId)) {
            return 'Invalid offline event identifier.';
          }
          if (!allowedTypes.includes(event.eventType)) {
            return 'Invalid offline attendance event type.';
          }
          if (Number.isNaN(capturedEpochMs)) {
            return 'Invalid offline attendance timestamp.';
          }
          if (ageMs < -15 * 60 * 1000) {
            return 'Offline attendance timestamp is too far in the future.';
          }
          if (ageMs > maxAgeHours * 60 * 60 * 1000) {
            return `Offline attendance event is older than the ${maxAgeHours}-hour synchronization window.`;
          }
          if (
            !Number.isFinite(event.latitude) ||
            event.latitude < -90 ||
            event.latitude > 90 ||
            !Number.isFinite(event.longitude) ||
            event.longitude < -180 ||
            event.longitude > 180
          ) {
            return 'Invalid offline GPS coordinates.';
          }
          if (
            !Number.isFinite(event.accuracyMeters) ||
            event.accuracyMeters <= 0 ||
            event.accuracyMeters > maxGpsAccuracy
          ) {
            return `Offline GPS accuracy must be ${maxGpsAccuracy} metres or better.`;
          }
          if (
            event.eventType !== 'auto_clock_out_geofence' &&
            !event.faceVerified
          ) {
            return 'Offline attendance requires successful face verification.';
          }
          return null;
        })();

        if (basicValidationError) {
          result.message = basicValidationError;
          results.push(result);
          continue;
        }

        const [existingEvents] = await db.query(
          `
          SELECT
            employee_id,
            sync_status,
            rejection_reason,
            attendance_id
          FROM attendance_offline_events
          WHERE client_event_id = ?
          LIMIT 1
          `,
          [event.clientEventId]
        );

        if (existingEvents.length > 0) {
          const existing = existingEvents[0];

          if (Number(existing.employee_id) !== employeeId) {
            result.status = 'Rejected';
            result.message = 'Offline event identifier belongs to another employee.';
          } else {
            result.status = existing.sync_status === 'Synced'
              ? 'Duplicate'
              : existing.sync_status;
            result.message = existing.rejection_reason || 'Offline event already processed.';
            result.attendance_id = existing.attendance_id || null;
          }

          results.push(result);
          continue;
        }

        const geofence = evaluateGeofence(
          event.latitude,
          event.longitude
        );

        const isAutomaticExit = event.eventType === 'auto_clock_out_geofence';
        const geofenceAccepted = isAutomaticExit
          ? !geofence.inZone
          : geofence.inZone;

        const trustedTimeAgeMs = Number.isFinite(event.trustedTimeAgeMs)
          ? Math.max(event.trustedTimeAgeMs, 0)
          : null;
        const timeNeedsReview =
          trustedTimeAgeMs === null ||
          trustedTimeAgeMs > 24 * 60 * 60 * 1000;

        const trustedVerifiedDate = event.trustedTimeVerifiedAt
          ? new Date(event.trustedTimeVerifiedAt)
          : null;
        const trustedVerifiedValid =
          trustedVerifiedDate && !Number.isNaN(trustedVerifiedDate.getTime());

        const connection = await db.getConnection();

        try {
          await connection.beginTransaction();

          await connection.query(
            `
            INSERT INTO attendance_offline_events (
              client_event_id,
              employee_id,
              event_type,
              captured_at,
              captured_at_epoch_ms,
              timezone_offset_minutes,
              latitude,
              longitude,
              accuracy_meters,
              face_verified,
              face_match_distance,
              trusted_time_verified_at,
              trusted_time_age_ms,
              geofence_location_id,
              geofence_distance_meters,
              sync_status
            )
            VALUES (
              ?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending'
            )
            `,
            [
              event.clientEventId,
              employeeId,
              event.eventType,
              capturedEpochMs / 1000,
              capturedEpochMs,
              Number.isFinite(event.timezoneOffsetMinutes)
                ? event.timezoneOffsetMinutes
                : null,
              event.latitude,
              event.longitude,
              event.accuracyMeters,
              event.faceVerified ? 1 : 0,
              Number.isFinite(event.faceMatchDistance)
                ? event.faceMatchDistance
                : null,
              trustedVerifiedValid ? trustedVerifiedDate : null,
              trustedTimeAgeMs,
              geofence.locationId || null,
              Number.isFinite(geofence.distance) ? geofence.distance : null
            ]
          );

          if (!geofenceAccepted) {
            const reason = isAutomaticExit
              ? 'Automatic geofence-exit event was captured inside an authorised zone.'
              : 'Offline attendance was captured outside the authorised geofence.';

            await connection.query(
              `
              UPDATE attendance_offline_events
              SET
                sync_status = 'Rejected',
                rejection_reason = ?,
                processed_at = CURRENT_TIMESTAMP(3)
              WHERE client_event_id = ?
              `,
              [reason, event.clientEventId]
            );

            await connection.commit();
            result.status = 'Rejected';
            result.message = reason;
            results.push(result);
            continue;
          }

          const locationStatus = isAutomaticExit
            ? 'Outside Geofence'
            : `${geofence.locationName} ✅ (${geofence.distance.toFixed(1)}m, offline capture)`;
          const syncStatus = isAutomaticExit
            ? 'Offline - Synced Auto Clock-Out'
            : timeNeedsReview
              ? 'Offline - Synced - Time Review'
              : 'Offline - Synced';

          if (event.eventType === 'clock_in') {
            const [nearbyRows] = await connection.query(
              `
              SELECT id
              FROM attendance
              WHERE employee_id = ?
                AND ABS(
                  TIMESTAMPDIFF(
                    SECOND,
                    clock_in,
                    FROM_UNIXTIME(?)
                  )
                ) <= 60
              LIMIT 1
              `,
              [employeeId, capturedEpochMs / 1000]
            );

            if (nearbyRows.length > 0) {
              const attendanceId = nearbyRows[0].id;

              await connection.query(
                `
                UPDATE attendance_offline_events
                SET
                  sync_status = 'Synced',
                  attendance_id = ?,
                  rejection_reason = 'Duplicate clock-in matched existing attendance record.',
                  processed_at = CURRENT_TIMESTAMP(3)
                WHERE client_event_id = ?
                `,
                [attendanceId, event.clientEventId]
              );

              await connection.commit();
              result.status = 'Duplicate';
              result.message = 'Clock-in already exists on the server.';
              result.attendance_id = attendanceId;
              results.push(result);
              continue;
            }

            const [activeRows] = await connection.query(
              `
              SELECT id
              FROM attendance
              WHERE employee_id = ?
                AND clock_in IS NOT NULL
                AND clock_out IS NULL
              ORDER BY clock_in DESC
              LIMIT 1
              `,
              [employeeId]
            );

            if (activeRows.length > 0) {
              const reason = 'Employee already has an active shift on the server.';

              await connection.query(
                `
                UPDATE attendance_offline_events
                SET
                  sync_status = 'Rejected',
                  rejection_reason = ?,
                  processed_at = CURRENT_TIMESTAMP(3)
                WHERE client_event_id = ?
                `,
                [reason, event.clientEventId]
              );

              await connection.commit();
              result.status = 'Rejected';
              result.message = reason;
              results.push(result);
              continue;
            }

            const [insertResult] = await connection.query(
              `
              INSERT INTO attendance (
                employee_id,
                clock_in,
                clock_in_latitude,
                clock_in_longitude,
                location_status,
                sync_status
              )
              VALUES (?, FROM_UNIXTIME(?), ?, ?, ?, ?)
              `,
              [
                employeeId,
                capturedEpochMs / 1000,
                event.latitude,
                event.longitude,
                locationStatus,
                syncStatus
              ]
            );

            result.attendance_id = insertResult.insertId;
          } else {
            const [activeRows] = await connection.query(
              `
              SELECT id, clock_in
              FROM attendance
              WHERE employee_id = ?
                AND clock_in IS NOT NULL
                AND clock_out IS NULL
                AND clock_in <= FROM_UNIXTIME(?)
              ORDER BY clock_in DESC
              LIMIT 1
              `,
              [employeeId, capturedEpochMs / 1000]
            );

            if (activeRows.length === 0) {
              const [duplicateClockOutRows] = await connection.query(
                `
                SELECT id
                FROM attendance
                WHERE employee_id = ?
                  AND clock_out IS NOT NULL
                  AND ABS(
                    TIMESTAMPDIFF(
                      SECOND,
                      clock_out,
                      FROM_UNIXTIME(?)
                    )
                  ) <= 60
                LIMIT 1
                `,
                [employeeId, capturedEpochMs / 1000]
              );

              if (duplicateClockOutRows.length > 0) {
                result.attendance_id = duplicateClockOutRows[0].id;

                await connection.query(
                  `
                  UPDATE attendance_offline_events
                  SET
                    sync_status = 'Synced',
                    attendance_id = ?,
                    rejection_reason = 'Duplicate clock-out matched existing attendance record.',
                    processed_at = CURRENT_TIMESTAMP(3)
                  WHERE client_event_id = ?
                  `,
                  [result.attendance_id, event.clientEventId]
                );

                await connection.commit();
                result.status = 'Duplicate';
                result.message = 'Clock-out already exists on the server.';
                results.push(result);
                continue;
              }

              const reason = 'No matching active shift was found for the offline clock-out.';

              await connection.query(
                `
                UPDATE attendance_offline_events
                SET
                  sync_status = 'Rejected',
                  rejection_reason = ?,
                  processed_at = CURRENT_TIMESTAMP(3)
                WHERE client_event_id = ?
                `,
                [reason, event.clientEventId]
              );

              await connection.commit();
              result.status = 'Rejected';
              result.message = reason;
              results.push(result);
              continue;
            }

            const attendanceId = activeRows[0].id;
            const automaticExit = event.eventType === 'auto_clock_out_geofence';

            await connection.query(
              `
              UPDATE attendance
              SET
                clock_out = FROM_UNIXTIME(?),
                clock_out_latitude = ?,
                clock_out_longitude = ?,
                location_status = ?,
                sync_status = ?,
                total_hours = ROUND(
                  TIMESTAMPDIFF(
                    SECOND,
                    clock_in,
                    FROM_UNIXTIME(?)
                  ) / 3600,
                  2
                )
              WHERE id = ?
              `,
              [
                capturedEpochMs / 1000,
                event.latitude,
                event.longitude,
                automaticExit ? 'Outside Geofence' : locationStatus,
                syncStatus,
                capturedEpochMs / 1000,
                attendanceId
              ]
            );

            result.attendance_id = attendanceId;
          }

          await connection.query(
            `
            UPDATE attendance_offline_events
            SET
              sync_status = 'Synced',
              attendance_id = ?,
              processed_at = CURRENT_TIMESTAMP(3)
            WHERE client_event_id = ?
            `,
            [result.attendance_id, event.clientEventId]
          );

          await connection.commit();

          result.status = 'Synced';
          result.message = timeNeedsReview
            ? 'Offline attendance synchronized; captured time is flagged for review because the trusted-time reference was older than 24 hours.'
            : 'Offline attendance synchronized successfully.';

          await writeAuditLog(
            employeeId,
            'OFFLINE_ATTENDANCE_SYNCED',
            `Offline ${event.eventType} event ${event.clientEventId} synchronized to attendance ID ${result.attendance_id}. ${result.message}`,
            req.ip
          );

          results.push(result);
        } catch (error) {
          try {
            await connection.rollback();
          } catch (_) {
            // Ignore rollback failure.
          }

          if (error && error.code === 'ER_DUP_ENTRY') {
            result.status = 'Duplicate';
            result.message = 'Offline event was already processed.';
          } else {
            result.status = 'Error';
            result.message = error.sqlMessage || error.message || 'Offline synchronization error.';
          }

          results.push(result);
        } finally {
          connection.release();
        }
      }

      const syncedCount = results.filter((item) => item.status === 'Synced').length;
      const duplicateCount = results.filter((item) => item.status === 'Duplicate').length;
      const rejectedCount = results.filter((item) => item.status === 'Rejected').length;
      const errorCount = results.filter((item) => item.status === 'Error').length;

      return res.status(200).json({
        success: errorCount === 0 ? 1 : 0,
        processed: results.length,
        synced: syncedCount,
        duplicates: duplicateCount,
        rejected: rejectedCount,
        errors: errorCount,
        results
      });
    }
  );
};

module.exports = {
  LEAVE_POLICIES,
  calculateEasterSunday,
  getSouthAfricanPublicHolidays,
  countSouthAfricanWorkingDays,
  getCalendarLeaveCycle,
  ensurePhase4Infrastructure,
  ensureCurrentLeaveBalances,
  ensureAllCurrentLeaveBalances,
  recalculateCurrentLeaveBalance,
  queryNtpServer,
  createTrustedTimeService,
  registerPhase4EnhancementRoutes
};
