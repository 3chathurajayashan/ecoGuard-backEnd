import mongoose from "mongoose";

import Patrol from "../Models/Patrol.js";
import PatrolAssignment from "../Models/PatrolAssignment.js";
import PatrolRoute from "../Models/PatrolRoute.js";
import {
  PatrolError,
  addWaypoints,
  assignRoute,
  coverageFor,
  currentAssignment,
  startPatrol,
  syncPatrol,
} from "../services/patrolService.js";
import { isValidLatitude, isValidLongitude } from "../utils/geo.js";

/** Turns a PatrolError into a clean response; anything else is a 500. */
const handle = (res, error, label) => {
  if (error instanceof PatrolError) {
    return res.status(error.status).json({ success: false, message: error.message, errors: error.errors });
  }
  console.error(`${label}:`, error);
  return res.status(500).json({ success: false, message: "Something went wrong" });
};

const validPoint = (p) => p && isValidLatitude(p.latitude) && isValidLongitude(p.longitude);

// ── Routes (manager plans them, everyone signed in can read) ─────────────────
export const listRoutes = async (req, res) => {
  try {
    const routes = await PatrolRoute.find().sort({ name: 1 });
    return res.status(200).json({ success: true, count: routes.length, routes });
  } catch (error) {
    return handle(res, error, "LIST ROUTES");
  }
};

export const createRoute = async (req, res) => {
  try {
    const { name, parkName, startPoint, endPoint, distanceKm, estimatedDurationMinutes, routePoints } = req.body;
    const errors = [];
    if (!name?.trim()) errors.push("name is required");
    if (!validPoint(startPoint)) errors.push("startPoint needs a valid latitude and longitude");
    if (!validPoint(endPoint)) errors.push("endPoint needs a valid latitude and longitude");
    if (!Number.isFinite(distanceKm) || distanceKm < 0) errors.push("distanceKm must be 0 or more");
    if (!Number.isFinite(estimatedDurationMinutes) || estimatedDurationMinutes < 0) {
      errors.push("estimatedDurationMinutes must be 0 or more");
    }
    if (routePoints != null && (!Array.isArray(routePoints) || !routePoints.every(validPoint))) {
      errors.push("routePoints must be a list of valid coordinates");
    }
    if (errors.length) return res.status(400).json({ success: false, message: "Request validation failed", errors });

    const route = await PatrolRoute.create({
      name,
      parkName,
      startPoint,
      endPoint,
      distanceKm,
      estimatedDurationMinutes,
      routePoints: routePoints ?? [],
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, route });
  } catch (error) {
    return handle(res, error, "CREATE ROUTE");
  }
};

// ── Assignments ──────────────────────────────────────────────────────────────
export const myAssignment = async (req, res) => {
  try {
    const assignment = await currentAssignment(req.user.id);
    // "No assigned route" is a normal state the app shows a message for, not an error
    return res.status(200).json({
      success: true,
      assignment,
      message: assignment ? undefined : "You have no assigned patrol route.",
    });
  } catch (error) {
    return handle(res, error, "MY ASSIGNMENT");
  }
};

export const listAssignments = async (req, res) => {
  try {
    const assignments = await PatrolAssignment.find()
      .populate("route", "name parkName distanceKm")
      .populate("ranger", "firstName lastName email")
      .sort({ assignedDate: -1 });
    return res.status(200).json({ success: true, count: assignments.length, assignments });
  } catch (error) {
    return handle(res, error, "LIST ASSIGNMENTS");
  }
};

export const createAssignment = async (req, res) => {
  try {
    const assignment = await assignRoute({
      rangerId: req.body.rangerId,
      routeId: req.body.routeId,
      assignedDate: req.body.assignedDate,
      assignedBy: req.user.id,
    });
    return res.status(201).json({ success: true, assignment });
  } catch (error) {
    return handle(res, error, "CREATE ASSIGNMENT");
  }
};

// ── Patrols ──────────────────────────────────────────────────────────────────
export const start = async (req, res) => {
  try {
    const patrol = await startPatrol(req.body, req.user.id);
    return res.status(201).json({ success: true, patrol });
  } catch (error) {
    return handle(res, error, "START PATROL");
  }
};

export const waypoints = async (req, res) => {
  try {
    const { added } = await addWaypoints(req.params.patrolId, req.body.waypoints, req.user.id);
    return res.status(200).json({ success: true, added });
  } catch (error) {
    return handle(res, error, "ADD WAYPOINTS");
  }
};

export const sync = async (req, res) => {
  try {
    const { patrol, coverage } = await syncPatrol(req.body, req.user.id);
    return res.status(200).json({ success: true, result: "SYNCED", patrolId: patrol.patrolId, coverage });
  } catch (error) {
    return handle(res, error, "SYNC PATROL");
  }
};

export const listPatrols = async (req, res) => {
  try {
    const filter = {};
    // Rangers see their own patrols; management sees everyone's
    if (req.user.role === "RANGER") filter.ranger = req.user.id;
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    const patrols = await Patrol.find(filter)
      .populate("route", "name parkName distanceKm")
      .populate("ranger", "firstName lastName")
      .sort({ startTime: -1 })
      .limit(200);
    return res.status(200).json({ success: true, count: patrols.length, patrols });
  } catch (error) {
    return handle(res, error, "LIST PATROLS");
  }
};

export const getCoverage = async (req, res) => {
  try {
    const { patrol, coverage } = await coverageFor(req.params.patrolId);
    return res.status(200).json({ success: true, patrolId: patrol.patrolId, ...coverage });
  } catch (error) {
    return handle(res, error, "COVERAGE");
  }
};

export const isObjectId = mongoose.Types.ObjectId.isValid;
