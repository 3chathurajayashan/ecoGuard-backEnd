 
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "ecoguard/profile-pictures",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadProfilePicture = (req, res, next) => {
  upload.single("profilePicture")(req, res, (error) => {
    if (error) {
      console.error("❌ Profile picture upload failed:");
      console.error(error.message);

      return res.status(400).json({
        success: false,
        message: "Profile picture upload failed",
        error: error.message,
      });
    }

    if (!req.file) {
      console.log("ℹ️ No profile picture uploaded");

      return next();
    }

    console.log("✅ Profile picture uploaded successfully!");
    console.log("📁 File information:");
    console.log({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      cloudinaryUrl: req.file.path,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimetype: req.file.mimetype,
    });

    next();
  });
};

export default upload;
 
