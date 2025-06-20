// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine approval status
    // Students and admins are auto-approved, instructors need approval
    const isApproved = role !== "instructor";

    // Create user
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, is_approved",
      [name, email, hashedPassword, role, isApproved]
    );

    const user = newUser.rows[0];

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
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user
    const userResult = await pool.query(
      "SELECT id, name, email, password_hash, role, is_active, is_approved FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res
        .status(401)
        .json({ message: "Account is deactivated. Contact administrator." });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
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
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticateToken, async (req, res) => {
  try {
    console.log("Getting current user for ID:", req.user.userId); // Debug log

    const userResult = await pool.query(
      "SELECT id, name, email, role, avatar_url, is_active FROM users WHERE id = $1 AND is_active = true",
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      console.log("User not found for ID:", req.user.userId); // Debug log
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", userResult.rows[0]); // Debug log
    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
