import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import connectDB from "./config/DB.js";
import authRoutes from "./Routes/authRoutes.js";

// Wildlife Conflict Alerts & Response module routes
import animalRoutes from "./Routes/animalRoutes.js";
import gpsCollarRoutes from "./Routes/gpsCollarRoutes.js";
import riskZoneRoutes from "./Routes/riskZoneRoutes.js";
import communityReportRoutes from "./Routes/communityReportRoutes.js";
import wildlifeConflictAlertRoutes from "./Routes/wildlifeConflictAlertRoutes.js";
import responseActionRoutes from "./Routes/responseActionRoutes.js";
import conflictNotificationRoutes from "./Routes/conflictNotificationRoutes.js";

dotenv.config();

const app = express();

 

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

 

app.use(
  session({
    secret: process.env.JWT_SECRET,

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


 

app.use("/api/auth", authRoutes);

// Wildlife Conflict Alerts & Response module
app.use("/api/animals", animalRoutes);
app.use("/api/gps-collars", gpsCollarRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use("/api/community-reports", communityReportRoutes);
app.use("/api/conflict-alerts", wildlifeConflictAlertRoutes);
app.use("/api/response-actions", responseActionRoutes);
app.use("/api/conflict-notifications", conflictNotificationRoutes);


 

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EcoGuard Backend API is running",
  });
});


 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});