import multer from "multer";
import { storage } from "../config/cloudinary.js";

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5,
  },
});

export default upload;
