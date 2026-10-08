const EARTH_RADIUS_METRES = 6_371_000;

/**
 * Strategy contract and default haversine coverage algorithm.
 */
export class CoverageCalculator {
  /**
   * Computes a coverage summary.
   * @param {import('./PatrolRoute.js').PatrolRoute} route Expected route points.
   * @param {import('./Waypoint.js').Waypoint[]} waypoints Recorded points.
   * @returns {{coveragePercentage:number, coveredPoints:number, neglectedPoints:object[]}} Coverage summary.
   */
  analyze(route, waypoints) {
    const routePoints = route?.routePoints ?? [];
    const neglectedPoints = routePoints.filter(
      (point) =>
        !waypoints.some(
          (waypoint) => this.distanceMetres(point, waypoint) <= 50,
        ),
    );
    const coveredPoints = routePoints.length - neglectedPoints.length;
    return {
      coveragePercentage: routePoints.length
        ? Math.round((coveredPoints / routePoints.length) * 1000) / 10
        : 0,
      coveredPoints,
      neglectedPoints,
    };
  }

  /**
   * Computes the great-circle distance between two coordinates.
   * @param {{latitude:number,longitude:number}} first First coordinate.
   * @param {{latitude:number,longitude:number}} second Second coordinate.
   * @returns {number} Distance in metres.
   */
  distanceMetres(first, second) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(second.latitude - first.latitude);
    const longitudeDelta = toRadians(second.longitude - first.longitude);
    const latitude1 = toRadians(first.latitude);
    const latitude2 = toRadians(second.latitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(haversine));
  }

  /**
   * Strategy API returning only the coverage percentage.
   * @param {import('./PatrolRoute.js').PatrolRoute} route Route to evaluate.
   * @param {import('./Waypoint.js').Waypoint[]} waypoints Recorded points.
   * @returns {number} Percentage of expected route points covered.
   */
  calculate(route, waypoints) {
    return this.analyze(route, waypoints).coveragePercentage;
  }
}
