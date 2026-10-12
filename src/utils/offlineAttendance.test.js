import {
  cacheAuthorizedGeofences,
  clearOfflineAttendanceStorageForTests,
  createOfflineAttendanceEventId,
  evaluateCachedGeofence,
  getOfflineAttendanceQueueCount,
  queueOfflineAttendanceEvent
} from './offlineAttendance';

beforeEach(() => {
  clearOfflineAttendanceStorageForTests();
});

test('caches and evaluates an authorised geofence locally', () => {
  cacheAuthorizedGeofences([
    {
      id: 'test-zone',
      name: 'Test Zone',
      lat: -28.74835,
      lng: 24.7638,
      radiusMeters: 50
    }
  ]);

  const result = evaluateCachedGeofence(-28.74835, 24.7638);

  expect(result).not.toBeNull();
  expect(result.inZone).toBe(true);
  expect(result.locationId).toBe('test-zone');
});

test('queues offline attendance events without duplicating an event id', () => {
  const clientEventId = createOfflineAttendanceEventId(23);
  const event = {
    client_event_id: clientEventId,
    event_type: 'clock_in',
    captured_at: new Date().toISOString(),
    latitude: -28.74835,
    longitude: 24.7638
  };

  queueOfflineAttendanceEvent(event);
  queueOfflineAttendanceEvent(event);

  expect(getOfflineAttendanceQueueCount()).toBe(1);
});
