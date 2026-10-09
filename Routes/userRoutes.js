import express from "express";

import { listUsers } from "../Controllers/authController.js";
import auth, { authorize } from "../middleware/auth.js";

const router = express.Router();

// Staff only: a villager has no reason to browse accounts.
router.get(
  "/",
  auth,
  authorize("RANGER", "COMMUNITY_LIAISON_OFFICER", "PARK_MANAGER", "CONSERVATION_RESEARCHER"),
  listUsers
);

export default router;
