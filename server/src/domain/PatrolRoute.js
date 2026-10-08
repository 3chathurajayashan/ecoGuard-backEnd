/**
 * Route definition with expected geographic points for coverage.
 */
export class PatrolRoute {
  /**
   * @param {object} data Route DTO values.
   */
  constructor({
    routeId,
    routeName,
    startPoint,
    endPoint,
    distance,
    estimatedDuration,
    expectedWaypoints,
    routePoints = [],
  }) {
    this.routeId = routeId;
    this.routeName = routeName;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.distance = distance;
    this.estimatedDuration = estimatedDuration;
    this.expectedWaypoints = expectedWaypoints;
    this.routePoints = routePoints.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    }));
  }
}
