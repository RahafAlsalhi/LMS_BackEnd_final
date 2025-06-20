// backend/routes/quiz-attempts.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { QuizAttemptsController } from "../controllers/quiz-attempts.controller.js";

const router = express.Router();

// Student routes
// Submit quiz attempt
router.post(
  "/",
  authenticateToken,
  requireRole("student"),
  QuizAttemptsController.submitAttempt
);

// Get my attempt for specific quiz
router.get(
  "/quiz/:quizId/my",
  authenticateToken,
  requireRole("student"),
  QuizAttemptsController.getMyAttempt
);

// Get all my attempts (optionally filtered by lesson)
router.get(
  "/my",
  authenticateToken,
  requireRole("student"),
  QuizAttemptsController.getMyAttempts
);

// Get quiz attempts by lesson for current user
router.get(
  "/lesson/:lessonId/my",
  authenticateToken,
  requireRole("student"),
  QuizAttemptsController.getMyLessonAttempts
);

// Instructor routes
// Get all attempts for a quiz
router.get(
  "/quiz/:quizId",
  authenticateToken,
  requireRole("instructor", "admin"),
  QuizAttemptsController.getQuizAttempts
);

// Get quiz statistics
router.get(
  "/quiz/:quizId/stats",
  authenticateToken,
  requireRole("instructor", "admin"),
  QuizAttemptsController.getQuizStats
);

export default router;
