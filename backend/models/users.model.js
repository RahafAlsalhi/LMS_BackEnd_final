// backend/models/users.model.js
import { pool } from "../config/database.js";

export const UsersModel = {
  // Get all users
  async getAllUsers() {
    const result = await pool.query(`
      SELECT id, name, email, role, is_active, is_approved, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    return result.rows;
  },

  // Get pending instructor approvals
  async getPendingInstructors() {
    const result = await pool.query(`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE role = 'instructor' AND (is_approved = false OR is_approved IS NULL)
      ORDER BY created_at DESC
    `);
    return result.rows;
  },

  // Delete instructor (for rejection)
  async deleteInstructor(id) {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role = $2 RETURNING name, email",
      [id, "instructor"]
    );
    return result.rows[0];
  },

  // Approve instructor
  async approveInstructor(id, isApproved) {
    const result = await pool.query(
      "UPDATE users SET is_approved = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = $3 RETURNING id, name, email, is_approved",
      [isApproved, id, "instructor"]
    );
    return result.rows[0];
  },

  // Update user status
  async updateUserStatus(id, isActive) {
    const result = await pool.query(
      "UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, is_active",
      [isActive, id]
    );
    return result.rows[0];
  },
  // Update user details
  async updateUser(id, userData) {
    const { name, email, role } = userData;
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, is_active, is_approved",
      [name, email, role, id]
    );
    return result.rows[0];
  },
  async deleteUser(id) {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, name, email, role",
      [id]
    );
    return result.rows[0];
  },
};
