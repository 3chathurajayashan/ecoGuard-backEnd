import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import dotenv from "dotenv";

// Temporarily suppress the annoying "injected env" console error from dotenv v16+
const originalError = console.error;
console.error = () => {};
dotenv.config();
console.error = originalError;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ecoguard_incidents",
    resource_type: "auto", // Allows both image and video
  },
});

export { cloudinary, storage };
