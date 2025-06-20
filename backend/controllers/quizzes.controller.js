// backend/models/quizzes.model.js


// backend/controllers/quizzes.controller.js
import { QuizzesModel } from "../models/quizzes.model.js";

export const QuizzesController = {
  // Create quiz question (Instructor)
  async createQuiz(req, res) {
    try {
      const { lesson_id, question, options, correct_answer, points } = req.body;
      
      const quiz = await QuizzesModel.createQuiz(
        lesson_id, question, options, correct_answer, points
      );
      
      res.status(201).json(quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({ message: "Failed to create quiz question" });
    }
  },

  // Get quiz by ID
  async getQuiz(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      
      const quiz = await QuizzesModel.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // Hide correct answer for students
      if (userRole === 'student') {
        delete quiz.correct_answer;
      }

      res.json(quiz);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get quizzes by lesson
  async getQuizzesByLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const userRole = req.user.role;
      
      // Hide correct answers for students
      const hideAnswers = userRole === 'student';
      const quizzes = await QuizzesModel.getQuizzesByLesson(lessonId, hideAnswers);
      
      res.json(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Submit quiz answer (Student)
  async submitQuizAnswer(req, res) {
    try {
      const { id } = req.params;
      const { selected_answer } = req.body;
      const userId = req.user.userId;

      // Check if already attempted
      const hasAttempted = await QuizzesModel.hasAttempted(id, userId);
      if (hasAttempted) {
        return res.status(400).json({ message: "You have already attempted this quiz" });
      }

      // Get quiz details
      const quiz = await QuizzesModel.getQuizById(id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const isCorrect = quiz.correct_answer === selected_answer;

      const attempt = await QuizzesModel.submitQuizAnswer(
        id,
        userId,
        selected_answer,
        isCorrect
      );

      res.json({
        success: true,
        is_correct: isCorrect,
        attempt,
      });
    } catch (error) {
      console.error('Error submitting quiz answer:', error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get student results (Student)
  async getMyResults(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const results = await QuizzesModel.getStudentResults(userId, lessonId);
      res.json(results);
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

