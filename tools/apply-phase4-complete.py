from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


server_path = Path('server/server.js')
clock_path = Path('src/components/ClockInOut.js')

server = server_path.read_text(encoding='utf-8')
clock = clock_path.read_text(encoding='utf-8')
original_server = server
original_clock = clock

# ==========================================================
# BACKEND
# ==========================================================
if "require('./phase4Enhancements')" not in server:
    import_anchor = "const crypto = require('crypto');\n"
    import_block = """const crypto = require('crypto');
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
"""
    server = replace_once(server, import_anchor, import_block, 'phase4 service import')

registration_gate = """// --------------------------------------------------
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
"""
if registration_gate in server:
    registration_replacement = """// --------------------------------------------------
// REQUIRE A REASONABLY STRONG EMPLOYEE PASSWORD
// --------------------------------------------------

if (String(password).length < 8) {

  return res.status(400).json({
    success: 0,
    message:
      'Password must be at least 8 characters long.'
  });

}
"""
    server = replace_once(server, registration_gate, registration_replacement, 'registration password gate')

login_gate = """// --------------------------------------------------
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

"""
if login_gate in server:
    login_replacement = """// --------------------------------------------------
// PASSWORD IS VERIFIED AGAINST THIS ACCOUNT BELOW
// --------------------------------------------------
// No shared repository-wide password gate is used.

"""
    server = replace_once(server, login_gate, login_replacement, 'shared login password gate')

if 'Automatically initialise leave balances for the new employee.' not in server:
    registration_log = """    console.log(
      `✅ Employee registered securely: ${cleanEmail} | ID: ${result.insertId}`
    );
"""
    registration_log_new = """    // Automatically initialise leave balances for the new employee.
    await ensureCurrentLeaveBalances(
      db,
      result.insertId
    );


    console.log(
      `✅ Employee registered securely: ${cleanEmail} | ID: ${result.insertId}`
    );
"""
    server = replace_once(server, registration_log, registration_log_new, 'new employee leave balance initialisation')

helper_pattern = re.compile(
    r"// ======================================================\n// LEAVE BALANCE HELPERS\n// ======================================================.*?(?=\s*// ======================================================\n// EMPLOYEE - VIEW OWN LEAVE BALANCES)",
    re.S,
)
if 'countSouthAfricanWorkingDays;' not in server:
    helper_replacement = """// ======================================================
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

"""
    server, count = helper_pattern.subn(helper_replacement, server, count=1)
    if count != 1:
        raise SystemExit(f'leave helper replacement: expected 1 block, found {count}')

balances_route_index = server.find("'/api/leave/my-balances'")
if balances_route_index == -1:
    raise SystemExit('leave balance route not found')
balances_anchor = """      const employeeId =
        req.user.userId;


      const [rows] =
"""
balances_pos = server.find(balances_anchor, balances_route_index)
if balances_pos == -1:
    raise SystemExit('leave balance ensure anchor not found')
if 'Keep the employee on the current automatic leave cycle.' not in server[balances_route_index:balances_route_index + 2200]:
    balances_new = """      const employeeId =
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
"""
    server = server[:balances_pos] + server[balances_pos:].replace(balances_anchor, balances_new, 1)

leave_update_index = server.find("'/api/tickets/update-leave-status'")
if leave_update_index == -1:
    raise SystemExit('leave update route not found')
leave_request_anchor = """      const leaveRequest =
        leaveRows[0];
"""
leave_request_pos = server.find(leave_request_anchor, leave_update_index)
if leave_request_pos == -1:
    raise SystemExit('leave request cycle anchor not found')
if 'Leave requests that cross two calendar leave cycles' not in server[leave_update_index:leave_update_index + 6000]:
    leave_request_new = leave_request_anchor + """

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
"""
    server = server[:leave_request_pos] + server[leave_request_pos:].replace(leave_request_anchor, leave_request_new, 1)

recalc_call = """const updatedLeaveBalance =
  await recalculateLeaveBalance(
    leaveRequest.employee_id,
    leaveRequest.type
  );"""
recalc_call_new = """const updatedLeaveBalance =
  await recalculateLeaveBalance(
    leaveRequest.employee_id,
    leaveRequest.type,
    leaveRequest.start_date
  );"""
if recalc_call in server:
    server = replace_once(server, recalc_call, recalc_call_new, 'cycle-aware leave recalculation')

final_status_anchor = """      const finalStatus =
        normalizedStatus === 'approved'
          ? 'Approved'
          : 'Denied';
"""
if 'const leaveStatusChanged =' not in server[leave_update_index:leave_update_index + 10000]:
    final_status_new = final_status_anchor + """


      const leaveStatusChanged =
        String(leaveRequest.status || '')
          .trim()
          .toLowerCase() !==
        finalStatus.toLowerCase();
"""
    server = replace_once(server, final_status_anchor, final_status_new, 'leave status change flag')

notification_block = """try {

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
"""
notify_index = server.find('// NOTIFY EMPLOYEE ABOUT LEAVE DECISION', leave_update_index)
if (
    notification_block in server and
    notify_index != -1 and
    'if (leaveStatusChanged)' not in server[notify_index:notify_index + 2500]
):
    notification_new = """if (leaveStatusChanged) {

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
"""
    server = replace_once(server, notification_block, notification_new, 'duplicate leave notification protection')

geofence_marker = """};
  // ======================================================
// ATTENDANCE - CHECK CURRENT LOCATION
// ======================================================
"""
if 'registerPhase4EnhancementRoutes({' not in server:
    geofence_registration = """};

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
"""
    server = replace_once(server, geofence_marker, geofence_registration, 'phase4 route registration')

old_time_pattern = re.compile(
    r"// ======================================================\n// SYSTEM - AUTHORITATIVE DATABASE TIME\n// ======================================================\n\napp\.get\(\n  '/api/system/time'.*?\n\);\n\n(?=// ======================================================\n// START SERVER)",
    re.S,
)
if "source: 'MySQL server time'" in server:
    server, count = old_time_pattern.subn(
        "// Trusted time endpoint is registered by phase4Enhancements.js.\n\n",
        server,
        count=1,
    )
    if count != 1:
        raise SystemExit(f'old system time route removal: expected 1, found {count}')

startup_anchor = """  // Check once immediately when server starts
  await closeStaleAttendanceShifts();
"""
if 'Phase 4 support tables are ready' not in server:
    startup_new = """  // Ensure final Phase 4 support tables exist before accepting work.
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
"""
    server = replace_once(server, startup_anchor, startup_new, 'startup infrastructure')

# ==========================================================
# FRONTEND
# ==========================================================
if 'from "../utils/offlineAttendance"' not in clock:
    import_anchor = 'import TicketList from "./TicketList";\n'
    import_new = """import TicketList from "./TicketList";
import {
    cacheAuthorizedGeofences,
    cacheTrustedTimeSnapshot,
    createOfflineAttendanceEventId,
    evaluateCachedGeofence,
    getOfflineAttendanceQueueCount,
    getTrustedOfflineTimestamp,
    queueOfflineAttendanceEvent,
    syncPendingOfflineAttendance
} from "../utils/offlineAttendance";
"""
    clock = replace_once(clock, import_anchor, import_new, 'offline utility import')

state_anchor = """const autoClockOutRunningRef =
    useRef(false);
"""
if 'offlineQueueCount' not in clock:
    state_new = state_anchor + """

// ======================================================
// OFFLINE-FIRST ATTENDANCE + TRUSTED TIME
// ======================================================
const [offlineQueueCount, setOfflineQueueCount] =
    useState(() => getOfflineAttendanceQueueCount());

const [browserOnline, setBrowserOnline] =
    useState(() =>
        typeof navigator === "undefined"
            ? true
            : navigator.onLine
    );

const [offlineSyncStatus, setOfflineSyncStatus] =
    useState("Online");

const [faceMatchDistance, setFaceMatchDistance] =
    useState(null);
"""
    clock = replace_once(clock, state_anchor, state_new, 'offline attendance state')

auto_signature = """const autoClockOutAfterGeofenceExit =
    async (latitude, longitude) => {
"""
if auto_signature in clock:
    clock = replace_once(
        clock,
        auto_signature,
        """const autoClockOutAfterGeofenceExit =
    async (latitude, longitude, accuracy = userCoords?.accuracy || null) => {
""",
        'auto clockout accuracy signature'
    )

auto_guard_anchor = """        // Prevent duplicate requests
        if (autoClockOutRunningRef.current) {
            return;
        }

        autoClockOutRunningRef.current = true;

        try {
"""
if 'Offline automatic geofence clock-out queued' not in clock:
    auto_guard_new = """        // Prevent duplicate requests
        if (autoClockOutRunningRef.current) {
            return;
        }

        autoClockOutRunningRef.current = true;

        // If connectivity is unavailable, preserve the automatic
        // geofence-exit event locally and let the server verify it
        // when the connection returns.
        if (
            typeof navigator !== "undefined" &&
            !navigator.onLine
        ) {

            const employeeId =
                sessionStorage.getItem("userId");

            const trustedTime =
                getTrustedOfflineTimestamp(new Date());

            const queued =
                queueOfflineAttendanceEvent({
                    client_event_id:
                        createOfflineAttendanceEventId(
                            employeeId || "employee"
                        ),
                    event_type:
                        "auto_clock_out_geofence",
                    captured_at:
                        trustedTime.captured_at,
                    timezone_offset_minutes:
                        new Date().getTimezoneOffset(),
                    latitude,
                    longitude,
                    accuracy_meters:
                        Number(accuracy || 0),
                    face_verified:
                        false,
                    face_match_distance:
                        null,
                    trusted_time_verified_at:
                        trustedTime.trusted_time_verified_at,
                    trusted_time_age_ms:
                        trustedTime.trusted_time_age_ms
                });

            setOfflineQueueCount(
                queued.length
            );

            setClockedIn(false);

            if (props.setIsClockedIn) {
                props.setIsClockedIn(false);
            }

            outsideGeofenceChecksRef.current = 0;
            autoClockOutRunningRef.current = false;

            props.showAlert(
                "Offline automatic geofence clock-out queued. It will be server-verified when connectivity returns.",
                "warning"
            );

            return;
        }

        try {
"""
    clock = replace_once(clock, auto_guard_anchor, auto_guard_new, 'offline automatic geofence exit')

if 'const refreshOfflineSecurityCaches = async' not in clock:
    verify_marker = "const verifyLocation = () => {\n"
    helper_block = """const refreshOfflineSecurityCaches = async () => {

    if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
    ) {
        return;
    }

    try {
        const geofenceResponse =
            await axios.get(
                "/api/attendance/geofences",
                props.config
            );

        if (geofenceResponse.data?.success) {
            cacheAuthorizedGeofences(
                geofenceResponse.data.locations || []
            );
        }
    } catch (error) {
        console.warn(
            "⚠️ Could not refresh offline geofence cache:",
            error.response?.data || error.message
        );
    }

    try {
        const timeResponse =
            await axios.get(
                "/api/system/time",
                props.config
            );

        if (timeResponse.data?.success) {
            cacheTrustedTimeSnapshot(
                timeResponse.data
            );
        }
    } catch (error) {
        console.warn(
            "⚠️ Could not refresh trusted-time cache:",
            error.response?.data || error.message
        );
    }
};


const syncOfflineAttendanceQueue = async () => {

    if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
    ) {
        setOfflineSyncStatus("Offline");
        setOfflineQueueCount(
            getOfflineAttendanceQueueCount()
        );
        return;
    }

    const pendingCount =
        getOfflineAttendanceQueueCount();

    if (pendingCount === 0) {
        setOfflineQueueCount(0);
        setOfflineSyncStatus("Online");
        return;
    }

    setOfflineSyncStatus("Syncing");

    try {
        const result =
            await syncPendingOfflineAttendance(
                props.config
            );

        setOfflineQueueCount(
            result.remaining.length
        );

        if (result.synced > 0) {
            props.showAlert(
                `${result.synced} offline attendance event(s) synchronized successfully.`,
                "success"
            );
        }

        if (result.rejected > 0) {
            props.showAlert(
                `${result.rejected} offline attendance event(s) were rejected by server verification and are available in the server audit log.`,
                "warning"
            );
        }

        if (
            result.synced > 0 ||
            result.duplicates > 0 ||
            result.rejected > 0
        ) {
            await populateFields();
        }

        setOfflineSyncStatus(
            result.remaining.length > 0
                ? "Pending"
                : "Online"
        );

    } catch (error) {
        console.error(
            "❌ Offline attendance synchronization error:",
            error.response?.data || error.message
        );

        setOfflineQueueCount(
            getOfflineAttendanceQueueCount()
        );
        setOfflineSyncStatus("Pending");
    }
};


"""
    clock = replace_once(clock, verify_marker, helper_block + verify_marker, 'offline cache and sync helpers')

coords_anchor = """            setUserCoords({

                lat: latitude,

                lng: longitude

            });
"""
if 'accuracy: accuracy' not in clock:
    coords_new = """            setUserCoords({

                lat: latitude,

                lng: longitude,

                accuracy: accuracy

            });
"""
    clock = replace_once(clock, coords_anchor, coords_new, 'GPS accuracy capture')

auto_call = """            await autoClockOutAfterGeofenceExit(
                latitude,
                longitude
            );
"""
if auto_call in clock:
    auto_call_new = """            await autoClockOutAfterGeofenceExit(
                latitude,
                longitude,
                accuracy
            );
"""
    clock = replace_once(clock, auto_call, auto_call_new, 'auto clockout accuracy call')

geofence_catch_pattern = re.compile(
    r"            \} catch \(error\) \{\n\n                console\.error\(\n                    \"❌ Geofence verification error:\",.*?\n                \);\n\n\n                setIsInZone\(false\);\n\n\n                setLocationStatus\(\n\n                    error\.response\?\.data\?\.message \|\|\n                    \"Unable to verify work location ❌\"\n\n                \);\n\n            \}",
    re.S,
)
if 'Offline location cached locally' not in clock:
    geofence_catch_replacement = """            } catch (error) {

                console.error(
                    "❌ Geofence verification error:",
                    error.response?.data ||
                    error.message
                );

                const networkFailure =
                    !error.response;

                if (networkFailure) {

                    const cachedResult =
                        evaluateCachedGeofence(
                            latitude,
                            longitude
                        );

                    if (cachedResult) {

                        setIsInZone(
                            cachedResult.inZone
                        );

                        setLocationStatus(
                            cachedResult.inZone
                                ? `Offline location cached locally ✅ (${cachedResult.distance}m) - server verification pending`
                                : `Offline - Outside Allowed Zone ❌ (${cachedResult.distance}m from nearest cached location)`
                        );

                        return;
                    }

                    setIsInZone(false);

                    setLocationStatus(
                        "Offline: no cached authorised geofence is available. Reconnect once before using offline attendance ❌"
                    );

                    return;
                }

                setIsInZone(false);

                setLocationStatus(
                    error.response?.data?.message ||
                    "Unable to verify work location ❌"
                );

            }"""
    clock, count = geofence_catch_pattern.subn(geofence_catch_replacement, clock, count=1)
    if count != 1:
        raise SystemExit(f'geofence offline fallback: expected 1 catch, found {count}')

if 'setFaceMatchDistance(' not in clock:
    match_anchor = """        setFaceVerified(true);
        setFaceStatus("Identity verified");
"""
    match_new = """        setFaceVerified(true);
        setFaceMatchDistance(
            distance
        );
        setFaceStatus("Identity verified");
"""
    clock = replace_once(clock, match_anchor, match_new, 'face match distance capture')

    failure_anchor = """            setFaceVerified(false);
            setFaceStatus("Face does not match registered profile");
"""
    failure_new = """            setFaceVerified(false);
            setFaceMatchDistance(null);
            setFaceStatus("Face does not match registered profile");
"""
    clock = replace_once(clock, failure_anchor, failure_new, 'face failure distance reset')

offline_submit_anchor = """    const latitude = userCoords?.lat || null;
    const longitude = userCoords?.lng || null;

    try {
"""
if 'Offline attendance event queued securely' not in clock:
    offline_submit_new = """    const latitude = userCoords?.lat || null;
    const longitude = userCoords?.lng || null;
    const accuracy = userCoords?.accuracy || null;


    if (
        latitude === null ||
        longitude === null
    ) {
        props.showAlert(
            "A valid GPS position is required for attendance.",
            "danger"
        );
        return;
    }


    // ==================================================
    // OFFLINE ATTENDANCE CAPTURE
    // ==================================================
    // Only enter offline mode when the browser explicitly reports
    // that connectivity is unavailable. This avoids creating a
    // duplicate if an online request merely times out after the
    // server has already accepted it.
    if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
    ) {

        const cachedGeofence =
            evaluateCachedGeofence(
                latitude,
                longitude
            );

        if (
            !cachedGeofence ||
            !cachedGeofence.inZone
        ) {
            props.showAlert(
                "Offline attendance is blocked because the cached authorised geofence cannot verify this location.",
                "danger"
            );
            return;
        }

        if (!faceVerified) {
            props.showAlert(
                "Complete face verification before recording offline attendance.",
                "warning"
            );
            return;
        }

        const trustedTime =
            getTrustedOfflineTimestamp(
                selectedTime || new Date()
            );

        const queued =
            queueOfflineAttendanceEvent({
                client_event_id:
                    createOfflineAttendanceEventId(
                        employeeId
                    ),
                event_type:
                    type === "in"
                        ? "clock_in"
                        : "clock_out",
                captured_at:
                    trustedTime.captured_at,
                timezone_offset_minutes:
                    new Date().getTimezoneOffset(),
                latitude,
                longitude,
                accuracy_meters:
                    Number(accuracy || 0),
                face_verified:
                    true,
                face_match_distance:
                    faceMatchDistance,
                trusted_time_verified_at:
                    trustedTime.trusted_time_verified_at,
                trusted_time_age_ms:
                    trustedTime.trusted_time_age_ms
            });

        setOfflineQueueCount(
            queued.length
        );
        setOfflineSyncStatus("Pending");

        const nextClockedIn =
            type === "in";

        setClockedIn(
            nextClockedIn
        );

        if (props.setIsClockedIn) {
            props.setIsClockedIn(
                nextClockedIn
            );
        }

        setFaceVerified(false);
        setFaceMatchDistance(null);
        setCapturedPhoto(null);

        props.showAlert(
            `Offline attendance event queued securely (${queued.length} pending). It will be re-verified and synchronized automatically when connectivity returns.`,
            "warning"
        );

        return;
    }

    try {
"""
    clock = replace_once(clock, offline_submit_anchor, offline_submit_new, 'offline final attendance capture')

reset_index = clock.find('// Reset verification')
if reset_index != -1 and 'setFaceMatchDistance(null);' not in clock[reset_index:reset_index + 500]:
    reset_anchor = """        setFaceVerified(false);
        setCapturedPhoto(null);
"""
    reset_new = """        setFaceVerified(false);
        setFaceMatchDistance(null);
        setCapturedPhoto(null);
"""
    clock = replace_once(clock, reset_anchor, reset_new, 'online face distance reset')

loaded_effect_marker = """    useEffect(() => {
    if (!loaded) {
"""
if 'handleBrowserOnline' not in clock:
    connectivity_effect = """    useEffect(() => {

    const handleBrowserOnline = async () => {
        setBrowserOnline(true);
        setOfflineSyncStatus("Online");

        await refreshOfflineSecurityCaches();
        await syncOfflineAttendanceQueue();
    };

    const handleBrowserOffline = () => {
        setBrowserOnline(false);
        setOfflineSyncStatus("Offline");
        setOfflineQueueCount(
            getOfflineAttendanceQueueCount()
        );
    };

    setOfflineQueueCount(
        getOfflineAttendanceQueueCount()
    );

    if (
        typeof navigator === "undefined" ||
        navigator.onLine
    ) {
        handleBrowserOnline();
    } else {
        handleBrowserOffline();
    }

    window.addEventListener(
        "online",
        handleBrowserOnline
    );

    window.addEventListener(
        "offline",
        handleBrowserOffline
    );

    return () => {
        window.removeEventListener(
            "online",
            handleBrowserOnline
        );
        window.removeEventListener(
            "offline",
            handleBrowserOffline
        );
    };

// Intentionally installed once for connectivity lifecycle handling.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


"""
    clock = replace_once(clock, loaded_effect_marker, connectivity_effect + loaded_effect_marker, 'connectivity lifecycle effect')

gps_marker = "    {/* GPS VERIFICATION BAR */}\n"
if 'OFFLINE ATTENDANCE STATUS' not in clock:
    offline_banner = """    {/* ======================================================
        OFFLINE ATTENDANCE STATUS
    ====================================================== */}
    {(!browserOnline || offlineQueueCount > 0 || offlineSyncStatus === "Syncing") && (
        <div
            className="glass-card"
            style={{
                background: browserOnline
                    ? 'rgba(255,247,237,0.94)'
                    : 'rgba(254,249,195,0.94)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '16px 18px',
                marginBottom: '16px',
                border: browserOnline
                    ? '1px solid #fed7aa'
                    : '1px solid #fde68a',
                color: '#7c2d12',
                fontSize: '0.86rem',
                fontWeight: '700'
            }}
        >
            <div style={{ fontWeight: '900', marginBottom: '4px' }}>
                {browserOnline
                    ? offlineSyncStatus === "Syncing"
                        ? '🔄 Synchronising Offline Attendance'
                        : '📤 Offline Attendance Pending Sync'
                    : '📴 Offline Attendance Mode'}
            </div>

            <div>
                {browserOnline
                    ? `${offlineQueueCount} attendance event(s) are waiting for server verification.`
                    : `Attendance can be securely queued using the cached 50 metre geofence, face verification and last trusted server-time reference. Pending events: ${offlineQueueCount}.`}
            </div>
        </div>
    )}

"""
    clock = replace_once(clock, gps_marker, offline_banner + gps_marker, 'offline status banner')

required_server_markers = [
    "registerPhase4EnhancementRoutes({",
    "countSouthAfricanWorkingDays;",
    "ensurePhase4Infrastructure(db);",
    "createTrustedTimeService(db)",
    "Leave requests that cross two calendar leave cycles"
]
required_clock_markers = [
    "syncPendingOfflineAttendance",
    "Offline attendance event queued securely",
    "Offline location cached locally",
    "OFFLINE ATTENDANCE STATUS",
    "handleBrowserOnline"
]

for marker in required_server_markers:
    if marker not in server:
        raise SystemExit(f'Missing required backend marker after patch: {marker}')

for marker in required_clock_markers:
    if marker not in clock:
        raise SystemExit(f'Missing required frontend marker after patch: {marker}')

if server != original_server:
    server_path.write_text(server, encoding='utf-8')
    print('Patched server/server.js')
else:
    print('server/server.js already contains completion changes')

if clock != original_clock:
    clock_path.write_text(clock, encoding='utf-8')
    print('Patched src/components/ClockInOut.js')
else:
    print('ClockInOut.js already contains completion changes')
