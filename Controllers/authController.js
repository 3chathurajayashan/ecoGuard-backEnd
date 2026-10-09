import bcrypt from "bcryptjs";
import User from "../Models/User.js";
import { signToken } from "../middleware/auth.js";

const allowedRoles = [
  "RANGER",
  "COMMUNITY_LIAISON_OFFICER",
  "PARK_MANAGER",
  "CONSERVATION_RESEARCHER",
  "VILLAGER",
];

const publicUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  profilePicture: user.profilePicture,
});

export const signUp = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      role,
      profilePicture: req.file
        ? {
            url: req.file.path,
            publicId: req.file.filename,
          }
        : {
            url: null,
            publicId: null,
          },
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("SIGN UP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("SIGN IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to sign in",
    });
  }
};

export const signOut = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  });
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    await user.save();
    return res.status(200).json({ success: true, message: "Profile updated", user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

/** GET /api/users?role=RANGER : staff lookups (e.g. a manager choosing a ranger for a patrol). */
export const listUsers = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.role) filter.role = String(req.query.role).toUpperCase();
    const users = await User.find(filter).select("-password").sort({ firstName: 1 });
    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to list users" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};