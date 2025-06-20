// backend/routes/lessons.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { uploadVideo } from "../middleware/upload.js"; // Import video upload
import { LessonsController } from "../controllers/lessons.controller.js";

const router = express.Router();

// Create lesson with video upload support
router.post(
  "/",
  authenticateToken,
  uploadVideo.single("video"), // Add video upload middleware
  LessonsController.createLesson
);

// Update lesson with video upload support
router.put(
  "/:id",
  authenticateToken,
  uploadVideo.single("video"), // Add video upload middleware
  LessonsController.updateLesson
);

// Get lesson by ID
router.get("/:id", LessonsController.getLessonById);

// Delete lesson
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  LessonsController.deleteLesson
);

// Mark lesson as complete
router.post(
  "/:id/complete",
  authenticateToken,
  LessonsController.markLessonComplete
);

// Get course progress
router.get(
  "/course/:courseId/progress",
  authenticateToken,
  LessonsController.getCourseProgress
);

export default router;
