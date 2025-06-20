// backend/models/authmodel.js
import { pool } from "../config/database.js";

export const userModel = {
  // Check if user exists by email
  async findByEmail(email) {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows;
  },

  // Get user with password for login
  async findByEmailWithPassword(email) {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, is_active, is_approved FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0];
  },

  // Create new user
  async create(userData) {
    const { name, email, hashedPassword, role, isApproved } = userData;
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, is_approved",
      [name, email, hashedPassword, role, isApproved]
    );
    return result.rows[0];
  },

  // Get user by ID
  async findById(userId) {
    const result = await pool.query(
      "SELECT id, name, email, role, avatar_url, is_active FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );
    return result.rows[0];
  },
  async updatePasswordByEmail(email, hashedPassword) {
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email",
      [hashedPassword, email]
    );
    return result.rows[0];
  },
};
