const express = require("express");
const { Pool } = require("pg");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Submit quiz answer
router.post("/:id/submit", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { selected_answer } = req.body;
    const user_id = req.user.userId;

    // Get quiz details
    const quiz = await pool.query(
      "SELECT correct_answer FROM quizzes WHERE id = $1",
      [id]
    );
    if (quiz.rows.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const is_correct = quiz.rows[0].correct_answer === selected_answer;

    const result = await pool.query(
      "INSERT INTO quiz_attempts (quiz_id, user_id, selected_answer, is_correct) VALUES ($1, $2, $3, $4) ON CONFLICT (quiz_id, user_id) DO UPDATE SET selected_answer = $3, is_correct = $4, attempted_at = CURRENT_TIMESTAMP RETURNING *",
      [id, user_id, selected_answer, is_correct]
    );

    res.json({
      success: true,
      is_correct,
      attempt: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
