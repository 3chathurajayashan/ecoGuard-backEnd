import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/DB.js";

dotenv.config();

const app = express();

 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

 
connectDB();

 
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EcoGuard Backend API is running"
  });
});


 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});