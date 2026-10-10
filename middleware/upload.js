import multer from "multer";
import { storage } from "../config/cloudinary.js";

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5,
  },
});
//upload middleware is used to handle file uploads in the application. It uses multer, a middleware for handling multipart/form-data, which is primarily used for uploading files. The storage option specifies where the uploaded files will be stored, and the limits option sets restrictions on the file size and number of files that can be uploaded.
export default upload;
