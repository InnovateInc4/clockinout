import React, { useEffect, useState, useRef } from "react";
import * as faceapi from "@vladmandic/face-api";
import NumberToTime from "./NumberToTime";
import HourlyBarChart from "./HourlyBarChart";
import DateSelector from "./DateSelector";
import StartTimeMenu from "./StartTimeMenu";
import axios from "axios";
import TicketList from "./TicketList";
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

const ClockInOut = (props) => {
    const [loaded, setLoaded] = useState(false);
    const [timeClock, setTimeClock] = useState([]);
    const [clockedIn, setClockedIn] = useState(false);
    const [employeeProfile, setEmployeeProfile] = useState(null);
const [profileLoading, setProfileLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [filterVal, setFilterVal] = useState("");

    const [currentTime, setCurrentTime] = useState(new Date());

    const [locationStatus, setLocationStatus] = useState("Checking Location...");
    const [isInZone, setIsInZone] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [taskDescription, setTaskDescription] = useState("");

    // FaceScan & Automated Workflow States
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [faceStatus, setFaceStatus] = useState("Ready for face capture");
    const [faceVerified, setFaceVerified] = useState(false);
    const [activeEmployeeSection, setActiveEmployeeSection] =
    useState("attendance");
    const [leaveForm, setLeaveForm] = useState({
    type: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: ""
});

const [leaveSubmitting, setLeaveSubmitting] = useState(false);
const [
    employeeLeaveRequests,
    setEmployeeLeaveRequests
] = useState([]);

const [
    leaveHistoryLoading,
    setLeaveHistoryLoading
] = useState(false);

// ======================================================
// EMPLOYEE NOTIFICATIONS
// ======================================================

const [
    employeeNotifications,
    setEmployeeNotifications
] = useState([]);

const [
    notificationsLoading,
    setNotificationsLoading
] = useState(false);
const [
    leaveBalances,
    setLeaveBalances
] = useState([]);

const [
    leaveBalancesLoading,
    setLeaveBalancesLoading
] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState(null);

    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const faceModelsReadyRef = useRef(false);
    // ======================================================
// GEOFENCE EXIT MONITORING
// ======================================================

// Number of consecutive checks outside the authorised zone
const outsideGeofenceChecksRef =
    useRef(0);

// Prevent more than one automatic clock-out request
const autoClockOutRunningRef =
    useRef(false);


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
    useEffect(() => {

    const loadFaceModels = async () => {

        try {

            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models")
            ]);

            faceModelsReadyRef.current = true;

            console.log(
                "✅ Face recognition models loaded successfully."
            );

        } catch (err) {

            faceModelsReadyRef.current = false;

            console.error(
                "❌ Failed to load face recognition models:",
                err
            );
        }
    };

    loadFaceModels();

}, []);

// ======================================================
// SERVER-VERIFIED 50 METRE GEOFENCE
// ======================================================
// ======================================================
// AUTO CLOCK-OUT AFTER LEAVING GEOFENCE
// ======================================================

const autoClockOutAfterGeofenceExit =
    async (latitude, longitude, accuracy = userCoords?.accuracy || null) => {

        // Prevent duplicate requests
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
            cacheLocalClockState(false);

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

            const response =
                await axios.put(

                    "/api/attendance/auto-clock-out-geofence",

                    {
                        latitude,
                        longitude
                    },

                    props.config

                );


            if (response.data.success) {

                setClockedIn(false);

                outsideGeofenceChecksRef.current = 0;

                props.showAlert(
                    "You left the authorised work area. Your shift was automatically clocked out.",
                    "warning"
                );

                console.log(
                    "⚠️ Automatic geofence clock-out successful."
                );

            }

        } catch (error) {

            console.error(
                "❌ Automatic geofence clock-out failed:",
                error.response?.data ||
                error.message
            );

        } finally {

            autoClockOutRunningRef.current = false;

        }

    };
const refreshOfflineSecurityCaches = async () => {

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


const verifyLocation = () => {

    // --------------------------------------------------
    // CHECK BROWSER GPS SUPPORT
    // --------------------------------------------------

    if (!navigator.geolocation) {

        setIsInZone(false);

        setUserCoords(null);

        setLocationStatus(
            "GPS is not supported on this device ❌"
        );

        return;
    }


    setLocationStatus(
        "Checking location..."
    );


    // --------------------------------------------------
    // GET REAL DEVICE LOCATION
    // --------------------------------------------------

    navigator.geolocation.getCurrentPosition(

        async (position) => {

            const {
                latitude,
                longitude,
                accuracy
            } = position.coords;


            console.log(
                `📍 Current latitude: ${latitude}`
            );

            console.log(
                `📍 Current longitude: ${longitude}`
            );

            console.log(
                `📡 GPS accuracy: ${accuracy.toFixed(1)}m`
            );


            // Save REAL GPS coordinates
            setUserCoords({

                lat: latitude,

                lng: longitude,

                accuracy: accuracy

            });


            try {

                // ------------------------------------------
                // ASK BACKEND TO VERIFY LOCATION
                // ------------------------------------------

                const response =
                    await axios.post(

                        "/api/attendance/check-location",

                        {
                            latitude:
                                latitude,

                            longitude:
                                longitude
                        },

                        props.config

                    );


                const result =
                    response.data;


                // ------------------------------------------
                // INSIDE AUTHORISED ZONE
                // ------------------------------------------

                if (
    result.success &&
    result.inZone
) {

    // Employee is safely inside again,
    // so reset the outside-zone counter.
    outsideGeofenceChecksRef.current = 0;

    setIsInZone(true);

    setLocationStatus(

        `${result.locationName} ✅ ` +
        `(${result.distance}m)`

    );

}

                // ------------------------------------------
                // OUTSIDE AUTHORISED ZONE
                // ------------------------------------------

   else {

    setIsInZone(false);

    setLocationStatus(

        `Outside Allowed Zone ❌ ` +
        `(${result.distance}m from nearest location)`

    );


    // --------------------------------------------------
    // COUNT CONSECUTIVE OUTSIDE CHECKS
    // --------------------------------------------------

    if (clockedIn) {

        outsideGeofenceChecksRef.current += 1;


        console.log(
            `⚠️ Outside geofence check ` +
            `${outsideGeofenceChecksRef.current}/3`
        );


        // ----------------------------------------------
        // AUTO CLOCK-OUT AFTER 3 FAILED CHECKS
        // ----------------------------------------------

        if (
            outsideGeofenceChecksRef.current >= 3
        ) {

            console.log(
                "⚠️ Employee has remained outside " +
                "the authorised geofence."
            );


            await autoClockOutAfterGeofenceExit(
                latitude,
                longitude,
                accuracy
            );

        }

    } else {

        outsideGeofenceChecksRef.current = 0;

    }

}


            } catch (error) {

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

        },


        // --------------------------------------------------
        // GPS ERROR
        // --------------------------------------------------

        (error) => {

            console.error(
                "❌ GPS Error:",
                error.message
            );


            setIsInZone(false);

            setUserCoords(null);


            setLocationStatus(
                "Unable to verify location ❌"
            );

        },


        // --------------------------------------------------
        // HIGH ACCURACY GPS
        // --------------------------------------------------

      {
    enableHighAccuracy: true,

    timeout: 30000,

    maximumAge: 0
}

    );

};

    const selectedTicketRef = useRef("default");

    // ======================================================
// LOAD EMPLOYEE PERSONNEL FILE
// ======================================================

// ======================================================
// LOAD EMPLOYEE PERSONNEL FILE
// ======================================================

useEffect(() => {

    const userId =
        sessionStorage.getItem("userId");

    const token =
        sessionStorage.getItem("token");


    if (!userId || !token) {

        setProfileLoading(false);
        return;

    }


    axios.get(
        `/api/employees/${userId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

        .then((res) => {

            if (res.data.success) {

                setEmployeeProfile(
                    res.data.employee
                );

            }

        })

        .catch((err) => {

            console.error(
                "❌ Error loading employee PF:",
                err.response?.data ||
                err.message
            );

        })

        .finally(() => {

            setProfileLoading(false);

        });

}, []);
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

    const populateFields = async () => {
    const userId = sessionStorage.getItem("userId");

    if (!userId) {
        console.warn("⚠️ No userId found.");
        resetData();
        return;
    }

    try {
        const response = await axios.get(
            `/api/attendance/employee/${userId}`,
            props.config
        );

        if (!response.data.success) {
            resetData();
            return;
        }

        const attendanceRecords = response.data.attendance || [];

        const myHours = attendanceRecords.map((record) => ({
            id: record.id,
            employee: props.userEmail,

            timeIn: record.clock_in
                ? new Date(record.clock_in).getTime()
                : null,

            timeOut: record.clock_out
                ? new Date(record.clock_out).getTime()
                : "noTimeYet",

            coords: record.clock_in_latitude
                ? {
                    lat: Number(record.clock_in_latitude),
                    lng: Number(record.clock_in_longitude)
                }
                : null,

            total_hours: record.total_hours,
            location_status: record.location_status,
            sync_status: record.sync_status
        }));

        // Check whether the employee is currently clocked in
        if (
    myHours.length > 0 &&
    myHours[0].timeOut === "noTimeYet"
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

        setTimeClock(myHours);
        setEmployeeHours(myHours);

        getTotal(myHours);

        console.log(
            "✅ Attendance history loaded:",
            myHours
        );

    } catch (err) {

        console.error(
            "❌ Error loading attendance history:",
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

    const resetData = () => {
        setTimeClock([]);
        setTotalHours(0);
        setEmployeeHours([]);
        setClockedIn(false);
    };

    const loadEmployeeLeaveRequests = async () => {

    setLeaveHistoryLoading(true);

    try {

        const response = await axios.get(
            "/api/employee/leave-requests",
            props.config
        );

        if (response.data.success) {

            setEmployeeLeaveRequests(
                response.data.leaveRequests || []
            );

        } else {

            setEmployeeLeaveRequests([]);

        }

    } catch (err) {

        console.error(
            "❌ Error loading employee leave history:",
            err.response?.data || err.message
        );

        setEmployeeLeaveRequests([]);

    } finally {

        setLeaveHistoryLoading(false);

    }

};
// ======================================================
// LOAD EMPLOYEE NOTIFICATIONS
// ======================================================

const loadEmployeeNotifications = async () => {

    setNotificationsLoading(true);

    try {

        const response = await axios.get(
            "/api/employee/notifications",
            props.config
        );

        if (response.data.success) {

            setEmployeeNotifications(
                response.data.notifications || []
            );

        } else {

            setEmployeeNotifications([]);

        }

    } catch (err) {

        console.error(
            "❌ Error loading employee notifications:",
            err.response?.data || err.message
        );

        setEmployeeNotifications([]);

    } finally {

        setNotificationsLoading(false);

    }

};
// ======================================================
// MARK EMPLOYEE NOTIFICATIONS AS READ
// ======================================================

const markEmployeeNotificationRead = async (notificationId) => {
  try {
    await axios.put(
      `/api/employee/notifications/${notificationId}/read`,
      {},
      props.config
    );

    setEmployeeNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: 1 }
          : notification
      )
    );
  } catch (err) {
    console.error(
      '❌ Error marking notification as read:',
      err.response?.data || err.message
    );
  }
};

const markAllEmployeeNotificationsRead = async () => {
  try {
    await axios.put(
      '/api/employee/notifications/read-all',
      {},
      props.config
    );

    setEmployeeNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: 1
      }))
    );
  } catch (err) {
    console.error(
      '❌ Error marking notifications as read:',
      err.response?.data || err.message
    );
  }
};

// ======================================================
// LOAD EMPLOYEE LEAVE BALANCES
// ======================================================

const loadEmployeeLeaveBalances = async () => {

    setLeaveBalancesLoading(true);

    try {

        const response = await axios.get(
            "/api/leave/my-balances",
            props.config
        );


        if (response.data.success) {

            setLeaveBalances(
                response.data.balances || []
            );

        } else {

            setLeaveBalances([]);

        }

    } catch (err) {

        console.error(
            "❌ Error loading leave balances:",
            err.response?.data ||
            err.message
        );

        setLeaveBalances([]);

    } finally {

        setLeaveBalancesLoading(false);

    }

};
    const submitLeaveRequest = async (e) => {

    e.preventDefault();

    if (
        !leaveForm.type ||
        !leaveForm.startDate ||
        !leaveForm.endDate ||
        !leaveForm.reason.trim()
    ) {
        props.showAlert(
            "Please complete all leave application fields.",
            "warning"
        );

        return;
    }


    if (
        new Date(leaveForm.endDate) <
        new Date(leaveForm.startDate)
    ) {
        props.showAlert(
            "Leave end date cannot be before the start date.",
            "warning"
        );

        return;
    }


    setLeaveSubmitting(true);


    try {

        const response = await axios.post(
            "/api/tickets/submit-leave",
            {
                type: leaveForm.type,
                startDate: leaveForm.startDate,
                endDate: leaveForm.endDate,
                reason: leaveForm.reason
            },
            props.config
        );


        if (!response.data.success) {

            throw new Error(
                response.data.message ||
                "Leave application could not be submitted."
            );
        }


        props.showAlert(
            "Leave application submitted to management.",
            "success"
        );


        setLeaveForm({
            type: "Annual Leave",
            startDate: "",
            endDate: "",
            reason: ""
        });
        await loadEmployeeLeaveRequests();


    } catch (err) {

        console.error(
            "❌ Leave submission error:",
            err.response?.data || err.message
        );


        props.showAlert(
            err.response?.data?.message ||
            err.message ||
            "Unable to submit leave application.",
            "danger"
        );

    } finally {

        setLeaveSubmitting(false);

    }

};

    // Camera Handlers
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            props.showAlert("Camera access denied or unavailable", "danger");
        }
    };

    const stopWebcam = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    };

    const captureFrame = () => {
        if (!videoRef.current) return null;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.85);
    };

    const handleStartFaceScanFlow = () => {

    // Block attendance verification if employee is outside
    // the approved Sol Plaatje University Central Campus zone
    if (!isInZone) {

        props.showAlert(
            `Clocking blocked: ${locationStatus || "You are outside the permitted 50 metre work zone."}`,
            "danger"
        );

        return;
    }

    // Employee is inside the permitted geofence
    setFaceStatus("Ready for face capture");
    setScanProgress(0);
    setShowFaceModal(true);

    setTimeout(() => {
        startWebcam();
    }, 300);
};

    const handleScanAndProceed = async () => {

    // --------------------------------------------------
    // Make sure the AI models are ready
    // --------------------------------------------------
    if (!faceModelsReadyRef.current) {

        props.showAlert(
            "Face recognition is still loading. Please wait a moment and try again.",
            "warning"
        );

        return;
    }


    // --------------------------------------------------
    // Make sure employee has a registered face
    // --------------------------------------------------
    if (
        !employeeProfile ||
        !employeeProfile.faceReferenceImage
    ) {

        props.showAlert(
            "No registered face profile was found for this employee.",
            "danger"
        );

        return;
    }


    // --------------------------------------------------
    // Capture current camera frame
    // --------------------------------------------------
    const photoDataUrl = captureFrame();

    if (!photoDataUrl) {

        props.showAlert(
            "Could not capture your face. Please try again.",
            "danger"
        );

        return;
    }

    setCapturedPhoto(photoDataUrl);
    setIsScanning(true);
    setScanProgress(15);
    setFaceStatus("Capturing face...");


    try {

        // --------------------------------------------------
        // Helper: convert image source into an Image object
        // --------------------------------------------------
        const loadImage = (src) => {

            return new Promise((resolve, reject) => {

                const image = new Image();

                image.onload = () => resolve(image);

                image.onerror = () =>
                    reject(
                        new Error("Could not load face image.")
                    );

                image.src = src;
            });
        };


        // --------------------------------------------------
        // Prepare registered reference image
        // --------------------------------------------------
        let referenceSource =
            employeeProfile.faceReferenceImage;

        if (
            !referenceSource.startsWith("data:image") &&
            !referenceSource.startsWith("http://") &&
            !referenceSource.startsWith("https://") &&
            !referenceSource.startsWith("blob:")
        ) {

            referenceSource =
                `data:image/jpeg;base64,${referenceSource}`;
        }


        setScanProgress(30);


        // --------------------------------------------------
        // Load both images
        // --------------------------------------------------
        const referenceImage =
            await loadImage(referenceSource);

        const liveImage =
            await loadImage(photoDataUrl);


        setScanProgress(50);


        // --------------------------------------------------
        // Detect registered face
        // --------------------------------------------------
        const referenceDetection =
            await faceapi
                .detectSingleFace(referenceImage)
                .withFaceLandmarks()
                .withFaceDescriptor();


        if (!referenceDetection) {

            throw new Error(
                "No usable face was found in your registered face profile."
            );
        }


        setScanProgress(70);


        // --------------------------------------------------
        // Detect live camera face
        // --------------------------------------------------
        const liveDetection =
            await faceapi
                .detectSingleFace(liveImage)
                .withFaceLandmarks()
                .withFaceDescriptor();


        if (!liveDetection) {

            throw new Error(
                "No face was detected. Face the camera clearly and try again."
            );
        }


        setScanProgress(85);
        setFaceStatus("Comparing with registered profile...");


        // --------------------------------------------------
        // Compare the two faces
        // Lower distance = closer match
        // --------------------------------------------------
        const distance =
            faceapi.euclideanDistance(
                referenceDetection.descriptor,
                liveDetection.descriptor
            );

        console.log(
            "🧠 Face comparison distance:",
            distance
        );


        const MATCH_THRESHOLD = 0.60;

        const isMatch =
            distance <= MATCH_THRESHOLD;


        setScanProgress(100);


        // --------------------------------------------------
        // FACE DOES NOT MATCH
        // --------------------------------------------------
        if (!isMatch) {

            setIsScanning(false);
            setFaceVerified(false);
            setFaceMatchDistance(null);
            setFaceStatus("Face does not match registered profile");

            props.showAlert(
                "Face verification failed. Your face did not match the registered employee profile.",
                "danger"
            );

            console.warn(
                "❌ Face verification failed. Distance:",
                distance
            );

            return;
        }


        // --------------------------------------------------
        // FACE MATCHED
        // --------------------------------------------------
        console.log(
            "✅ Face verified. Distance:",
            distance
        );

        setFaceVerified(true);
        setFaceMatchDistance(
            distance
        );
        setFaceStatus("Identity verified");
        setIsScanning(false);

        stopWebcam();
        setShowFaceModal(false);

        props.showAlert(
            "Identity verified successfully.",
            "success"
        );


    } catch (err) {

        console.error(
            "❌ Face verification error:",
            err
        );

        setIsScanning(false);
        setFaceVerified(false);
        setFaceMatchDistance(null);
        setFaceStatus(
    err.message || "Face verification failed"
);
        setScanProgress(0);

        props.showAlert(
            err.message ||
            "Face verification could not be completed.",
            "danger"
        );
    }
};

    const handleFinalSubmit = async (usingCurrentTime) => {

    const employeeId = sessionStorage.getItem("userId");

    if (!employeeId) {
        props.showAlert("Employee session not found. Please log in again.", "danger");
        return;
    }

   

    const type = clockedIn ? "out" : "in";

    // --------------------------------------------------
    // Determine time
    // --------------------------------------------------

    let selectedTime = null;

    if (usingCurrentTime) {

        selectedTime = new Date();

    } else {

        try {

            const year = document.querySelector(
                "[name='Timeclock-select-year']"
            ).value;

            const month = document.querySelector(
                "[name='Timeclock-select-month']"
            ).value;

            const day = document.querySelector(
                "[name='Timeclock-select-day']"
            ).value;

            let hour = parseInt(
                document.querySelector("[name='startHour']").value
            );

            const minute = document.querySelector(
                "[name='startMinute']"
            ).value;

            const amPm = document.querySelector(
                "[name='startAmPm']"
            ).value;

            if (amPm === "PM" && hour !== 12) {
                hour += 12;
            }

            if (amPm === "AM" && hour === 12) {
                hour = 0;
            }

            const dateString =
                `${year}-${month}-${day}T${hour
                    .toString()
                    .padStart(2, "0")}:${minute}:00`;

            selectedTime = new Date(dateString);

            if (isNaN(selectedTime.getTime())) {
                throw new Error("Invalid Date");
            }

        } catch (err) {

            props.showAlert(
                "Please complete all date/time fields",
                "warning"
            );

            return;
        }
    }

    // --------------------------------------------------
    // Make sure GPS coordinates exist
    // --------------------------------------------------

    const latitude = userCoords?.lat || null;
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
        cacheLocalClockState(
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

        // ==================================================
        // CLOCK IN
        // ==================================================

        if (type === "in") {

            const response = await axios.post(
                "/api/attendance/clock-in",
                {
                    employee_id: employeeId,
                    latitude: latitude,
                    longitude: longitude,
                    location_status: locationStatus,
                    sync_status: "Online"
                },
                props.config
            );

            if (!response.data.success) {
                throw new Error(
                    response.data.message || "Clock-in failed."
                );
            }

            setClockedIn(true);
            cacheLocalClockState(true);

            props.showAlert(
                "Clocked In Successfully!",
                "success"
            );

        }

        // ==================================================
        // CLOCK OUT
        // ==================================================

        else {

            const response = await axios.put(
                "/api/attendance/clock-out",
                {
                    employee_id: employeeId,
                    latitude: latitude,
                    longitude: longitude,
                    location_status: locationStatus,
                    sync_status: "Online"
                },
                props.config
            );

            if (!response.data.success) {
                throw new Error(
                    response.data.message || "Clock-out failed."
                );
            }

            setClockedIn(false);
            cacheLocalClockState(false);

if (props.setIsClockedIn) {
    props.setIsClockedIn(false);
}

setTaskDescription("");

            props.showAlert(
                "Clock-Out Successful!",
                "success"
            );

        }

        // --------------------------------------------------
        // Reset verification
        // --------------------------------------------------

        setFaceVerified(false);
        setFaceMatchDistance(null);
        setCapturedPhoto(null);

        // --------------------------------------------------
        // Reload attendance records
        // --------------------------------------------------

        const attendanceResponse = await axios.get(
            `/api/attendance/employee/${employeeId}`,
            props.config
        );

        if (attendanceResponse.data.success) {

            const records = attendanceResponse.data.attendance || [];

            const formattedRecords = records.map((record) => ({

                employee: props.userEmail,

                timeIn: record.clock_in
                    ? new Date(record.clock_in).getTime()
                    : null,

                timeOut: record.clock_out
                    ? new Date(record.clock_out).getTime()
                    : "noTimeYet",

                coords: record.clock_in_latitude
                    ? {
                        lat: Number(record.clock_in_latitude),
                        lng: Number(record.clock_in_longitude)
                    }
                    : null,

                total_hours: record.total_hours,

                location_status: record.location_status,

                sync_status: record.sync_status

            }));

            setTimeClock(formattedRecords);
            setEmployeeHours(formattedRecords);
            getTotal(formattedRecords);
        }

    } catch (err) {

        console.error(
            "❌ Attendance error:",
            err.response?.data || err.message
        );

        const networkFailure = !err.response;

        props.showAlert(
            networkFailure
                ? "You appear to be offline. Attendance was NOT recorded. Reconnect and try again so the geofence and official system time can be verified."
                : err.response?.data?.message || err.message || "Attendance database error.",
            networkFailure ? "warning" : "danger"
        );

    }
};

    useEffect(() => {

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


    useEffect(() => {
    if (!loaded) {

        verifyLocation();

        // Always load attendance history and current duty state
        populateFields();

        // Load notifications once so the unread badge is accurate.
        loadEmployeeNotifications();

        if (props.getTickets) {
            props.getTickets(props.userEmail);
        }

        const savedTicket = sessionStorage.getItem("activeTicket");

        if (savedTicket) {
            setTimeout(() => {

                const el = document.querySelector(
                    `select[name='ticketList']`
                );

                if (el) {
                    el.value = savedTicket;
                }

            }, 500);
        }

        setLoaded(true);
    }
}, [loaded, props.userEmail, props.getTickets]);

// ======================================================
// MONITOR GEOFENCE WHILE EMPLOYEE IS CLOCKED IN
// ======================================================

useEffect(() => {

    // If employee is not clocked in,
    // no location monitoring is needed.
    if (!clockedIn) {

        outsideGeofenceChecksRef.current = 0;
        autoClockOutRunningRef.current = false;

        return;
    }


    console.log(
        "📍 Geofence monitoring started."
    );


    // Check immediately
    verifyLocation();


    // Then check every 60 seconds
    const geofenceMonitor =
        setInterval(() => {

            console.log(
                "📍 Running automatic geofence check..."
            );

            verifyLocation();

        }, 60 * 1000);


    // Stop monitoring when employee clocks out
    // or leaves this page.
    return () => {

        clearInterval(
            geofenceMonitor
        );

        console.log(
            "📍 Geofence monitoring stopped."
        );

    };

// We intentionally only restart monitoring
// when clockedIn changes.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [clockedIn]);

    return (
        <div style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
            padding: '40px 20px',
            fontFamily: 'Arial, Helvetica, sans-serif'
        }}>
            <style>{`
                /* Modern Select & Input Override Fixes */
                .glass-card select, .glass-card input[type="text"], .glass-card textarea {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    padding: 12px 16px !important;
                    font-size: 0.92rem !important;
                    color: #0f172a !important;
                    font-weight: 600 !important;
                    outline: none !important;
                    transition: all 0.2s ease-in-out !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;
                }
                .glass-card select:focus, .glass-card input[type="text"]:focus, .glass-card textarea:focus {
                    border-color: #ea580c !important;
                    box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.12) !important;
                }
                .glass-btn-primary {
                    background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%) !important;
                    color: #ffffff !important;
                    border: none !important;
                    border-radius: 14px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.5px !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 8px 20px rgba(234, 88, 12, 0.25) !important;
                }
                .glass-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(234, 88, 12, 0.35) !important;
                }
                .glass-btn-dark {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
                    color: #ffffff !important;
                    border: none !important;
                    border-radius: 14px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.5px !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2) !important;
                }
                .glass-btn-dark:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3) !important;
                }
            `}</style>

            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,237,213,0.75) 100%)',
                zIndex: 0
            }} />

            {/* FACE SCAN MODAL */}
            {showFaceModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '28px',
                        padding: '36px',
                        width: '100%',
                        maxWidth: '460px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                            Identity Verification
                        </h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Look directly at the camera. Your live face will be captured and checked against your registered employee face profile.
                        </p>

                        <div
    style={{
        margin: '0 auto 18px auto',
        padding: '10px 14px',
        borderRadius: '12px',
        background: employeeProfile?.faceReferenceImage
            ? '#eff6ff'
            : '#fef2f2',
        border: employeeProfile?.faceReferenceImage
            ? '1px solid #bfdbfe'
            : '1px solid #fecaca',
        color: employeeProfile?.faceReferenceImage
            ? '#1d4ed8'
            : '#b91c1c',
        fontWeight: '800',
        fontSize: '0.82rem'
    }}
>
    {employeeProfile?.faceReferenceImage
        ? '✓ Registered face profile found'
        : '✕ No registered face profile found'}
</div>

                        <div style={{
                            position: 'relative', width: '260px', height: '260px', margin: '0 auto 24px auto',
                            borderRadius: '50%', overflow: 'hidden', border: '4px solid #ea580c',
                            boxShadow: '0 0 24px rgba(234, 88, 12, 0.25)'
                        }}>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            {isScanning && (
                                <div style={{
                                    position: 'absolute', top: `${scanProgress}%`, left: 0, right: 0, height: '4px',
                                    backgroundColor: '#10b981', boxShadow: '0 0 12px #10b981', transition: 'top 0.2s linear'
                                }} />
                            )}
                        </div>

                        <div
    style={{
        padding: '12px 16px',
        backgroundColor: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '12px',
        fontWeight: '800',
        color: '#c2410c',
        fontSize: '0.9rem'
    }}
>
    {faceStatus} ({scanProgress}%)
</div>
                    
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                        stopWebcam();
                                        setShowFaceModal(false);
                                    }}
                                    style={{
                                        padding: '14px 24px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff', fontWeight: '700', cursor: 'pointer', color: '#475569'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleScanAndProceed}
                                    className="glass-btn-primary"
                                    style={{ padding: '14px 28px', cursor: 'pointer' }}
                                >
                                    📸 Scan & Proceed
                                </button>
                            </div>
                    </div>
                </div>
            )}

          <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1 }}>


    {/* ======================================================
        EMPLOYEE PERSONNEL FILE
    ====================================================== */}

    <div
        className="glass-card"
        style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '28px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
        }}
    >

        {profileLoading ? (

            <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#64748b',
                fontWeight: '700'
            }}>
                Loading Personnel File...
            </div>

        ) : employeeProfile ? (

            <>
                {/* PF HEADER */}

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '22px'
                }}>

                    {employeeProfile.profile_photo ? (

                        <img
                            src={employeeProfile.profile_photo}
                            alt="Employee Profile"
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #ea580c'
                            }}
                        />

                    ) : (

                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            border: '3px solid #ea580c'
                        }}>
                            👤
                        </div>

                    )}

                    <div>
                        <div style={{
                            color: '#ea580c',
                            fontSize: '0.75rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '4px'
                        }}>
                            Employee Personnel File
                        </div>

                        <h2 style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: '1.45rem',
                            fontWeight: '900'
                        }}>
                            {employeeProfile.name} {employeeProfile.surname}
                        </h2>

                        <div style={{
                            marginTop: '5px',
                            color: '#64748b',
                            fontSize: '0.88rem',
                            fontWeight: '600'
                        }}>
                            Employee ID: {employeeProfile.id}
                        </div>
                    </div>

                </div>

                {/* PF INFORMATION */}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px'
                }}>

                    {/* ID NUMBER */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            ID Number
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800'
                        }}>
                            {employeeProfile.idNumber || 'Not provided'}
                        </div>
                    </div>

                    {/* EMAIL */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Email
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800',
                            wordBreak: 'break-word'
                        }}>
                            {employeeProfile.email || 'Not provided'}
                        </div>
                    </div>

                    {/* PHONE */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Phone
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800'
                        }}>
                            {employeeProfile.phone || 'Not provided'}
                        </div>
                    </div>

                    {/* DEPARTMENT */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Department
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800'
                        }}>
                            {employeeProfile.department_name ||
                             employeeProfile.department ||
                             'Not assigned'}
                        </div>
                    </div>

                    {/* POSITION */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Position
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800'
                        }}>
                            {employeeProfile.position_title ||
                             employeeProfile.position ||
                             'Not assigned'}
                        </div>
                    </div>

                    {/* ROLE */}

                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            System Role
                        </div>

                        <div style={{
                            color: '#0f172a',
                            fontWeight: '800',
                            textTransform: 'capitalize'
                        }}>
                            {employeeProfile.role || 'Employee'}
                        </div>
                    </div>

                    {/* EMPLOYMENT STATUS */}

                    <div style={{
                        background: '#f0fdf4',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#16a34a',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Employment Status
                        </div>

                        <div style={{
                            color: '#166534',
                            fontWeight: '800'
                        }}>
                            🟢 {employeeProfile.employment_status || 'Active'}
                        </div>
                    </div>

                    {/* ACCOUNT STATUS */}

                    <div style={{
                        background: '#f0fdf4',
                        borderRadius: '14px',
                        padding: '16px'
                    }}>
                        <div style={{
                            color: '#16a34a',
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            marginBottom: '5px'
                        }}>
                            Account Status
                        </div>

                        <div style={{
                            color: '#166534',
                            fontWeight: '800'
                        }}>
                            🟢 {employeeProfile.account_status || 'Active'}
                        </div>
                    </div>

                </div>

            </>

        ) : (

            <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#dc2626',
                fontWeight: '700'
            }}>
                Unable to load your Personnel File.
            </div>

        )}

    </div>

    {/* ======================================================
    EMPLOYEE WORKSPACE NAVIGATION
====================================================== */}

<div
    style={{
        display: 'flex',
        gap: '10px',
        padding: '8px',
        backgroundColor: 'rgba(255,255,255,0.88)',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        marginBottom: '24px',
        boxShadow: '0 6px 20px rgba(15,23,42,0.05)',
        flexWrap: 'wrap'
    }}
>
    <button
        type="button"
        onClick={() =>
            setActiveEmployeeSection("attendance")
        }
        style={{
            flex: 1,
            minWidth: '160px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '900',
            fontSize: '0.9rem',
            backgroundColor:
                activeEmployeeSection === "attendance"
                    ? '#0f172a'
                    : 'transparent',
            color:
                activeEmployeeSection === "attendance"
                    ? '#ffffff'
                    : '#475569'
        }}
    >
        ⏱ Attendance
    </button>

    <button
        type="button"
       onClick={() => {
    setActiveEmployeeSection("leave");
    loadEmployeeLeaveRequests();
    loadEmployeeLeaveBalances();
}}
        style={{
            flex: 1,
            minWidth: '160px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '900',
            fontSize: '0.9rem',
            backgroundColor:
                activeEmployeeSection === "leave"
                    ? '#ea580c'
                    : 'transparent',
            color:
                activeEmployeeSection === "leave"
                    ? '#ffffff'
                    : '#475569'
        }}
    >
        🗓 Apply for Leave
    </button>
    
        <button
        type="button"
        onClick={() => {
            setActiveEmployeeSection("notifications");
            loadEmployeeNotifications();
        }}
        style={{
            flex: 1,
            minWidth: '160px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '900',
            fontSize: '0.9rem',
            backgroundColor:
                activeEmployeeSection === "notifications"
                    ? '#047857'
                    : 'transparent',
            color:
                activeEmployeeSection === "notifications"
                    ? '#ffffff'
                    : '#475569'
        }}
    >
        🔔 Notifications
        {employeeNotifications.filter(
            (notification) =>
                Number(notification.is_read) === 0
        ).length > 0 && (
            <span
                style={{
                    marginLeft: '7px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '2px 7px',
                    fontSize: '0.7rem'
                }}
            >
                {
                    employeeNotifications.filter(
                        (notification) =>
                            Number(notification.is_read) === 0
                    ).length
                }
            </span>
        )}
    </button>

    <button
        type="button"
        onClick={() =>
            setActiveEmployeeSection("history")
        }
        style={{
            flex: 1,
            minWidth: '160px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '900',
            fontSize: '0.9rem',
            backgroundColor:
                activeEmployeeSection === "history"
                    ? '#0f172a'
                    : 'transparent',
            color:
                activeEmployeeSection === "history"
                    ? '#ffffff'
                    : '#475569'
        }}
    >
        📋 Work History
    </button>
</div>


{activeEmployeeSection === "leave" && (

    <div
        className="glass-card"
        style={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(15,23,42,0.06)'
        }}
    >

        <div style={{ marginBottom: '26px' }}>

            <div
                style={{
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    color: '#ea580c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.7px',
                    marginBottom: '6px'
                }}
            >
                Employee Leave
            </div>

            <h2
                style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: '1.6rem',
                    fontWeight: '900'
                }}
            >
                Apply for Leave
            </h2>

            <p
                style={{
                    color: '#64748b',
                    marginTop: '8px',
                    marginBottom: 0
                }}
            >
                Complete the form below. Your application will be sent to management for review.
            </p>

        </div>

        {/* ======================================================
    EMPLOYEE LEAVE BALANCES
====================================================== */}

<div
    style={{
        marginBottom: '28px'
    }}
>

    <div
        style={{
            fontSize: '0.75rem',
            fontWeight: '900',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.7px',
            marginBottom: '12px'
        }}
    >
        My Leave Balances
    </div>


    {leaveBalancesLoading ? (

        <div
            style={{
                padding: '18px',
                background: '#f8fafc',
                borderRadius: '14px',
                color: '#64748b',
                fontWeight: '700'
            }}
        >
            Loading leave balances...
        </div>

    ) : leaveBalances.length > 0 ? (

        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px'
            }}
        >

            {leaveBalances.map(
                (balance) => (

                    <div
                        key={balance.id}
                        style={{
                            padding: '18px',
                            borderRadius: '16px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0'
                        }}
                    >

                        <div
                            style={{
                                color: '#0f172a',
                                fontWeight: '900',
                                marginBottom: '14px'
                            }}
                        >
                            {balance.leave_type}
                        </div>


                        <div
                            style={{
                                fontSize: '2rem',
                                fontWeight: '900',
                                color: '#ea580c'
                            }}
                        >
                            {Number(
                                balance.remaining_days || 0
                            ).toFixed(0)}
                        </div>


                        <div
                            style={{
                                color: '#64748b',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                marginBottom: '14px'
                            }}
                        >
                            days remaining
                        </div>


                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '10px',
                                fontSize: '0.78rem',
                                color: '#475569'
                            }}
                        >

                            <span>
                                Allocated:{' '}
                                <strong>
                                    {Number(
                                        balance.allocated_days || 0
                                    ).toFixed(0)}
                                </strong>
                            </span>

                            <span>
                                Used:{' '}
                                <strong>
                                    {Number(
                                        balance.used_days || 0
                                    ).toFixed(0)}
                                </strong>
                            </span>

                        </div>

                    </div>

                )
            )}

        </div>

    ) : (

        <div
            style={{
                padding: '18px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '14px',
                color: '#c2410c',
                fontWeight: '700'
            }}
        >
            No leave balance information is available.
        </div>

    )}

</div>



        <form onSubmit={submitLeaveRequest}>

            <div style={{ marginBottom: '20px' }}>

                <label
                    style={{
                        display: 'block',
                        fontWeight: '800',
                        color: '#334155',
                        marginBottom: '8px'
                    }}
                >
                    Leave Type
                </label>

                <select
                    value={leaveForm.type}
                    onChange={(e) =>
                        setLeaveForm({
                            ...leaveForm,
                            type: e.target.value
                        })
                    }
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff'
                    }}
                >
                    <option value="Annual Leave">
                        Annual Leave
                    </option>

                    <option value="Sick Leave">
                        Sick Leave
                    </option>

                    <option value="Family Responsibility Leave">
                        Family Responsibility Leave
                    </option>

                    
                </select>

            </div>


            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '18px',
                    marginBottom: '20px'
                }}
            >

                <div>

                    <label
                        style={{
                            display: 'block',
                            fontWeight: '800',
                            color: '#334155',
                            marginBottom: '8px'
                        }}
                    >
                        Start Date
                    </label>

                    <input
                        type="date"
                        value={leaveForm.startDate}
                        onChange={(e) =>
                            setLeaveForm({
                                ...leaveForm,
                                startDate: e.target.value
                            })
                        }
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box'
                        }}
                    />

                </div>


                <div>

                    <label
                        style={{
                            display: 'block',
                            fontWeight: '800',
                            color: '#334155',
                            marginBottom: '8px'
                        }}
                    >
                        End Date
                    </label>

                    <input
                        type="date"
                        value={leaveForm.endDate}
                        onChange={(e) =>
                            setLeaveForm({
                                ...leaveForm,
                                endDate: e.target.value
                            })
                        }
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box'
                        }}
                    />

                </div>

            </div>


            <div style={{ marginBottom: '24px' }}>

                <label
                    style={{
                        display: 'block',
                        fontWeight: '800',
                        color: '#334155',
                        marginBottom: '8px'
                    }}
                >
                    Reason for Leave
                </label>

                <textarea
                    value={leaveForm.reason}
                    onChange={(e) =>
                        setLeaveForm({
                            ...leaveForm,
                            reason: e.target.value
                        })
                    }
                    placeholder="Briefly explain the reason for your leave request..."
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                    }}
                />

            </div>


            <button
                type="submit"
                disabled={leaveSubmitting}
                className="glass-btn-primary"
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    fontSize: '0.95rem',
                    fontWeight: '900',
                    cursor: leaveSubmitting
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: leaveSubmitting
                        ? 0.6
                        : 1
                }}
            >
                {leaveSubmitting
                    ? 'SUBMITTING...'
                    : 'SUBMIT LEAVE APPLICATION'}
            </button>

        </form>
        {/* ======================================================
    EMPLOYEE LEAVE HISTORY
====================================================== */}

<div
    style={{
        marginTop: "32px",
        paddingTop: "28px",
        borderTop: "1px solid #e2e8f0"
    }}
>
    <div
        style={{
            marginBottom: "18px"
        }}
    >
        <div
            style={{
                fontSize: "0.72rem",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                marginBottom: "5px"
            }}
        >
            Leave Records
        </div>

        <h3
            style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "1.2rem"
            }}
        >
            My Leave Applications
        </h3>
    </div>


    {leaveHistoryLoading ? (

        <div
            style={{
                padding: "20px",
                color: "#64748b"
            }}
        >
            Loading leave applications...
        </div>

    ) : employeeLeaveRequests.length === 0 ? (

        <div
            style={{
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "14px",
                color: "#64748b",
                border: "1px solid #e2e8f0"
            }}
        >
            No leave applications found.
        </div>

    ) : (

        employeeLeaveRequests.map((request) => {

            const status =
                request.status || "Pending";

            const normalizedStatus =
                status.toLowerCase();

            let statusBackground =
                "#fff7ed";

            let statusColor =
                "#c2410c";


            if (normalizedStatus === "approved") {

                statusBackground =
                    "#dcfce7";

                statusColor =
                    "#15803d";

            }


            if (
                normalizedStatus === "rejected" ||
                normalizedStatus === "denied"
            ) {

                statusBackground =
                    "#fee2e2";

                statusColor =
                    "#b91c1c";

            }


            return (

                <div
                    key={request.id}
                    style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "18px",
                        marginBottom: "12px"
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "15px"
                        }}
                    >

                        <div>

                            <div
                                style={{
                                    fontWeight: "700",
                                    color: "#0f172a",
                                    fontSize: "1rem"
                                }}
                            >
                                {request.type}
                            </div>

                            <div
                                style={{
                                    marginTop: "6px",
                                    color: "#64748b",
                                    fontSize: "0.86rem"
                                }}
                            >
                                {new Date(
                                    request.start_date
                                ).toLocaleDateString()}
                                {" → "}
                                {new Date(
                                    request.end_date
                                ).toLocaleDateString()}
                            </div>

                        </div>


                        <span
                            style={{
                                backgroundColor:
                                    statusBackground,

                                color:
                                    statusColor,

                                padding:
                                    "6px 12px",

                                borderRadius:
                                    "999px",

                                fontSize:
                                    "0.78rem",

                                fontWeight:
                                    "700"
                            }}
                        >
                            {status}
                        </span>

                    </div>


                    <div
                        style={{
                            marginTop: "14px",
                            color: "#475569",
                            fontSize: "0.9rem"
                        }}
                    >
                        <strong>Reason:</strong>{" "}
                        {request.reason}
                    </div>


                    <div
                        style={{
                            marginTop: "10px",
                            color: "#94a3b8",
                            fontSize: "0.76rem"
                        }}
                    >
                        Submitted{" "}
                        {request.created_at
                            ? new Date(
                                request.created_at
                              ).toLocaleDateString()
                            : ""}
                    </div>

                </div>

            );

        })

    )}

</div>

    </div>

)}

{/* ======================================================
    EMPLOYEE NOTIFICATIONS WORKSPACE
====================================================== */}

{activeEmployeeSection === "notifications" && (
  <div
    className="glass-card"
    style={{
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: '32px',
      marginBottom: '24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 30px rgba(15,23,42,0.06)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>
          Employee Alerts
        </div>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.6rem' }}>
          🔔 My Notifications
        </h2>
      </div>

      {employeeNotifications.some((notification) => Number(notification.is_read) === 0) && (
        <button
          type="button"
          onClick={markAllEmployeeNotificationsRead}
          style={{ padding: '10px 15px', borderRadius: '11px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: '900', cursor: 'pointer' }}
        >
          Mark all as read
        </button>
      )}
    </div>

    {notificationsLoading ? (
      <div style={{ padding: '20px', color: '#64748b' }}>Loading notifications...</div>
    ) : employeeNotifications.length === 0 ? (
      <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '14px', color: '#64748b', border: '1px solid #e2e8f0' }}>
        You have no notifications.
      </div>
    ) : (
      employeeNotifications.map((notification) => (
        <div
          key={notification.id}
          style={{
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '16px',
            backgroundColor: Number(notification.is_read) === 0 ? '#ecfdf5' : '#ffffff',
            border: Number(notification.is_read) === 0 ? '1px solid #6ee7b7' : '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>{notification.title}</div>
              <div style={{ marginTop: '8px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>{notification.message}</div>
            </div>
            {Number(notification.is_read) === 0 && (
              <span style={{ backgroundColor: '#047857', color: '#ffffff', padding: '5px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '900' }}>NEW</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
            </div>
            {Number(notification.is_read) === 0 && (
              <button
                type="button"
                onClick={() => markEmployeeNotificationRead(notification.id)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #a7f3d0', background: '#ffffff', color: '#047857', fontWeight: '900', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </div>
)}

    {/* ======================================================
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

    {/* GPS VERIFICATION BAR */}
                
                {/* GPS VERIFICATION BAR */}
                <div style={{
                    background: isInZone ? 'rgba(240, 253, 244, 0.9)' : 'rgba(254, 242, 242, 0.9)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isInZone ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '16px',
                    padding: '14px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📍</span>
                        <span style={{ fontWeight: '800', fontSize: '0.92rem', color: isInZone ? '#166534' : '#991b1b' }}>
                            {locationStatus}
                        </span>
                    </div>
                    
                    <button onClick={verifyLocation} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>
                        🔄 Refresh GPS
                    </button>
                </div>

                {!faceVerified ? (
                    <div
    className="glass-card"
    style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px)',
        borderRadius: '28px',
        padding: '34px',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
        marginBottom: '32px'
    }}
>

    {/* TOP STATUS */}
    <div
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
            paddingBottom: '24px',
            borderBottom: '1px solid #e2e8f0'
        }}
    >

        <div>

            <div
                style={{
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    letterSpacing: '1.2px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}
            >
                Current Shift Status
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >

                <span
                    style={{
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        backgroundColor:
                            clockedIn
                                ? '#10b981'
                                : '#94a3b8',
                        boxShadow:
                            clockedIn
                                ? '0 0 10px rgba(16,185,129,0.45)'
                                : 'none'
                    }}
                />

                <h2
                    style={{
                        margin: 0,
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: '#0f172a'
                    }}
                >
                    {clockedIn ? 'ON DUTY' : 'OFF DUTY'}
                </h2>

            </div>

            <div
                style={{
                    marginTop: '8px',
                    color: '#64748b',
                    fontSize: '0.92rem'
                }}
            >
                {clockedIn
                    ? 'Your shift is currently active.'
                    : 'You are ready to begin your shift.'}
            </div>

        </div>


        <div
            style={{
                textAlign: 'right'
            }}
        >

            <div
                style={{
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                }}
            >
                Current Time
            </div>

            <div
                style={{
                    marginTop: '4px',
                    fontSize: '1.2rem',
                    fontWeight: '900',
                    color: '#0f172a'
                }}
            >
                {currentTime.toLocaleTimeString()}
            </div>

            <div
                style={{
                    marginTop: '2px',
                    color: '#64748b',
                    fontSize: '0.8rem'
                }}
            >
                {currentTime.toLocaleDateString()}
            </div>

        </div>

    </div>


    {/* VERIFICATION STATUS */}
    <div
        style={{
            display: 'grid',
            gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginTop: '24px',
            marginBottom: '26px'
        }}
    >

        <div
            style={{
                padding: '16px',
                borderRadius: '16px',
                background: isInZone
                    ? '#f0fdf4'
                    : '#fff7ed',
                border: isInZone
                    ? '1px solid #bbf7d0'
                    : '1px solid #fed7aa'
            }}
        >

            <div
                style={{
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    color: '#64748b',
                    textTransform: 'uppercase'
                }}
            >
                Location
            </div>

            <div
                style={{
                    marginTop: '6px',
                    fontWeight: '800',
                    color: isInZone
                        ? '#15803d'
                        : '#c2410c'
                }}
            >
                {isInZone
                    ? '✓ Workplace verified'
                    : 'Location not verified'}
            </div>

        </div>


        <div
            style={{
                padding: '16px',
                borderRadius: '16px',
                background:
                    employeeProfile?.faceReferenceImage
                        ? '#eff6ff'
                        : '#f8fafc',
                border:
                    employeeProfile?.faceReferenceImage
                        ? '1px solid #bfdbfe'
                        : '1px solid #e2e8f0'
            }}
        >

            <div
                style={{
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    color: '#64748b',
                    textTransform: 'uppercase'
                }}
            >
                Face Profile
            </div>

            <div
                style={{
                    marginTop: '6px',
                    fontWeight: '800',
                    color:
                        employeeProfile?.faceReferenceImage
                            ? '#1d4ed8'
                            : '#64748b'
                }}
            >
                {employeeProfile?.faceReferenceImage
                    ? '✓ Registered'
                    : 'No face profile registered'}
            </div>

        </div>

    </div>


    {/* MAIN ACTION */}
    <button
        onClick={handleStartFaceScanFlow}
        className="glass-btn-primary"
        style={{
            width: '100%',
            padding: '18px 28px',
            fontSize: '1rem',
            cursor: 'pointer',
            letterSpacing: '0.6px'
        }}
    >
        {clockedIn
            ? 'CLOCK OUT'
            : 'CLOCK IN'}
    </button>

    <div
        style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.78rem',
            marginTop: '12px'
        }}
    >
        Identity verification will be required before attendance is recorded.
    </div>

</div>
                ) : (
                    /* REFINED TASK & TIME CONSOLE CARD */
                    <div className="glass-card" style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        padding: '36px',
                        border: '1px solid rgba(255, 255, 255, 1)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05)',
                        marginBottom: '32px'
                    }}>
                        {/* CARD HEADER */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {capturedPhoto && (
                                    <img src={capturedPhoto} alt="Verification" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #10b981', objectFit: 'cover' }} />
                                )}
                                <div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} /> Verified Identity
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                                        {clockedIn ? 'Confirm Clock Out' : 'Confirm Clock In'}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        

                        
                {/* FINAL ATTENDANCE CONFIRMATION */}
<div
    style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '20px',
        marginBottom: '20px'
    }}
>
    <div
        style={{
            fontSize: '0.72rem',
            fontWeight: '900',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: '8px'
        }}
    >
        Attendance Confirmation
    </div>

    <div
        style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: '#0f172a'
        }}
    >
        {clockedIn
            ? 'You are about to end your current shift.'
            : 'You are about to begin your shift.'}
    </div>

    <div
        style={{
            marginTop: '6px',
            color: '#64748b',
            fontSize: '0.85rem'
        }}
    >
        The official attendance time will be recorded by the system.
    </div>
</div>

<button
    onClick={() => handleFinalSubmit(true)}
    className="glass-btn-primary"
    style={{
        width: '100%',
        padding: '18px 24px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '900'
    }}
>
    {clockedIn
        ? 'CONFIRM CLOCK OUT'
        : 'CONFIRM CLOCK IN'}
</button>

</div>
)}

{activeEmployeeSection === "history" && (
    <>
    
{/* SHIFT LOG HISTORY */}
                <div className="glass-card" style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Shift Log History</h3>
                        <input type="text" placeholder="Filter shifts..." onChange={filterHours} style={{ width: '200px' }} />
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {timeClock.length === 0 ? (
                            <li style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No recorded shifts found for this log.</li>
                        ) : (
                            timeClock.map((tc, i) => (
                                <li key={i} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '16px 20px', marginBottom: '10px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            {(tc.photoIn || tc.photoOut) && (
                                                <img src={tc.photoIn || tc.photoOut} alt="Snapshot" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ea580c' }} />
                                            )}
                                            <div>
                                                <span style={{ fontWeight: '800', color: '#0f172a' }}>{NumberToTime(tc.timeIn)}</span>
                                                {tc.timeOut !== "noTimeYet" ? (
                                                    <span style={{ color: '#475569', fontWeight: '700' }}> — {NumberToTime(tc.timeOut)}</span>
                                                ) : (
                                                    <span style={{ color: '#16a34a', fontWeight: '800', marginLeft: '8px' }}> — (Active Shift)</span>
                                                )}
                                                {tc.task && <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}><strong>Task:</strong> {tc.task}</p>}
                                            </div>
                                        </div>
                                        {tc.timeOut !== "noTimeYet" && (
                                            <span style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>
                                                {((tc.timeOut - tc.timeIn) / 3600000).toFixed(2)} hrs
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                
                
                    </>
)}

            </div>
            
        </div>
        
    );
};

export default ClockInOut;