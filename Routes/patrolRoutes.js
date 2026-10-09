import express from "express";

import {
  createAssignment,
  createRoute,
  getCoverage,
  listAssignments,
  listPatrols,
  listRoutes,
  myAssignment,
  start,
  sync,
  waypoints,
} from "../Controllers/patrolController.js";
import { allowRoles } from "../middleware/authMiddleware.js";
import { MANAGER, RANGER, RESEARCHER, STAFF } from "../middleware/roles.js";

// /api/patrol-routes
export const routesRouter = express.Router();
routesRouter.get("/", allowRoles(...STAFF), listRoutes);
routesRouter.post("/", allowRoles(MANAGER), createRoute);

// /api/patrol-assignments
export const assignmentsRouter = express.Router();
assignmentsRouter.get("/mine", allowRoles(RANGER), myAssignment);
assignmentsRouter.get("/", allowRoles(MANAGER), listAssignments);
assignmentsRouter.post("/", allowRoles(MANAGER), createAssignment);

// /api/patrols
const patrolsRouter = express.Router();
patrolsRouter.post("/start", allowRoles(RANGER), start);
patrolsRouter.post("/sync", allowRoles(RANGER), sync);
patrolsRouter.post("/:patrolId/waypoints", allowRoles(RANGER), waypoints);
patrolsRouter.get("/", allowRoles(RANGER, MANAGER, RESEARCHER), listPatrols);
patrolsRouter.get("/:patrolId/coverage", allowRoles(RANGER, MANAGER, RESEARCHER), getCoverage);

export default patrolsRouter;
