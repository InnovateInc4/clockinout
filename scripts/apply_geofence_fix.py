from pathlib import Path


def replace_exact(text, old, new, expected=1, label='replacement'):
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f'{label} anchor mismatch: expected {expected}, found {count}'
        )
    return text.replace(old, new, expected)


# ============================================================
# BACKEND
# Keep the required 50 m worksite radius, close the uncovered
# Central Campus gaps, and use bounded browser GPS uncertainty.
# ============================================================
server_path = Path('server/server.js')
server = server_path.read_text(encoding='utf-8')
server_original = server

zone4 = """  // ====================================================
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
"""

expanded_zones = """  // ====================================================
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
  },


  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 5
  // Connector between Moroka Hall and the northern part of
  // Central Campus. This closes a gap without enlarging 50 m.
  // ====================================================
  {
    id: 'spu-central-zone-5',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.748012,

    lng:
      24.764565,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  },


  // ====================================================
  // SPU CENTRAL CAMPUS - ZONE 6
  // Northern / central campus coverage point.
  // ====================================================
  {
    id: 'spu-central-zone-6',

    name:
      'Sol Plaatje University Central Campus',

    lat:
      -28.747590,

    lng:
      24.764840,

    radiusMeters:
      GEOFENCE_RADIUS_METERS
  }

];
"""
server = replace_exact(
    server,
    zone4,
    expanded_zones,
    label='Central Campus zones'
)

evaluate_header = """const evaluateGeofence = (
  latitude,
  longitude
) => {
"""

evaluate_header_new = """// Browser geolocation on laptops can report a small uncertainty
// radius even while an employee is standing at the workplace. Use
// only a bounded part of that uncertainty and reject very coarse GPS.
const MAX_GPS_ACCURACY_ALLOWANCE_METERS = 50;
const MAX_ACCEPTABLE_GPS_ACCURACY_METERS = 150;

const evaluateGeofence = (
  latitude,
  longitude,
  accuracyMeters = 0
) => {

  const rawGpsAccuracy =
    Number(accuracyMeters);

  const gpsAccuracy =
    Number.isFinite(rawGpsAccuracy) &&
    rawGpsAccuracy > 0
      ? rawGpsAccuracy
      : 0;

  const gpsReliable =
    gpsAccuracy === 0 ||
    gpsAccuracy <=
      MAX_ACCEPTABLE_GPS_ACCURACY_METERS;

  const gpsAccuracyAllowance =
    Math.min(
      gpsAccuracy,
      MAX_GPS_ACCURACY_ALLOWANCE_METERS
    );
"""
server = replace_exact(
    server,
    evaluate_header,
    evaluate_header_new,
    label='evaluateGeofence header'
)

in_zone_old = """    inZone:

      nearestLocation.distance <=
      nearestLocation.radiusMeters,
"""

in_zone_new = """    inZone:

      gpsReliable &&
      nearestLocation.distance <=
        nearestLocation.radiusMeters +
        gpsAccuracyAllowance,
"""
server = replace_exact(
    server,
    in_zone_old,
    in_zone_new,
    label='geofence decision'
)

return_tail_old = """    allowedRadius:
      nearestLocation.radiusMeters

  };
};
"""

return_tail_new = """    allowedRadius:
      nearestLocation.radiusMeters,

    gpsAccuracy:
      gpsAccuracy,

    accuracyAllowance:
      gpsAccuracyAllowance,

    gpsReliable:
      gpsReliable

  };
};
"""
server = replace_exact(
    server,
    return_tail_old,
    return_tail_new,
    label='geofence metadata'
)

simple_body_old = """    const {
      latitude,
      longitude
    } = req.body;
"""

simple_body_new = """    const {
      latitude,
      longitude,
      accuracy_meters
    } = req.body;
"""
server = replace_exact(
    server,
    simple_body_old,
    simple_body_new,
    expected=2,
    label='location request bodies'
)

attendance_body_old = """  const {
    latitude,
    longitude,
    sync_status
  } = req.body;
"""

attendance_body_new = """  const {
    latitude,
    longitude,
    accuracy_meters,
    sync_status
  } = req.body;
"""
server = replace_exact(
    server,
    attendance_body_old,
    attendance_body_new,
    expected=2,
    label='attendance request bodies'
)

indented_geofence_call_old = """      evaluateGeofence(
        employeeLatitude,
        employeeLongitude
      );
"""

indented_geofence_call_new = """      evaluateGeofence(
        employeeLatitude,
        employeeLongitude,
        accuracy_meters
      );
"""
server = replace_exact(
    server,
    indented_geofence_call_old,
    indented_geofence_call_new,
    expected=2,
    label='location geofence calls'
)

attendance_geofence_call_old = """  evaluateGeofence(
    employeeLatitude,
    employeeLongitude
  );
"""

attendance_geofence_call_new = """  evaluateGeofence(
    employeeLatitude,
    employeeLongitude,
    accuracy_meters
  );
"""
server = replace_exact(
    server,
    attendance_geofence_call_old,
    attendance_geofence_call_new,
    expected=2,
    label='attendance geofence calls'
)

check_response_old = """      allowedRadius:
        geofence.allowedRadius

    });
"""

check_response_new = """      allowedRadius:
        geofence.allowedRadius,

      gpsAccuracy:
        Number(
          geofence.gpsAccuracy.toFixed(1)
        ),

      accuracyAllowance:
        Number(
          geofence.accuracyAllowance.toFixed(1)
        ),

      gpsReliable:
        geofence.gpsReliable

    });
"""
server = replace_exact(
    server,
    check_response_old,
    check_response_new,
    label='location response metadata'
)

auto_guard_anchor = """    // This endpoint must NEVER auto clock-out
    // somebody who is still inside an authorised zone.

    if (geofence.inZone) {
"""

auto_guard_new = """    // Never auto clock-out from a coarse / unreliable GPS fix.
    if (!geofence.gpsReliable) {

      return res.status(400).json({
        success: 0,
        message:
          `GPS accuracy is too low (±${geofence.gpsAccuracy.toFixed(0)}m). ` +
          `Automatic clock-out was not performed.`
      });

    }


    // This endpoint must NEVER auto clock-out
    // somebody who is still inside an authorised zone.

    if (geofence.inZone) {
"""
server = replace_exact(
    server,
    auto_guard_anchor,
    auto_guard_new,
    label='auto clock-out accuracy guard'
)

reject_anchor = """// --------------------------------------------------
// REJECT IF OUTSIDE ALL AUTHORISED LOCATIONS
// --------------------------------------------------

if (!geofence.inZone) {
"""

reject_new = """// --------------------------------------------------
// REJECT A GPS FIX THAT IS TOO COARSE FOR ATTENDANCE
// --------------------------------------------------

if (!geofence.gpsReliable) {

  return res.status(400).json({
    success: 0,
    message:
      `GPS accuracy is too low (±${geofence.gpsAccuracy.toFixed(0)}m). ` +
      `Move near a window, enable device location/Wi-Fi, or use a GPS-enabled phone and refresh the location.`
  });

}


// --------------------------------------------------
// REJECT IF OUTSIDE ALL AUTHORISED LOCATIONS
// --------------------------------------------------

if (!geofence.inZone) {
"""
server = replace_exact(
    server,
    reject_anchor,
    reject_new,
    expected=2,
    label='attendance accuracy guards'
)

if server == server_original:
    raise SystemExit('No backend geofence changes were produced.')
server_path.write_text(server, encoding='utf-8')


# ============================================================
# OFFLINE SERVER SYNC
# Reuse the accuracy captured with each offline event.
# ============================================================
phase4_path = Path('server/phase4Enhancements.js')
phase4 = phase4_path.read_text(encoding='utf-8')
phase4_original = phase4

offline_call_old = """        const geofence = evaluateGeofence(
          event.latitude,
          event.longitude
        );
"""

offline_call_new = """        const geofence = evaluateGeofence(
          event.latitude,
          event.longitude,
          event.accuracyMeters
        );
"""
phase4 = replace_exact(
    phase4,
    offline_call_old,
    offline_call_new,
    label='offline server geofence accuracy'
)

if phase4 == phase4_original:
    raise SystemExit('No offline server geofence change was produced.')
phase4_path.write_text(phase4, encoding='utf-8')


# ============================================================
# OFFLINE CLIENT GEOFENCE
# Keep offline validation consistent with online validation.
# ============================================================
offline_path = Path('src/utils/offlineAttendance.js')
offline = offline_path.read_text(encoding='utf-8')
offline_original = offline

offline_header_old = """export const evaluateCachedGeofence = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
"""

offline_header_new = """export const evaluateCachedGeofence = (
  latitude,
  longitude,
  accuracyMeters = 0
) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const rawAccuracy = Number(accuracyMeters);
  const gpsAccuracy =
    Number.isFinite(rawAccuracy) && rawAccuracy > 0
      ? rawAccuracy
      : 0;
  const gpsReliable =
    gpsAccuracy === 0 || gpsAccuracy <= 150;
  const accuracyAllowance = Math.min(gpsAccuracy, 50);
"""
offline = replace_exact(
    offline,
    offline_header_old,
    offline_header_new,
    label='cached geofence header'
)

offline_return_old = """  return {
    inZone: nearest.distance <= nearest.radiusMeters,
    locationName: nearest.name,
    locationId: nearest.id,
    distance: Number(nearest.distance.toFixed(1)),
    allowedRadius: nearest.radiusMeters
  };
};
"""

offline_return_new = """  return {
    inZone:
      gpsReliable &&
      nearest.distance <=
        nearest.radiusMeters + accuracyAllowance,
    locationName: nearest.name,
    locationId: nearest.id,
    distance: Number(nearest.distance.toFixed(1)),
    allowedRadius: nearest.radiusMeters,
    gpsAccuracy: Number(gpsAccuracy.toFixed(1)),
    accuracyAllowance: Number(accuracyAllowance.toFixed(1)),
    gpsReliable
  };
};
"""
offline = replace_exact(
    offline,
    offline_return_old,
    offline_return_new,
    label='cached geofence decision'
)

if offline == offline_original:
    raise SystemExit('No offline client geofence change was produced.')
offline_path.write_text(offline, encoding='utf-8')


# ============================================================
# FRONTEND
# Sample multiple high-accuracy positions and retain the best reading.
# ============================================================
front_path = Path('src/components/ClockInOut.js')
front = front_path.read_text(encoding='utf-8')
front_original = front

start_marker = 'const verifyLocation = () => {'
end_marker = '\n\n    const selectedTicketRef = useRef("default");'
start = front.find(start_marker)
end = front.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit('verifyLocation function markers were not found.')

improved_verify = r'''const getBestCurrentPosition = () => {

    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject(new Error("GPS is not supported on this device."));
            return;
        }

        let bestPosition = null;
        let lastError = null;
        let watchId = null;
        let timer = null;
        let finished = false;

        const cleanup = () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
            if (timer !== null) {
                clearTimeout(timer);
            }
        };

        const finish = () => {
            if (finished) return;
            finished = true;
            cleanup();

            if (bestPosition) {
                resolve(bestPosition);
                return;
            }

            reject(
                lastError ||
                new Error("Unable to obtain a GPS position.")
            );
        };

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const accuracy = Number(
                    position.coords.accuracy || Infinity
                );

                if (
                    !bestPosition ||
                    accuracy < Number(
                        bestPosition.coords.accuracy || Infinity
                    )
                ) {
                    bestPosition = position;
                }

                setLocationStatus(
                    `Improving GPS accuracy... ±${Math.round(accuracy)}m`
                );

                if (accuracy <= 25) {
                    finish();
                }
            },
            (error) => {
                lastError = error;

                if (
                    error.code === error.PERMISSION_DENIED &&
                    !bestPosition
                ) {
                    finish();
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            }
        );

        // The first desktop reading is often network based. Give the
        // browser a short window to refine it, then use the best sample.
        timer = setTimeout(
            finish,
            8000
        );
    });
};


const verifyLocation = async () => {

    if (!navigator.geolocation) {
        setIsInZone(false);
        setUserCoords(null);
        setLocationStatus("GPS is not supported on this device ❌");
        return;
    }

    setLocationStatus("Finding best GPS position...");

    let position;

    try {
        position = await getBestCurrentPosition();
    } catch (error) {
        console.error("❌ GPS Error:", error.message || error);
        setIsInZone(false);
        setUserCoords(null);

        const permissionDenied =
            error?.code === 1;

        setLocationStatus(
            permissionDenied
                ? "Location permission is blocked. Allow location access and refresh GPS ❌"
                : "Unable to obtain a reliable GPS position ❌"
        );
        return;
    }

    const {
        latitude,
        longitude,
        accuracy
    } = position.coords;

    console.log(`📍 Current latitude: ${latitude}`);
    console.log(`📍 Current longitude: ${longitude}`);
    console.log(`📡 Best GPS accuracy: ${accuracy.toFixed(1)}m`);

    setUserCoords({
        lat: latitude,
        lng: longitude,
        accuracy: accuracy
    });

    try {
        const response = await axios.post(
            "/api/attendance/check-location",
            {
                latitude: latitude,
                longitude: longitude,
                accuracy_meters: Number(accuracy || 0)
            },
            props.config
        );

        const result = response.data;

        if (result.gpsReliable === false) {
            setIsInZone(false);
            outsideGeofenceChecksRef.current = 0;
            setLocationStatus(
                `GPS signal too weak ❌ (±${Math.round(result.gpsAccuracy || accuracy)}m accuracy). ` +
                `Enable device location/Wi-Fi or use a GPS-enabled phone, then refresh.`
            );
            return;
        }

        if (result.success && result.inZone) {
            outsideGeofenceChecksRef.current = 0;
            setIsInZone(true);
            setLocationStatus(
                `${result.locationName} ✅ ` +
                `(${result.distance}m away, GPS ±${Math.round(accuracy)}m)`
            );
            return;
        }

        setIsInZone(false);
        setLocationStatus(
            `Outside Allowed Zone ❌ ` +
            `(${result.distance}m from nearest location, GPS ±${Math.round(accuracy)}m)`
        );

        if (clockedIn) {
            outsideGeofenceChecksRef.current += 1;

            console.log(
                `⚠️ Outside geofence check ${outsideGeofenceChecksRef.current}/3`
            );

            if (outsideGeofenceChecksRef.current >= 3) {
                await autoClockOutAfterGeofenceExit(
                    latitude,
                    longitude,
                    accuracy
                );
            }
        } else {
            outsideGeofenceChecksRef.current = 0;
        }

    } catch (error) {
        console.error(
            "❌ Geofence verification error:",
            error.response?.data || error.message
        );

        const networkFailure = !error.response;

        if (networkFailure) {
            const cachedResult = evaluateCachedGeofence(
                latitude,
                longitude,
                accuracy
            );

            if (cachedResult) {
                setIsInZone(cachedResult.inZone);
                setLocationStatus(
                    cachedResult.inZone
                        ? `Offline location cached locally ✅ (${cachedResult.distance}m) - server verification pending`
                        : `Offline - Outside Allowed Zone ❌ (${cachedResult.distance}m from nearest cached location)`
                );

                if (cachedResult.inZone) {
                    outsideGeofenceChecksRef.current = 0;
                } else if (clockedIn) {
                    outsideGeofenceChecksRef.current += 1;

                    console.log(
                        `📴 Offline outside geofence check ${outsideGeofenceChecksRef.current}/3`
                    );

                    if (outsideGeofenceChecksRef.current >= 3) {
                        await autoClockOutAfterGeofenceExit(
                            latitude,
                            longitude,
                            accuracy
                        );
                    }
                } else {
                    outsideGeofenceChecksRef.current = 0;
                }
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
    }
};'''

front = front[:start] + improved_verify + front[end:]

auto_payload_old = """                    {
                        latitude,
                        longitude
                    },
"""

auto_payload_new = """                    {
                        latitude,
                        longitude,
                        accuracy_meters:
                            Number(accuracy || 0)
                    },
"""
front = replace_exact(
    front,
    auto_payload_old,
    auto_payload_new,
    label='auto clock-out accuracy payload'
)

attendance_payload_old = """                    latitude: latitude,
                    longitude: longitude,
                    location_status: locationStatus,
"""

attendance_payload_new = """                    latitude: latitude,
                    longitude: longitude,
                    accuracy_meters: Number(accuracy || 0),
                    location_status: locationStatus,
"""
front = replace_exact(
    front,
    attendance_payload_old,
    attendance_payload_new,
    expected=2,
    label='clock in/out accuracy payloads'
)

cached_call_old = """            evaluateCachedGeofence(
                latitude,
                longitude
            );
"""

cached_call_new = """            evaluateCachedGeofence(
                latitude,
                longitude,
                accuracy
            );
"""
front = replace_exact(
    front,
    cached_call_old,
    cached_call_new,
    label='offline clock-in cached geofence accuracy'
)

if front == front_original:
    raise SystemExit('No frontend geofence changes were produced.')
front_path.write_text(front, encoding='utf-8')


# ============================================================
# GEOMETRY SAFETY CHECK
# Ensure the new campus points connect the previous geofences
# with overlapping 50 m coverage rather than enlarging radius.
# ============================================================
from math import radians, sin, cos, sqrt, atan2


def metres(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    earth = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    value = (
        sin(dlat / 2) ** 2 +
        cos(radians(lat1)) * cos(radians(lat2)) *
        sin(dlon / 2) ** 2
    )
    return 2 * earth * atan2(sqrt(value), sqrt(1 - value))


zone2 = (-28.748433, 24.764289)
zone5 = (-28.748012, 24.764565)
zone6 = (-28.747590, 24.764840)

if metres(zone2, zone5) >= 100 or metres(zone5, zone6) >= 100:
    raise SystemExit('New Central Campus 50 m circles do not overlap as intended.')

print('SPU geofence patch applied and geometry checks passed.')
