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

// Get all categories (Public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(co.id) as course_count
      FROM categories c
      LEFT JOIN courses co ON c.id = co.category_id AND co.is_published = true AND co.is_approved = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get category by ID (Public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM categories WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create category (Admin only)
router.post("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Category name must be at least 2 characters" });
    }

    // Check if category already exists
    const existingCategory = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const result = await pool.query(
      "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *",
      [name.trim(), description?.trim() || null]
    );

    res.status(201).json({
      message: "Category created successfully",
      category: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update category (Admin only)
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || name.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Category name must be at least 2 characters" });
      }

      // Check if another category has the same name
      const existingCategory = await pool.query(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2",
        [name.trim(), id]
      );
      if (existingCategory.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "Category name already exists" });
      }

      const result = await pool.query(
        "UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *",
        [name.trim(), description?.trim() || null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: "Category updated successfully",
        category: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete category (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if category has courses
      const coursesInCategory = await pool.query(
        "SELECT COUNT(*) FROM courses WHERE category_id = $1",
        [id]
      );
      if (parseInt(coursesInCategory.rows[0].count) > 0) {
        return res.status(400).json({
          message: `Cannot delete category. It has ${coursesInCategory.rows[0].count} courses. Move or delete the courses first.`,
        });
      }

      const result = await pool.query(
        "DELETE FROM categories WHERE id = $1 RETURNING name",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: `Category "${result.rows[0].name}" deleted successfully`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
