import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import connectDB from "./config/DB.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
//apply middleware to handle CORS (Cross-Origin Resource Sharing) requests from the frontend application running on http://localhost:5173. It allows the frontend to make requests to the backend while including credentials (like cookies) in the requests.
 

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
    secret: process.env.SESSION_SECRET,

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


 

import incidentRoutes from "./routes/incidentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);

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