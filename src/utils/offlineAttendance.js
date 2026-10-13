import axios from 'axios';

const QUEUE_KEY = 'mcms_offline_attendance_queue_v1';
const GEOFENCE_KEY = 'mcms_authorized_geofences_v1';
const TIME_KEY = 'mcms_trusted_time_v1';

const hasWindow = () => typeof window !== 'undefined';

const safeReadJson = (key, fallback) => {
  if (!hasWindow() || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

const safeWriteJson = (key, value) => {
  if (!hasWindow() || !window.localStorage) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Local storage can be unavailable in private/restricted browser modes.
  }
};

export const getOfflineAttendanceQueue = () => {
  const queue = safeReadJson(QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
};

export const getOfflineAttendanceQueueCount = () =>
  getOfflineAttendanceQueue().length;

export const createOfflineAttendanceEventId = (employeeId) => {
  const randomPart =
    hasWindow() && window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now()}`;

  return `mcms-${employeeId}-${randomPart}`;
};

export const queueOfflineAttendanceEvent = (event) => {
  const currentQueue = getOfflineAttendanceQueue();

  const alreadyQueued = currentQueue.some(
    (item) => item.client_event_id === event.client_event_id
  );

  if (!alreadyQueued) {
    currentQueue.push(event);
    safeWriteJson(QUEUE_KEY, currentQueue);
  }

  return currentQueue;
};

export const removeOfflineAttendanceEvents = (clientEventIds) => {
  const removeSet = new Set(clientEventIds || []);
  const remaining = getOfflineAttendanceQueue().filter(
    (event) => !removeSet.has(event.client_event_id)
  );

  safeWriteJson(QUEUE_KEY, remaining);
  return remaining;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const cacheAuthorizedGeofences = (locations) => {
  const cleanLocations = Array.isArray(locations)
    ? locations
        .map((location) => ({
          id: String(location.id || ''),
          name: String(location.name || 'Authorised workplace'),
          lat: Number(location.lat),
          lng: Number(location.lng),
          radiusMeters: Number(location.radiusMeters || 50)
        }))
        .filter(
          (location) =>
            Number.isFinite(location.lat) &&
            Number.isFinite(location.lng) &&
            Number.isFinite(location.radiusMeters)
        )
    : [];

  safeWriteJson(GEOFENCE_KEY, {
    cached_at: Date.now(),
    locations: cleanLocations
  });

  return cleanLocations;
};

export const getCachedAuthorizedGeofences = () => {
  const cached = safeReadJson(GEOFENCE_KEY, null);

  if (!cached || !Array.isArray(cached.locations)) {
    return [];
  }

  return cached.locations;
};

export const evaluateCachedGeofence = (
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

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const locations = getCachedAuthorizedGeofences();

  if (locations.length === 0) {
    return null;
  }

  const results = locations
    .map((location) => ({
      ...location,
      distance: distanceMeters(
        lat,
        lng,
        Number(location.lat),
        Number(location.lng)
      )
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = results[0];

  return {
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

export const cacheTrustedTimeSnapshot = (snapshot) => {
  const serverEpochMs = Number(snapshot?.server_epoch_ms);

  if (!Number.isFinite(serverEpochMs)) {
    return null;
  }

  const clientVerifiedAt = Date.now();
  const cached = {
    server_epoch_ms: serverEpochMs,
    client_verified_at_ms: clientVerifiedAt,
    client_to_server_offset_ms: serverEpochMs - clientVerifiedAt,
    server_time: snapshot?.server_time || null,
    ntp: snapshot?.ntp || null
  };

  safeWriteJson(TIME_KEY, cached);
  return cached;
};

export const getCachedTrustedTime = () =>
  safeReadJson(TIME_KEY, null);

export const getTrustedOfflineTimestamp = (baseDate = new Date()) => {
  const base = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const baseMs = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
  const cached = getCachedTrustedTime();

  if (!cached || !Number.isFinite(Number(cached.client_to_server_offset_ms))) {
    return {
      captured_at: new Date(baseMs).toISOString(),
      trusted_time_verified_at: null,
      trusted_time_age_ms: null,
      used_cached_server_offset: false
    };
  }

  const offset = Number(cached.client_to_server_offset_ms);
  const verifiedAt = Number(cached.client_verified_at_ms);
  const ageMs = Number.isFinite(verifiedAt)
    ? Math.max(Date.now() - verifiedAt, 0)
    : null;

  return {
    captured_at: new Date(baseMs + offset).toISOString(),
    trusted_time_verified_at: Number.isFinite(Number(cached.server_epoch_ms))
      ? new Date(Number(cached.server_epoch_ms)).toISOString()
      : null,
    trusted_time_age_ms: ageMs,
    used_cached_server_offset: true
  };
};

export const syncPendingOfflineAttendance = async (config) => {
  const queue = getOfflineAttendanceQueue();

  if (queue.length === 0) {
    return {
      attempted: 0,
      synced: 0,
      duplicates: 0,
      rejected: 0,
      errors: 0,
      results: [],
      remaining: []
    };
  }

  const response = await axios.post(
    '/api/attendance/sync-offline',
    { events: queue },
    config
  );

  const results = Array.isArray(response.data?.results)
    ? response.data.results
    : [];

  const finalStatuses = new Set(['Synced', 'Duplicate', 'Rejected']);
  const removableIds = results
    .filter((result) => finalStatuses.has(result.status))
    .map((result) => result.client_event_id)
    .filter(Boolean);

  const remaining = removeOfflineAttendanceEvents(removableIds);

  return {
    attempted: queue.length,
    synced: Number(response.data?.synced || 0),
    duplicates: Number(response.data?.duplicates || 0),
    rejected: Number(response.data?.rejected || 0),
    errors: Number(response.data?.errors || 0),
    results,
    remaining
  };
};

export const clearOfflineAttendanceStorageForTests = () => {
  if (!hasWindow() || !window.localStorage) return;
  window.localStorage.removeItem(QUEUE_KEY);
  window.localStorage.removeItem(GEOFENCE_KEY);
  window.localStorage.removeItem(TIME_KEY);
};
