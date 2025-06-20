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

// Get lesson by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT l.*, m.title as module_title, m.course_id
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE l.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new lesson (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const {
        module_id,
        title,
        content_type,
        content_url,
        content_text,
        duration,
      } = req.body;

      if (!module_id || !title || !content_type) {
        return res
          .status(400)
          .json({ message: "Module ID, title, and content type are required" });
      }

      // Get the next order index
      const orderResult = await pool.query(
        "SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM lessons WHERE module_id = $1",
        [module_id]
      );

      const result = await pool.query(
        "INSERT INTO lessons (module_id, title, content_type, content_url, content_text, duration, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          module_id,
          title,
          content_type,
          content_url,
          content_text,
          duration || 0,
          orderResult.rows[0].next_order,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update lesson
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        content_type,
        content_url,
        content_text,
        duration,
        order_index,
      } = req.body;

      const result = await pool.query(
        "UPDATE lessons SET title = $1, content_type = $2, content_url = $3, content_text = $4, duration = $5, order_index = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *",
        [
          title,
          content_type,
          content_url,
          content_text,
          duration,
          order_index,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete lesson
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        "DELETE FROM lessons WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      res.json({ message: "Lesson deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Mark lesson as completed (Student progress tracking)
router.post("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.userId;

    // Check if lesson exists
    const lessonResult = await pool.query(
      "SELECT id FROM lessons WHERE id = $1",
      [id]
    );
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Create or update lesson completion
    const result = await pool.query(
      `
      INSERT INTO lesson_completions (lesson_id, user_id, completed_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (lesson_id, user_id) 
      DO UPDATE SET completed_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [id, user_id]
    );

    res.json({
      message: "Lesson marked as completed",
      completion: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
