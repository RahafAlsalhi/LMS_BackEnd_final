// backend/models/assignments.model.js
import { pool } from "../config/database.js";

export const AssignmentsModel = {
  // Create assignment (Instructor)
  async createAssignment(lessonId, title, description, deadline, maxPoints) {
    const result = await pool.query(
      `INSERT INTO assignments (lesson_id, title, description, deadline, max_points) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lessonId, title, description, deadline, maxPoints]
    );
    return result.rows[0];
  },

  // Get assignment by ID
  async getAssignmentById(id) {
    const result = await pool.query("SELECT * FROM assignments WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },

  // Get assignments by lesson
  async getAssignmentsByLesson(lessonId) {
    const result = await pool.query(
      "SELECT * FROM assignments WHERE lesson_id = $1 ORDER BY created_at",
      [lessonId]
    );
    return result.rows;
  },

  // Update assignment (Instructor)
  async updateAssignment(id, title, description, deadline, maxPoints) {
    const result = await pool.query(
      `UPDATE assignments 
       SET title = $2, description = $3, deadline = $4, max_points = $5 
       WHERE id = $1 RETURNING *`,
      [id, title, description, deadline, maxPoints]
    );
    return result.rows[0];
  },

  // Delete assignment (Instructor)
  async deleteAssignment(id) {
    const result = await pool.query(
      "DELETE FROM assignments WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  },
};
