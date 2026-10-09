import express from "express";

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateProfile,
} from "../Controllers/authController.js";

import auth from "../middleware/auth.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/signup",
  upload.single("profilePicture"),
  signUp
);

router.post("/signin", signIn);

router.post("/signout", signOut);

router.get("/me", auth, getCurrentUser);

router.patch("/me", auth, updateProfile);

export default router;
