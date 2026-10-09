import jwt from "jsonwebtoken";

/** Issues the bearer token returned by sign-in. */
export const signToken = (user) =>
  jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

/**
 * Authenticates a request from a bearer token (mobile app) or, as a fallback,
 * the express-session cookie (browser). Sets req.user = { id, role, ... }.
 */
const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      req.user = { ...decoded, id: String(decoded.id) };
      return next();
    }

    if (req.session && req.session.user) {
      req.user = { ...req.session.user, id: String(req.session.user.id) };
      return next();
    }

    return res
      .status(401)
      .json({ success: false, message: "Access denied. Please login first." });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

/** Role guard. Use after auth: router.post("/", auth, authorize("PARK_MANAGER"), handler). */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Access denied. Please login first." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${req.user.role}) is not allowed to do this.`,
      });
    }
    return next();
  };

export default auth;
