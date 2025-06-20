// backend/routes/modules.js
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

// Get all modules for a course
router.get("/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      `
      SELECT m.*, 
        COUNT(l.id) as lesson_count,
        COALESCE(SUM(l.duration), 0) as total_duration
      FROM modules m
      LEFT JOIN lessons l ON m.id = l.module_id
      WHERE m.course_id = $1
      GROUP BY m.id
      ORDER BY m.order_index ASC
    `,
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get module with lessons
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get module details
    const moduleResult = await pool.query(
      "SELECT * FROM modules WHERE id = $1",
      [id]
    );
    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Get lessons for this module
    const lessonsResult = await pool.query(
      `
      SELECT * FROM lessons 
      WHERE module_id = $1 
      ORDER BY order_index ASC
    `,
      [id]
    );

    const module = moduleResult.rows[0];
    module.lessons = lessonsResult.rows;

    res.json(module);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new module (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { course_id, title, description } = req.body;

      if (!course_id || !title) {
        return res
          .status(400)
          .json({ message: "Course ID and title are required" });
      }

      // Get the next order index
      const orderResult = await pool.query(
        "SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM modules WHERE course_id = $1",
        [course_id]
      );

      const result = await pool.query(
        "INSERT INTO modules (course_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
        [course_id, title, description, orderResult.rows[0].next_order]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update module
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, order_index } = req.body;

      const result = await pool.query(
        "UPDATE modules SET title = $1, description = $2, order_index = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
        [title, description, order_index, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete module
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        "DELETE FROM modules WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
