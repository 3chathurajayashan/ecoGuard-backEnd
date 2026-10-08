import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    // 1. Check if user is logged in via express-session (from your authController)
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }

    // 2. Fallback: Check for JWT Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access denied. Please login first." });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token." });
  }
};
export default auth;
