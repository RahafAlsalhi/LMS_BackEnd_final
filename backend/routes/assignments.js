const express = require("express");
const { Pool } = require("pg");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Submit assignment
router.post("/:id/submit", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { submission_text, submission_url } = req.body;
    const user_id = req.user.userId;

    const result = await pool.query(
      "INSERT INTO submissions (assignment_id, user_id, submission_text, submission_url) VALUES ($1, $2, $3, $4) ON CONFLICT (assignment_id, user_id) DO UPDATE SET submission_text = $3, submission_url = $4, submitted_at = CURRENT_TIMESTAMP RETURNING *",
      [id, user_id, submission_text, submission_url]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Grade assignment (Instructor only)
router.put(
  "/:id/grade",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, grade, feedback } = req.body;
      const graded_by = req.user.userId;

      const result = await pool.query(
        "UPDATE submissions SET grade = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP WHERE assignment_id = $4 AND user_id = $5 RETURNING *",
        [grade, feedback, graded_by, id, user_id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
