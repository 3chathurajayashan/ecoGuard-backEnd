import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.js';
import { WaypointType } from './enums.js';

/**
 * Geographic point recorded during a patrol.
 */
export class Waypoint {
  /**
   * @param {object} data Waypoint values.
   * @param {string} [data.waypointId] UUID.
   * @param {number} data.latitude Latitude in degrees.
   * @param {number} data.longitude Longitude in degrees.
   * @param {number} [data.altitude=0] Altitude in metres.
   * @param {string|Date} [data.timestamp] Capture time.
   * @param {string} data.type Waypoint source.
   * @param {string} [data.description] Manual point description.
   */
  constructor({
    waypointId = randomUUID(),
    latitude,
    longitude,
    altitude = 0,
    timestamp = new Date(),
    type,
    description = '',
  }) {
    const errors = Waypoint.validate({
      latitude,
      longitude,
      altitude,
      type,
      description,
    });
    if (errors.length) {
      throw new ValidationError('Waypoint is invalid', errors);
    }
    this.waypointId = waypointId;
    this.latitude = latitude;
    this.longitude = longitude;
    this.altitude = altitude;
    this.timestamp = new Date(timestamp);
    this.type = type;
    this.description = description;
  }

  /**
   * Factory Method: creates a GPS-recorded waypoint.
   * @param {number} latitude Latitude in degrees.
   * @param {number} longitude Longitude in degrees.
   * @param {number} [altitude=0] Altitude in metres.
   * @returns {Waypoint} Valid automatic waypoint.
   */
  static createAutoPoint(latitude, longitude, altitude = 0) {
    return new Waypoint({
      latitude,
      longitude,
      altitude,
      type: WaypointType.AUTOMATIC,
    });
  }

  /**
   * Factory Method: creates a ranger-entered waypoint.
   * @param {number} latitude Latitude in degrees.
   * @param {number} longitude Longitude in degrees.
   * @param {number} [altitude=0] Altitude in metres.
   * @param {string} description Explanation for the manual point.
   * @returns {Waypoint} Valid manual waypoint.
   */
  static createManualPoint(latitude, longitude, altitude = 0, description) {
    return new Waypoint({
      latitude,
      longitude,
      altitude,
      type: WaypointType.MANUAL,
      description,
    });
  }

  /**
   * Validates geographic bounds and waypoint-specific requirements.
   * @param {object} point Candidate waypoint data.
   * @returns {string[]} All validation messages.
   */
  static validate({
    latitude,
    longitude,
    altitude = 0,
    type,
    description = '',
  }) {
    const errors = [];
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.push('latitude must be a number between -90 and 90');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push('longitude must be a number between -180 and 180');
    }
    if (!Number.isFinite(altitude)) {
      errors.push('altitude must be a finite number');
    }
    if (!Object.values(WaypointType).includes(type)) {
      errors.push('type must be AUTOMATIC or MANUAL');
    }
    if (type === WaypointType.MANUAL && !description.trim()) {
      errors.push('description is required for a MANUAL waypoint');
    }
    return errors;
  }
}
