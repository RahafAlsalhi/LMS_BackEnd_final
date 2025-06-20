// backend/models/courses.model.js
import { pool } from "../config/database.js";

export const CoursesModel = {
  // Get all categories
  async getAllCategories() {
    const result = await pool.query("SELECT * FROM categories ORDER BY name");
    return result.rows;
  },

  // Get instructor's own courses
  async getInstructorCourses(instructorId) {
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
    return result.rows;
  },

  // Get all courses for admin
  async getAllCoursesForAdmin() {
    const result = await pool.query(`
    SELECT 
      c.*, 
      u.name as instructor_name, 
      cat.name as category_name,
      COALESCE(e.enrollment_count, 0) as enrollments_count,
      CASE 
        WHEN c.is_approved IS NULL THEN 'pending'
        WHEN c.is_approved = true THEN 'approved'
        WHEN c.is_approved = false THEN 'rejected'
      END as approval_status
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
    return result.rows;
  },

  // Get published courses for students
  async getPublishedCourses() {
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
    return result.rows;
  },

  // Get all courses (public, published and approved only)
  async getAllPublicCourses() {
    const result = await pool.query(`
      SELECT c.*, u.name as instructor_name, cat.name as category_name 
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.is_published = true AND c.is_approved = true
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  },

  // Get course by ID
  async getCourseById(id) {
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
    return result.rows[0];
  },

  // Create course
  async createCourse(title, description, instructorId, categoryId, price) {
    const result = await pool.query(
      "INSERT INTO courses (title, description, instructor_id, category_id, price) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, description, instructorId, categoryId, price]
    );
    return result.rows[0];
  },

  // Update course with dynamic fields
  async updateCourse(id, updateFields, updateValues) {
    const query = `UPDATE courses SET ${updateFields.join(", ")} WHERE id = $${
      updateFields.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...updateValues, id]);
    return result.rows[0];
  },

  // Delete course
  async deleteCourse(id) {
    const result = await pool.query(
      "DELETE FROM courses WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows[0];
  },
};
