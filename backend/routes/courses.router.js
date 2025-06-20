// backend/routes/courses.router.js - CORRECTED ROUTE ORDER
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { CoursesController } from "../controllers/courses.controller.js";

const router = express.Router();

// IMPORTANT: Put specific routes FIRST, parameterized routes LAST

// Get categories (specific route)
router.get("/categories/all", CoursesController.getAllCategories);

// Get instructor's own courses (specific route)
router.get(
  "/instructor/my-courses",
  authenticateToken,
  requireRole("instructor", "admin"),
  CoursesController.getInstructorCourses
);

// Get all courses for admin (specific route)
router.get(
  "/admin/all-courses",
  authenticateToken,
  requireRole("admin"),
  CoursesController.getAllCoursesForAdmin
);

// Get published courses for students (specific route)
router.get("/published", CoursesController.getPublishedCourses);

// Get all courses (public, published and approved only)
router.get("/", CoursesController.getAllPublicCourses);

// Get course by ID (parameterized route - MUST BE LAST)
router.get("/:id", CoursesController.getCourseById);

// Create course (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  CoursesController.createCourse
);

// Update course
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  CoursesController.updateCourse
);

// Delete course
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  CoursesController.deleteCourse
);

router.get(
  "/:id/instructor-details",
  authenticateToken,
  requireRole("instructor", "admin"),
  CoursesController.getCourseDetailsForInstructor
);

export default router;
