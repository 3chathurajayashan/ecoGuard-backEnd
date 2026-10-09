const EARTH_RADIUS_METRES = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle (haversine) distance in metres between two { latitude, longitude } points. */
export function distanceMetres(a, b) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(h));
}

/** Length in kilometres of a path through the given points, in order. */
export function pathDistanceKm(points) {
  let metres = 0;
  for (let i = 1; i < points.length; i++) metres += distanceMetres(points[i - 1], points[i]);
  return metres / 1000;
}

export const isValidLatitude = (v) => Number.isFinite(v) && v >= -90 && v <= 90;
export const isValidLongitude = (v) => Number.isFinite(v) && v >= -180 && v <= 180;
