// backend/models/modules.model.js
import { pool } from "../config/database.js";

export const ModulesModel = {
  // Get all modules for a course with lesson count and total duration
  async getModulesByCourse(courseId) {
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
    return result.rows;
  },

  // Get module by ID
  async getModuleById(id) {
    const result = await pool.query("SELECT * FROM modules WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },

  // Get lessons for a module
  async getLessonsByModule(moduleId) {
    const result = await pool.query(
      `
      SELECT * FROM lessons 
      WHERE module_id = $1 
      ORDER BY order_index ASC
    `,
      [moduleId]
    );
    return result.rows;
  },

  // Get next order index for a course
  async getNextOrderIndex(courseId) {
    const result = await pool.query(
      "SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM modules WHERE course_id = $1",
      [courseId]
    );
    return result.rows[0].next_order;
  },

  // Create new module
  async createModule(moduleData) {
    const { courseId, title, description, orderIndex } = moduleData;

    const result = await pool.query(
      "INSERT INTO modules (course_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
      [courseId, title, description, orderIndex]
    );
    return result.rows[0];
  },

  // Update module
  async updateModule(id, moduleData) {
    const { title, description, orderIndex } = moduleData;

    const result = await pool.query(
      "UPDATE modules SET title = $1, description = $2, order_index = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [title, description, orderIndex, id]
    );
    return result.rows[0];
  },

  // Delete module
  async deleteModule(id) {
    const result = await pool.query(
      "DELETE FROM modules WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows[0];
  },
};
