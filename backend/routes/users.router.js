// backend/routes/users.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { UsersController } from "../controllers/users.controller.js";

const router = express.Router();

// Get all users (Admin only)
router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  UsersController.getAllUsers
);

// Get pending instructor approvals (Admin only)
router.get(
  "/pending-instructors",
  authenticateToken,
  requireRole("admin"),
  UsersController.getPendingInstructors
);

// Approve/reject instructor (Admin only)
router.put(
  "/:id/approval",
  authenticateToken,
  requireRole("admin"),
  UsersController.updateInstructorApproval
);

// Update user status (Admin only)
router.put(
  "/:id/status",
  authenticateToken,
  requireRole("admin"),
  UsersController.updateUserStatus
);
// Update user details (Admin only)
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  UsersController.updateUser
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  UsersController.deleteUser
);
export default router;
