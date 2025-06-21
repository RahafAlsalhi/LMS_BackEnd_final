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

// 🆕 NEW: Get detailed course enrollments with student progress and performance data
router.get(
  "/course/:courseId/details",
  authenticateToken,
  requireRole("instructor", "admin"),
  EnrollmentsController.getCourseEnrollmentsWithDetails
);

// 🆕 NEW: Get comprehensive course analytics (enrollment stats, performance metrics, etc.)
router.get(
  "/course/:courseId/analytics",
  authenticateToken,
  requireRole("instructor", "admin"),
  EnrollmentsController.getCourseAnalytics
);

// 🆕 NEW: Get ungraded submissions for a course (for instructor dashboard)
router.get(
  "/course/:courseId/ungraded",
  authenticateToken,
  requireRole("instructor", "admin"),
  EnrollmentsController.getUngradedSubmissions
);

// Get admin statistics (admin only)
router.get(
  "/admin/stats",
  authenticateToken,
  requireRole("admin"),
  EnrollmentsController.getAdminStats
);

export default router;
