// backend/models/categories.model.js
import { pool } from "../config/database.js";

export const CategoriesModel = {
  // Get all categories with course count
  async getAllCategories() {
    const result = await pool.query(`
      SELECT c.*, COUNT(co.id) as course_count
      FROM categories c
      LEFT JOIN courses co ON c.id = co.category_id AND co.is_published = true AND co.is_approved = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return result.rows;
  },

  // Get category by ID
  async getCategoryById(id) {
    const result = await pool.query("SELECT * FROM categories WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },

  // Check if category exists by name
  async findCategoryByName(name) {
    const result = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );
    return result.rows[0];
  },

  // Check if category exists by name excluding specific ID
  async findCategoryByNameExcludingId(name, id) {
    const result = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id]
    );
    return result.rows[0];
  },

  // Create new category
  async createCategory(name, description) {
    const result = await pool.query(
      "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *",
      [name.trim(), description?.trim() || null]
    );
    return result.rows[0];
  },

  // Update category
  async updateCategory(id, name, description) {
    const result = await pool.query(
      "UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *",
      [name.trim(), description?.trim() || null, id]
    );
    return result.rows[0];
  },

  // Get courses count in category
  async getCoursesCountInCategory(id) {
    const result = await pool.query(
      "SELECT COUNT(*) FROM courses WHERE category_id = $1",
      [id]
    );
    return parseInt(result.rows[0].count);
  },

  // Delete category
  async deleteCategory(id) {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING name",
      [id]
    );
    return result.rows[0];
  },
};
