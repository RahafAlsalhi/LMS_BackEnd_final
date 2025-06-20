// backend/routes/enrollments.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { EnrollmentsController } from "../controllers/enrollments.controller.js";

const router = express.Router();

// Enroll in course
router.post("/", authenticateToken, EnrollmentsController.enrollInCourse);

// Get user enrollments
router.get("/my", authenticateToken, EnrollmentsController.getUserEnrollments);

// Get course enrollments (for instructors)
router.get(
  "/course/:courseId",
  authenticateToken,
  requireRole("instructor", "admin"),
  EnrollmentsController.getCourseEnrollments
);
// Get admin statistics (admin only)
router.get(
  "/admin/stats",
  authenticateToken,
  requireRole("admin"),
  EnrollmentsController.getAdminStats
);

export default router;
