
// backend/routes/quizzes.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { QuizzesController } from "../controllers/quizzes.controller.js";

const router = express.Router();

// Create quiz question (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  QuizzesController.createQuiz
);

// Get quiz by ID
router.get(
  "/:id",
  authenticateToken,
  QuizzesController.getQuiz
);

// Get quizzes by lesson
router.get(
  "/lesson/:lessonId",
  authenticateToken,
  QuizzesController.getQuizzesByLesson
);

// Submit quiz answer (Student only)
router.post(
  "/:id/submit",
  authenticateToken,
  requireRole("student"),
  QuizzesController.submitQuizAnswer
);

// Get my results for lesson (Student only)
router.get(
  "/lesson/:lessonId/my-results",
  authenticateToken,
  requireRole("student"),
  QuizzesController.getMyResults
);

export default router;