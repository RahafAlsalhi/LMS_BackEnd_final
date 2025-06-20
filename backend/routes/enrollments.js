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

// Enroll in course
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.user.userId;

    const result = await pool.query(
      "INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *",
      [user_id, course_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user enrollments
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.userId;
    const result = await pool.query(
      `
      SELECT e.*, c.title, c.description, c.thumbnail_url, u.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
