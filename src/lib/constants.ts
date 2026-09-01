/**
 * Application-wide constants.
 * Single source of truth — avoids magic numbers scattered across pages.
 */

/** Default map centre (Bangalore HQ). Used when geolocation is denied or unavailable. */
export const DEFAULT_COORDS: [number, number] = [12.9716, 77.5946];

/** JWT cookie lifetime in seconds (1 day) */
export const JWT_COOKIE_MAX_AGE = 86_400;

/** SSE keepalive interval in ms */
export const SSE_PING_INTERVAL_MS = 25_000;

/** Fleet beacon broadcast interval in ms */
export const FLEET_BEACON_INTERVAL_MS = 10_000;

/** Fleet position TTL in ms — positions older than this are purged */
export const FLEET_STALE_MS = 60_000;
