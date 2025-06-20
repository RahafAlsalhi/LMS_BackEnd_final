// backend/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userModel as AuthModel } from "../models/auth.model.js";

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export const authController = {
  // Register a new user
  async register(req, res) {
    try {
      const { name, email, password, role = "student" } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user exists
      const userExists = await AuthModel.findByEmail(email);
      if (userExists.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Determine approval status
      // Students and admins are auto-approved, instructors need approval
      const isApproved = role !== "instructor";

      // Create user
      const user = await AuthModel.create({
        name,
        email,
        hashedPassword,
        role,
        isApproved,
      });

      // For instructors, don't generate token yet - they need approval
      if (role === "instructor" && !isApproved) {
        return res.status(201).json({
          message:
            "Registration submitted successfully. Your account is pending admin approval.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_approved: user.is_approved,
          },
          requiresApproval: true,
        });
      }

      // For approved users, generate token
      const token = generateToken(user.id, user.role);

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_approved: user.is_approved,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Find user
      const user = await AuthModel.findByEmailWithPassword(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.is_active) {
        return res
          .status(401)
          .json({ message: "Account is deactivated. Contact administrator." });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if instructor is approved
      if (user.role === "instructor" && !user.is_approved) {
        return res.status(401).json({
          message: "Your instructor account is pending admin approval.",
          requiresApproval: true,
        });
      }

      const token = generateToken(user.id, user.role);

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_approved: user.is_approved,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get current user
  async getMe(req, res) {
    try {
      console.log("Getting current user for ID:", req.user.userId); // Debug log

      const user = await AuthModel.findById(req.user.userId);

      if (!user) {
        console.log("User not found for ID:", req.user.userId); // Debug log
        return res.status(404).json({ message: "User not found" });
      }

      console.log("User found:", user); // Debug log
      res.json({ user });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Logout user (client-side token removal)
  logout(req, res) {
    res.json({ message: "Logged out successfully" });
  },
  async resetPassword(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res
          .status(400)
          .json({ message: "Email and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user exists
      const userExists = await AuthModel.findByEmail(email);
      if (userExists.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updatedUser = await AuthModel.updatePasswordByEmail(
        email,
        hashedPassword
      );

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.status(200).json({
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
