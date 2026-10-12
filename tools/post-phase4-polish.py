from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


path = Path('src/components/ClockInOut.js')
text = path.read_text(encoding='utf-8')
original = text

# Keep the last known duty state locally so a worker who refreshes the
# already-loaded app while temporarily offline cannot accidentally switch
# from an active shift to a second clock-in workflow.
if 'const cacheLocalClockState =' not in text:
    anchor = """const [faceMatchDistance, setFaceMatchDistance] =
    useState(null);
"""
    addition = anchor + """

const cacheLocalClockState = (value) => {
    try {
        window.localStorage.setItem(
            'mcms_last_clock_state_v1',
            JSON.stringify({
                clockedIn: Boolean(value),
                cachedAt: Date.now()
            })
        );
    } catch (_) {
        // Storage can be unavailable in restricted/private browser modes.
    }
};

const readLocalClockState = () => {
    try {
        const raw = window.localStorage.getItem(
            'mcms_last_clock_state_v1'
        );

        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return typeof parsed.clockedIn === 'boolean'
            ? parsed.clockedIn
            : null;
    } catch (_) {
        return null;
    }
};
"""
    text = replace_once(text, anchor, addition, 'offline duty-state helpers')

# Persist the authoritative server duty state whenever attendance history loads.
old_server_state = """if (
    myHours.length > 0 &&
    myHours[0].timeOut === \"noTimeYet\"
) {
    setClockedIn(true);

    if (props.setIsClockedIn) {
        props.setIsClockedIn(true);
    }

} else {
    setClockedIn(false);

    if (props.setIsClockedIn) {
        props.setIsClockedIn(false);
    }
}
"""
if 'cacheLocalClockState(true);' not in text:
    new_server_state = """if (
    myHours.length > 0 &&
    myHours[0].timeOut === \"noTimeYet\"
) {
    setClockedIn(true);
    cacheLocalClockState(true);

    if (props.setIsClockedIn) {
        props.setIsClockedIn(true);
    }

} else {
    setClockedIn(false);
    cacheLocalClockState(false);

    if (props.setIsClockedIn) {
        props.setIsClockedIn(false);
    }
}
"""
    text = replace_once(text, old_server_state, new_server_state, 'authoritative duty-state cache')

# Do not wipe an active duty state just because attendance history cannot be
# fetched while offline. Use the last server/queued state until sync resumes.
old_history_catch = """    } catch (err) {

        console.error(
            \"❌ Error loading attendance history:\",
            err.response?.data || err.message
        );

        resetData();
    }
};
"""
if 'Using cached duty state while attendance history is offline' not in text:
    new_history_catch = """    } catch (err) {

        console.error(
            \"❌ Error loading attendance history:\",
            err.response?.data || err.message
        );

        if (!err.response) {
            const cachedClockState =
                readLocalClockState();

            if (cachedClockState !== null) {
                setClockedIn(cachedClockState);

                if (props.setIsClockedIn) {
                    props.setIsClockedIn(cachedClockState);
                }

                console.log(
                    '📴 Using cached duty state while attendance history is offline.'
                );

                return;
            }
        }

        resetData();
    }
};
"""
    text = replace_once(text, old_history_catch, new_history_catch, 'offline history fallback')

# Cache every locally queued in/out transition.
offline_state_anchor = """        setClockedIn(
            nextClockedIn
        );

        if (props.setIsClockedIn) {
"""
if 'cacheLocalClockState(\n            nextClockedIn' not in text:
    offline_state_new = """        setClockedIn(
            nextClockedIn
        );
        cacheLocalClockState(
            nextClockedIn
        );

        if (props.setIsClockedIn) {
"""
    text = replace_once(text, offline_state_anchor, offline_state_new, 'offline queued duty-state cache')

# Cache online clock-in success.
online_in_anchor = """            setClockedIn(true);

            props.showAlert(
                \"Clocked In Successfully!\",
"""
if 'setClockedIn(true);\n            cacheLocalClockState(true);' not in text:
    online_in_new = """            setClockedIn(true);
            cacheLocalClockState(true);

            props.showAlert(
                \"Clocked In Successfully!\",
"""
    text = replace_once(text, online_in_anchor, online_in_new, 'online clock-in duty-state cache')

# Cache online clock-out success.
online_out_anchor = """            setClockedIn(false);

if (props.setIsClockedIn) {
"""
if 'setClockedIn(false);\n            cacheLocalClockState(false);\n\nif (props.setIsClockedIn)' not in text:
    online_out_new = """            setClockedIn(false);
            cacheLocalClockState(false);

if (props.setIsClockedIn) {
"""
    text = replace_once(text, online_out_anchor, online_out_new, 'online clock-out duty-state cache')

# Cache offline automatic geofence exit state.
auto_offline_anchor = """            setClockedIn(false);

            if (props.setIsClockedIn) {
                props.setIsClockedIn(false);
            }

            outsideGeofenceChecksRef.current = 0;
"""
# There can be another setClockedIn(false) elsewhere; this surrounding block is unique.
if 'Offline automatic geofence clock-out queued' in text and 'cacheLocalClockState(false);\n\n            if (props.setIsClockedIn)' not in text[:text.find('Offline automatic geofence clock-out queued')]:
    auto_offline_new = """            setClockedIn(false);
            cacheLocalClockState(false);

            if (props.setIsClockedIn) {
                props.setIsClockedIn(false);
            }

            outsideGeofenceChecksRef.current = 0;
"""
    text = replace_once(text, auto_offline_anchor, auto_offline_new, 'offline automatic exit duty-state cache')

# Make the cached geofence monitor enforce the same three-consecutive-check
# automatic clock-out policy while connectivity is unavailable.
old_cached_block = """                    if (cachedResult) {

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
"""
if 'Offline outside geofence check' not in text:
    new_cached_block = """                    if (cachedResult) {

                        setIsInZone(
                            cachedResult.inZone
                        );

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

                            if (
                                outsideGeofenceChecksRef.current >= 3
                            ) {
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
"""
    text = replace_once(text, old_cached_block, new_cached_block, 'offline geofence exit monitor')

# Always clear a stale match distance when face processing itself throws.
face_error_anchor = """        setIsScanning(false);
        setFaceVerified(false);
        setFaceStatus(
    err.message || \"Face verification failed\"
);
"""
if 'setFaceVerified(false);\n        setFaceMatchDistance(null);\n        setFaceStatus(' not in text:
    face_error_new = """        setIsScanning(false);
        setFaceVerified(false);
        setFaceMatchDistance(null);
        setFaceStatus(
    err.message || \"Face verification failed\"
);
"""
    text = replace_once(text, face_error_anchor, face_error_new, 'face error state cleanup')

required = [
    'cacheLocalClockState',
    'readLocalClockState',
    'Using cached duty state while attendance history is offline',
    'Offline outside geofence check'
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing post-polish marker: {marker}')

if text != original:
    path.write_text(text, encoding='utf-8')
    print('Applied offline continuity and geofence-exit polish.')
else:
    print('Offline continuity polish already applied.')
