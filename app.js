import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

import connectDB from "./config/DB.js";

// Auth
import authRoutes from "./Routes/authRoutes.js";
import userRoutes from "./Routes/userRoutes.js";

// Wildlife Conflict Alerts & Response module routes
import animalRoutes from "./Routes/animalRoutes.js";
import gpsCollarRoutes from "./Routes/gpsCollarRoutes.js";
import riskZoneRoutes from "./Routes/riskZoneRoutes.js";
import communityReportRoutes from "./Routes/communityReportRoutes.js";
import wildlifeConflictAlertRoutes from "./Routes/wildlifeConflictAlertRoutes.js";
import responseActionRoutes from "./Routes/responseActionRoutes.js";
import conflictNotificationRoutes from "./Routes/conflictNotificationRoutes.js";

// Other module routes
import incidentRoutes from "./Routes/incidentRoutes.js";
import notificationRoutes from "./Routes/notificationRoutes.js";

// Middleware
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// The mobile app sends no Origin header; the Expo web build and local tools run on localhost or
// a LAN address with any port. Anything else is rejected.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || LOCAL_ORIGIN.test(origin) || extraOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Wildlife Conflict Alerts & Response module
app.use("/api/animals", animalRoutes);
app.use("/api/gps-collars", gpsCollarRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use("/api/community-reports", communityReportRoutes);
app.use("/api/conflict-alerts", wildlifeConflictAlertRoutes);
app.use("/api/response-actions", responseActionRoutes);
app.use("/api/conflict-notifications", conflictNotificationRoutes);

// Other modules
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EcoGuard Backend API is running",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
