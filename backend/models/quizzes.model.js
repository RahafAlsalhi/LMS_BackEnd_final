import { pool } from "../config/database.js";

export const QuizzesModel = {
  // Create quiz question (Instructor)
  async createQuiz(lessonId, question, options, correctAnswer, points = 1) {
    const result = await pool.query(
      `INSERT INTO quizzes (lesson_id, question, options, correct_answer, points) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lessonId, question, JSON.stringify(options), correctAnswer, points]
    );
    return result.rows[0];
  },

  // Get quiz by ID with correct answer
  async getQuizById(id) {
    const result = await pool.query("SELECT * FROM quizzes WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },

  // Get quizzes by lesson (for students - without correct answers)
  async getQuizzesByLesson(lessonId, hideAnswers = true) {
    let query = "SELECT id, lesson_id, question, options, points, created_at";
    if (!hideAnswers) {
      query += ", correct_answer";
    }
    query += " FROM quizzes WHERE lesson_id = $1 ORDER BY created_at";

    const result = await pool.query(query, [lessonId]);
    return result.rows;
  },

  // Submit quiz answer (upsert operation)
  async submitQuizAnswer(quizId, userId, selectedAnswer, isCorrect) {
    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, selected_answer, is_correct) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (quiz_id, user_id) 
       DO UPDATE SET selected_answer = $3, is_correct = $4, attempted_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [quizId, userId, selectedAnswer, isCorrect]
    );
    return result.rows[0];
  },

  // Get student's quiz results for a lesson
  async getStudentResults(userId, lessonId) {
    const result = await pool.query(
      `SELECT q.id, q.question, q.options, q.correct_answer, q.points,
              qa.selected_answer, qa.is_correct, qa.attempted_at
       FROM quizzes q
       LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = $1
       WHERE q.lesson_id = $2
       ORDER BY q.created_at`,
      [userId, lessonId]
    );
    return result.rows;
  },

  // Check if student has attempted quiz
  async hasAttempted(quizId, userId) {
    const result = await pool.query(
      "SELECT id FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2",
      [quizId, userId]
    );
    return result.rows.length > 0;
  },
};
