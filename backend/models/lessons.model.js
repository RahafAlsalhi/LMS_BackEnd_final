// backend/models/lessons.model.js
import { pool } from "../config/database.js";

export const LessonsModel = {
  // Get lesson by ID with module information
  async getLessonById(id) {
    const result = await pool.query(
      `
      SELECT l.*, m.title as module_title, m.course_id
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE l.id = $1
    `,
      [id]
    );
    return result.rows[0];
  },

  // Get next order index for a module
  async getNextOrderIndex(moduleId) {
    const result = await pool.query(
      "SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM lessons WHERE module_id = $1",
      [moduleId]
    );
    return result.rows[0].next_order;
  },

  // Create new lesson - THIS WAS MISSING!
  async createLesson(lessonData) {
    const {
      moduleId,
      title,
      contentType,
      contentUrl,
      contentText,
      duration,
      orderIndex,
    } = lessonData;

    const result = await pool.query(
      `INSERT INTO lessons (module_id, title, content_type, content_url, content_text, duration, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        moduleId,
        title,
        contentType,
        contentUrl,
        contentText,
        duration,
        orderIndex,
      ]
    );
    return result.rows[0];
  },

  // Update lesson
  async updateLesson(id, lessonData) {
    const {
      title,
      contentType,
      contentUrl,
      contentText,
      duration,
      orderIndex,
    } = lessonData;
    const result = await pool.query(
      "UPDATE lessons SET title = $1, content_type = $2, content_url = $3, content_text = $4, duration = $5, order_index = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *",
      [title, contentType, contentUrl, contentText, duration, orderIndex, id]
    );
    return result.rows[0];
  },

  // Delete lesson
  async deleteLesson(id) {
    const result = await pool.query(
      "DELETE FROM lessons WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows[0];
  },

  // Check if lesson exists
  async checkLessonExists(id) {
    const result = await pool.query("SELECT id FROM lessons WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },

  // Mark lesson as completed (upsert operation)
  async markLessonComplete(lessonId, userId) {
    const result = await pool.query(
      `
      INSERT INTO lesson_completions (lesson_id, user_id, completed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (lesson_id, user_id)
      DO UPDATE SET completed_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [lessonId, userId]
    );
    return result.rows[0];
  },

  // Get lesson progress by course
  async getLessonProgressByCourse(courseId, userId) {
    const result = await pool.query(
      `
    SELECT lc.lesson_id, lc.completed_at
    FROM lesson_completions lc
    JOIN lessons l ON lc.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = $1 AND lc.user_id = $2
    ORDER BY lc.completed_at DESC
    `,
      [courseId, userId]
    );
    return result.rows;
  },
};
