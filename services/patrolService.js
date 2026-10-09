import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Notification from "../Models/Notification.js";
import Patrol, { WAYPOINT_TYPE } from "../Models/Patrol.js";
import PatrolAssignment from "../Models/PatrolAssignment.js";
import PatrolRoute from "../Models/PatrolRoute.js";
import User from "../Models/User.js";
import { distanceMetres, isValidLatitude, isValidLongitude } from "../utils/geo.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COVERAGE_RADIUS_METRES = 50;

export class PatrolError extends Error {
  constructor(message, status = 400, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** A route point counts as covered when a recorded waypoint is within 50 m of it. */
export function analyzeCoverage(route, waypoints) {
  const points = route?.routePoints ?? [];
  const neglectedPoints = points.filter(
    (p) => !waypoints.some((w) => distanceMetres(p, w) <= COVERAGE_RADIUS_METRES)
  );
  const coveredPoints = points.length - neglectedPoints.length;
  return {
    coveragePercentage: points.length ? Math.round((coveredPoints / points.length) * 1000) / 10 : 0,
    coveredPoints,
    totalPoints: points.length,
    neglectedPoints: neglectedPoints.map((p) => ({ name: p.name, latitude: p.latitude, longitude: p.longitude })),
  };
}

/** Validates one waypoint DTO and returns every problem found. */
export function validateWaypoint(w, index = 0) {
  const errors = [];
  const at = `waypoints[${index}]`;
  if (typeof w?.waypointId !== "string" || !UUID.test(w.waypointId)) errors.push(`${at}.waypointId must be a UUID`);
  if (!isValidLatitude(w?.latitude)) errors.push(`${at}.latitude must be between -90 and 90`);
  if (!isValidLongitude(w?.longitude)) errors.push(`${at}.longitude must be between -180 and 180`);
  if (w?.altitude != null && !Number.isFinite(w.altitude)) errors.push(`${at}.altitude must be a number`);
  if (Number.isNaN(new Date(w?.timestamp).getTime())) errors.push(`${at}.timestamp must be a valid date`);
  if (!WAYPOINT_TYPE.includes(w?.type)) errors.push(`${at}.type must be AUTOMATIC or MANUAL`);
  if (w?.type === "MANUAL" && !String(w?.description ?? "").trim()) {
    errors.push(`${at}.description is required for a MANUAL waypoint`);
  }
  return errors;
}

const toWaypoint = (w) => ({
  waypointId: w.waypointId,
  latitude: w.latitude,
  longitude: w.longitude,
  altitude: w.altitude ?? 0,
  timestamp: new Date(w.timestamp),
  type: w.type,
  category: w.category ?? "",
  description: w.description ?? "",
});

async function ownAssignment(assignmentId, rangerId) {
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) throw new PatrolError("assignmentId is not valid");
  const assignment = await PatrolAssignment.findById(assignmentId);
  if (!assignment) throw new PatrolError("Assignment not found", 404);
  if (String(assignment.ranger) !== String(rangerId)) {
    throw new PatrolError("This assignment belongs to another ranger", 403);
  }
  return assignment;
}

/** The ranger's current assignment (newest that is not finished), with its route. */
export async function currentAssignment(rangerId) {
  return PatrolAssignment.findOne({ ranger: rangerId, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } })
    .sort({ assignedDate: -1 })
    .populate("route");
}

export async function assignRoute({ rangerId, routeId, assignedDate, assignedBy }) {
  if (!mongoose.Types.ObjectId.isValid(rangerId)) throw new PatrolError("rangerId is not valid");
  if (!mongoose.Types.ObjectId.isValid(routeId)) throw new PatrolError("routeId is not valid");
  const ranger = await User.findById(rangerId);
  if (!ranger || ranger.role !== "RANGER") throw new PatrolError("Ranger not found", 404);
  const route = await PatrolRoute.findById(routeId);
  if (!route) throw new PatrolError("Route not found", 404);
  const date = assignedDate ? new Date(assignedDate) : new Date();
  if (Number.isNaN(date.getTime())) throw new PatrolError("assignedDate must be a valid date");

  const assignment = await PatrolAssignment.create({ ranger: rangerId, route: routeId, assignedDate: date, assignedBy });
  await Notification.create({
    recipientRole: "RANGER",
    recipient: ranger._id,
    type: "Patrol",
    title: "New patrol assigned",
    message: `You have been assigned "${route.name}".`,
  });
  return assignment.populate(["route", { path: "ranger", select: "firstName lastName email" }]);
}

/** A ranger starts a patrol: the central system records the start time and position. */
export async function startPatrol({ patrolId, assignmentId, startTime, latitude, longitude }, rangerId) {
  if (!UUID.test(patrolId ?? "")) throw new PatrolError("patrolId must be a UUID");
  const assignment = await ownAssignment(assignmentId, rangerId);
  const start = startTime ? new Date(startTime) : new Date();
  if (Number.isNaN(start.getTime())) throw new PatrolError("startTime must be a valid date");

  let patrol = await Patrol.findOne({ patrolId });
  if (!patrol) {
    patrol = await Patrol.create({
      patrolId,
      assignment: assignment._id,
      ranger: rangerId,
      route: assignment.route,
      startTime: start,
      waypoints:
        isValidLatitude(latitude) && isValidLongitude(longitude)
          ? [toWaypoint({ waypointId: randomUUID(), latitude, longitude, timestamp: start, type: "AUTOMATIC" })]
          : [],
    });
  }
  if (assignment.status === "ASSIGNED") {
    assignment.status = "IN_PROGRESS";
    await assignment.save();
  }
  return patrol;
}

/** Live tracking: append GPS points while the patrol is running. Duplicates are ignored. */
export async function addWaypoints(patrolId, waypoints, rangerId) {
  const patrol = await Patrol.findOne({ patrolId });
  if (!patrol) throw new PatrolError("Patrol not found", 404);
  if (String(patrol.ranger) !== String(rangerId)) throw new PatrolError("This patrol belongs to another ranger", 403);
  if (patrol.status === "COMPLETED") throw new PatrolError("This patrol is already completed");
  if (!Array.isArray(waypoints) || !waypoints.length) throw new PatrolError("waypoints must be a non-empty array");

  const errors = waypoints.flatMap((w, i) => validateWaypoint(w, i));
  if (errors.length) throw new PatrolError("Request validation failed", 400, errors);

  const known = new Set(patrol.waypoints.map((w) => w.waypointId));
  const fresh = waypoints.filter((w) => !known.has(w.waypointId)).map(toWaypoint);
  patrol.waypoints.push(...fresh);
  await patrol.save();
  return { patrol, added: fresh.length };
}

/**
 * Receives a finished patrol from a device (possibly after being offline). Safe to send twice:
 * the same patrolId updates the stored patrol instead of creating a second one.
 */
export async function syncPatrol(body, rangerId) {
  const errors = [];
  if (!UUID.test(body?.patrolId ?? "")) errors.push("patrolId must be a UUID");
  if (!mongoose.Types.ObjectId.isValid(body?.assignmentId ?? "")) errors.push("assignmentId is not valid");
  const start = new Date(body?.startTime);
  const end = new Date(body?.endTime);
  if (Number.isNaN(start.getTime())) errors.push("startTime must be a valid date");
  if (Number.isNaN(end.getTime())) errors.push("endTime must be a valid date");
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
    errors.push("endTime must be on or after startTime");
  }
  if (body?.status !== "COMPLETED") errors.push("Only COMPLETED patrols can be synchronized");
  if (!Number.isFinite(body?.totalDistance) || body.totalDistance < 0) errors.push("totalDistance must be 0 or more");
  if (!Array.isArray(body?.waypoints)) errors.push("waypoints must be an array");
  else body.waypoints.forEach((w, i) => errors.push(...validateWaypoint(w, i)));
  if (errors.length) throw new PatrolError("Request validation failed", 400, errors);

  const assignment = await ownAssignment(body.assignmentId, rangerId);
  const route = await PatrolRoute.findById(assignment.route);
  const waypoints = body.waypoints.map(toWaypoint);
  const coverage = analyzeCoverage(route, waypoints);

  const patrol = await Patrol.findOneAndUpdate(
    { patrolId: body.patrolId },
    {
      $set: {
        assignment: assignment._id,
        ranger: rangerId,
        route: assignment.route,
        startTime: start,
        endTime: end,
        status: "COMPLETED",
        syncStatus: "SYNCED",
        totalDistance: body.totalDistance,
        waypoints,
        coveragePercentage: coverage.coveragePercentage,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const wasCompleted = assignment.status === "COMPLETED";
  assignment.status = "COMPLETED";
  await assignment.save();

  if (!wasCompleted) {
    const [ranger, managers] = await Promise.all([
      User.findById(rangerId),
      User.find({ role: "PARK_MANAGER", isActive: true }),
    ]);
    await Notification.insertMany(
      managers.map((m) => ({
        recipientRole: m.role,
        recipient: m._id,
        type: "Patrol",
        title: "Patrol completed",
        message: `${ranger?.firstName ?? "A ranger"} finished "${route?.name ?? "a patrol"}": ${body.totalDistance.toFixed(1)} km, ${coverage.coveragePercentage}% route coverage.`,
      }))
    );
  }

  return { patrol, coverage };
}

export async function coverageFor(patrolId) {
  const patrol = await Patrol.findOne({ patrolId }).populate("route");
  if (!patrol) throw new PatrolError("Patrol not found", 404);
  return { patrol, coverage: analyzeCoverage(patrol.route, patrol.waypoints) };
}
