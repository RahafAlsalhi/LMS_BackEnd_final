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

  // Get course with complete structure - ULTRA SAFE VERSION
  async getCourseWithFullStructure(courseId) {
    try {
      console.log("Fetching course with full structure for ID:", courseId);

      // First get the basic course info
      const courseResult = await pool.query(
        `
        SELECT 
          c.*,
          cat.name as category_name,
          u.name as instructor_name
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.id = $1
        `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error("Course not found");
      }

      const course = courseResult.rows[0];

      // Check if modules table exists and get modules
      try {
        const modulesResult = await pool.query(
          `
          SELECT id, title, description, order_index
          FROM modules 
          WHERE course_id = $1 
          ORDER BY COALESCE(order_index, 0) ASC, id ASC
          `,
          [courseId]
        );

        course.modules = modulesResult.rows;
        console.log(`✅ Found ${course.modules.length} modules`);
      } catch (error) {
        console.log(
          "⚠️ Modules table might not exist or have different structure:",
          error.message
        );
        course.modules = [];
      }

      // For each module, get its lessons
      for (let module of course.modules) {
        try {
          const lessonsResult = await pool.query(
            `
            SELECT 
              id, 
              title, 
              content_type, 
              content_url, 
              content_text, 
              duration, 
              order_index
            FROM lessons 
            WHERE module_id = $1 
            ORDER BY COALESCE(order_index, 0) ASC, id ASC
            `,
            [module.id]
          );

          module.lessons = lessonsResult.rows;
          console.log(
            `✅ Found ${module.lessons.length} lessons for module: ${module.title}`
          );
        } catch (error) {
          console.log(
            `⚠️ Error fetching lessons for module ${module.title}:`,
            error.message
          );
          module.lessons = [];
        }

        // For each lesson, get its assignments and quizzes
        for (let lesson of module.lessons) {
          // Get assignments - safe version
          try {
            const assignmentsResult = await pool.query(
              `
              SELECT id, title, description, deadline, max_points
              FROM assignments 
              WHERE lesson_id = $1 
              ORDER BY id ASC
              `,
              [lesson.id]
            );

            lesson.assignments = assignmentsResult.rows || [];
          } catch (error) {
            console.log(
              `⚠️ Error fetching assignments for lesson ${lesson.title}:`,
              error.message
            );
            lesson.assignments = [];
          }

          // Get quizzes - safe version
          try {
            const quizzesResult = await pool.query(
              `
              SELECT id, question, options, correct_answer, points
              FROM quizzes 
              WHERE lesson_id = $1 
              ORDER BY id ASC
              `,
              [lesson.id]
            );

            lesson.quizzes = quizzesResult.rows || [];
          } catch (error) {
            console.log(
              `⚠️ Error fetching quizzes for lesson ${lesson.title}:`,
              error.message
            );
            lesson.quizzes = [];
          }
        }
      }

      console.log("✅ Course structure loaded successfully:", {
        courseId: course.id,
        title: course.title,
        modulesCount: course.modules.length,
        lessonsCount: course.modules.reduce(
          (total, module) => total + (module.lessons?.length || 0),
          0
        ),
      });

      return course;
    } catch (error) {
      console.error("❌ Error in getCourseWithFullStructure:", error);
      throw error;
    }
  },
};
