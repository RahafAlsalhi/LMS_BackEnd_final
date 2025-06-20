// backend/routes/assignments.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { AssignmentsController } from "../controllers/assignments.controller.js";

const router = express.Router();

// Create assignment (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  AssignmentsController.createAssignment
);

// Get assignment by ID
router.get("/:id", authenticateToken, AssignmentsController.getAssignment);

// Get assignments by lesson
router.get(
  "/lesson/:lessonId",
  authenticateToken,
  AssignmentsController.getAssignmentsByLesson
);

// Update assignment (Instructor only)
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  AssignmentsController.updateAssignment
);

// Delete assignment (Instructor only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  AssignmentsController.deleteAssignment
);

export default router;
