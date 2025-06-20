// backend/controllers/quiz-attempts.controller.js
import { pool } from "../config/database.js";
import { QuizzesModel } from "../models/quizzes.model.js";

export class QuizAttemptsController {
  // Submit quiz attempt
  static async submitAttempt(req, res) {
    const { quiz_id, selected_answer } = req.body;
    const user_id = req.user.userId; // ✅ Fixed

    console.log("🔍 Debug info:");
    console.log("- Quiz ID:", quiz_id);
    console.log("- Selected Answer:", selected_answer);
    console.log("- User ID:", user_id);

    try {
      // Check if user already attempted this quiz
      const existingAttempt = await pool.query(
        "SELECT id FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2",
        [quiz_id, user_id]
      );

      if (existingAttempt.rows.length > 0) {
        return res.status(400).json({
          message: "You have already attempted this quiz",
        });
      }

      // Get quiz details to check correct answer
      const quiz = await QuizzesModel.getQuizById(quiz_id); // ✅ Use the model

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const is_correct = parseInt(selected_answer) === quiz.correct_answer;

      // Use the model method instead of direct SQL
      const attempt = await QuizzesModel.submitQuizAnswer(
        quiz_id,
        user_id,
        selected_answer,
        is_correct
      ); // ✅ Use the model method

      res.status(201).json({
        ...attempt,
        points_earned: is_correct ? quiz.points : 0,
      });
    } catch (error) {
      console.error("Error submitting quiz attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  // Get user's attempt for specific quiz
  static async getMyAttempt(req, res) {
    const { quizId } = req.params;
    const user_id = req.user.userId;
    try {
      const result = await pool.query(
        `SELECT qa.*, q.points
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id = q.id
         WHERE qa.quiz_id = $1 AND qa.user_id = $2`,
        [quizId, user_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "No attempt found" });
      }

      const attempt = result.rows[0];
      res.json({
        ...attempt,
        points_earned: attempt.is_correct ? attempt.points : 0,
      });
    } catch (error) {
      console.error("Error fetching quiz attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get all user's quiz attempts
  static async getMyAttempts(req, res) {
    const user_id = req.user.userId;
    const { lesson_id } = req.query;

    try {
      let query = `
        SELECT qa.*, q.question, q.points, l.title as lesson_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        WHERE qa.user_id = $1
      `;

      const params = [user_id];

      if (lesson_id) {
        query += " AND q.lesson_id = $2";
        params.push(lesson_id);
      }

      query += " ORDER BY qa.attempted_at DESC";

      const result = await pool.query(query, params);

      const attempts = result.rows.map((attempt) => ({
        ...attempt,
        points_earned: attempt.is_correct ? attempt.points : 0,
      }));

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching user quiz attempts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get user's attempts for all quizzes in a lesson
  static async getMyLessonAttempts(req, res) {
    const { lessonId } = req.params;
    const user_id = req.user.userId;
    try {
      const result = await pool.query(
        `SELECT qa.*, q.question, q.points
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id = q.id
         WHERE q.lesson_id = $1 AND qa.user_id = $2
         ORDER BY qa.attempted_at DESC`,
        [lessonId, user_id]
      );

      const attempts = result.rows.map((attempt) => ({
        ...attempt,
        points_earned: attempt.is_correct ? attempt.points : 0,
      }));

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching lesson quiz attempts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get all attempts for a specific quiz (instructor)
  static async getQuizAttempts(req, res) {
    const { quizId } = req.params;

    try {
      const result = await pool.query(
        `SELECT qa.*, u.username, u.email, q.points
         FROM quiz_attempts qa
         JOIN users u ON qa.user_id = u.id
         JOIN quizzes q ON qa.quiz_id = q.id
         WHERE qa.quiz_id = $1
         ORDER BY qa.attempted_at DESC`,
        [quizId]
      );

      const attempts = result.rows.map((attempt) => ({
        ...attempt,
        points_earned: attempt.is_correct ? attempt.points : 0,
      }));

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get quiz statistics (instructor)
  static async getQuizStats(req, res) {
    const { quizId } = req.params;

    try {
      // Get basic stats
      const statsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_attempts,
           COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_attempts,
           ROUND(
             (COUNT(CASE WHEN is_correct = true THEN 1 END)::decimal / COUNT(*)) * 100, 
             2
           ) as success_rate
         FROM quiz_attempts 
         WHERE quiz_id = $1`,
        [quizId]
      );

      // Get answer distribution
      const distributionResult = await pool.query(
        `SELECT 
           selected_answer,
           COUNT(*) as count
         FROM quiz_attempts 
         WHERE quiz_id = $1
         GROUP BY selected_answer
         ORDER BY selected_answer`,
        [quizId]
      );

      // Get quiz details
      const quizResult = await pool.query(
        "SELECT question, options, correct_answer, points FROM quizzes WHERE id = $1",
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      res.json({
        quiz: quizResult.rows[0],
        stats: statsResult.rows[0],
        answer_distribution: distributionResult.rows,
      });
    } catch (error) {
      console.error("Error fetching quiz statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
