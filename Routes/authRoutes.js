import express from "express";

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
} from "../Controllers/authController.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/signup",
  upload.single("profilePicture"),
  signUp
);

router.post("/signin", signIn);

router.post("/signout", signOut);

router.get("/me", getCurrentUser);

export default router;