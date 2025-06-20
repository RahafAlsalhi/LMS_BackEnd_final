// backend/routes/users.js - Enhanced with approval system
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

// Get all users (Admin only)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, role, is_active, is_approved, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get pending instructor approvals (Admin only)
router.get(
  "/pending-instructors",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE role = 'instructor' AND (is_approved = false OR is_approved IS NULL)
      ORDER BY created_at DESC
    `);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Approve/reject instructor (Admin only)
router.put(
  "/:id/approval",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_approved } = req.body;

      if (is_approved === false) {
        // If rejecting, delete the user account entirely
        const result = await pool.query(
          "DELETE FROM users WHERE id = $1 AND role = $2 RETURNING name, email",
          [id, "instructor"]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        res.json({
          message: `Instructor application rejected and account removed`,
          user: result.rows[0],
        });
      } else {
        // If approving, set is_approved = true
        const result = await pool.query(
          "UPDATE users SET is_approved = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = $3 RETURNING id, name, email, is_approved",
          [is_approved, id, "instructor"]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        res.json({
          message: `Instructor approved successfully`,
          user: result.rows[0],
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update user status (Admin only)
router.put(
  "/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const result = await pool.query(
        "UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, is_active",
        [is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: `User ${is_active ? "activated" : "deactivated"} successfully`,
        user: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
