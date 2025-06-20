// backend/routes/auth.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { authController } from "../controllers/auth.controller.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticateToken, authController.getMe);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", authenticateToken, authController.logout);

//@route   POST /api/auth/reset-password
// @desc    Reset user password
// @access  public

router.post("/reset-password", authController.resetPassword);
export default router;
