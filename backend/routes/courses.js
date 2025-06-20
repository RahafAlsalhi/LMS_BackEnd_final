// backend/routes/courses.js - CORRECTED ROUTE ORDER

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

// IMPORTANT: Put specific routes FIRST, parameterized routes LAST

// Get categories (specific route)
router.get("/categories/all", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get instructor's own courses (specific route)
router.get(
  "/instructor/my-courses",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const instructorId = req.user.userId;

      const result = await pool.query(
        `
      SELECT 
        c.*, 
        u.name as instructor_name, 
        cat.name as category_name,
        COALESCE(e.enrollment_count, 0) as enrollments_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) as enrollment_count
        FROM enrollments 
        GROUP BY course_id
      ) e ON c.id = e.course_id
      WHERE c.instructor_id = $1
      ORDER BY c.created_at DESC
    `,
        [instructorId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all courses for admin (specific route)
router.get(
  "/admin/all-courses",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        c.*, 
        u.name as instructor_name, 
        cat.name as category_name,
        COALESCE(e.enrollment_count, 0) as enrollments_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) as enrollment_count
        FROM enrollments 
        GROUP BY course_id
      ) e ON c.id = e.course_id
      ORDER BY c.created_at DESC
    `);

      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get published courses for students (specific route)
router.get("/published", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*, 
        u.name as instructor_name, 
        cat.name as category_name,
        COALESCE(e.enrollment_count, 0) as enrollments_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) as enrollment_count
        FROM enrollments 
        GROUP BY course_id
      ) e ON c.id = e.course_id
      WHERE c.is_approved = true
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all courses (public, published and approved only)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name as instructor_name, cat.name as category_name 
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.is_published = true AND c.is_approved = true
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get course by ID (parameterized route - MUST BE LAST)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT c.*, u.name as instructor_name, cat.name as category_name 
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create course (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { title, description, category_id, price = 0 } = req.body;
      const instructor_id = req.user.userId;

      const result = await pool.query(
        "INSERT INTO courses (title, description, instructor_id, category_id, price) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [title, description, instructor_id, category_id, price]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update course (your existing PUT route with the fix from earlier)
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        category_id,
        price,
        is_published,
        is_approved,
      } = req.body;

      // Build dynamic update query based on provided fields
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(title);
        paramIndex++;
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(description);
        paramIndex++;
      }
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex}`);
        updateValues.push(category_id);
        paramIndex++;
      }
      if (price !== undefined) {
        updateFields.push(`price = $${paramIndex}`);
        updateValues.push(price);
        paramIndex++;
      }
      if (is_published !== undefined) {
        updateFields.push(`is_published = $${paramIndex}`);
        updateValues.push(is_published);
        paramIndex++;
      }
      if (is_approved !== undefined) {
        updateFields.push(`is_approved = $${paramIndex}`);
        updateValues.push(is_approved);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `UPDATE courses SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`;

      console.log("Update query:", query);
      console.log("Update values:", updateValues);

      const result = await pool.query(query, updateValues);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Server error: " + error.message });
    }
  }
);

// Delete course
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM courses WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
