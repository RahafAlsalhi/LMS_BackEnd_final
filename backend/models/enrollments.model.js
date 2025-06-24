// backend/models/enrollments.model.js
import { pool } from "../config/database.js";

export const EnrollmentsModel = {
  // Enroll user in course
  async enrollInCourse(userId, courseId) {
    const result = await pool.query(
      "INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *",
      [userId, courseId]
    );
    return result.rows[0];
  },

  // Get user enrollments with course and instructor details
  async getUserEnrollments(userId) {
    const result = await pool.query(
      `
      SELECT e.*, c.title, c.description, c.thumbnail_url, u.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `,
      [userId]
    );
    return result.rows;
  },

  // 🆕 Get all enrollments for a specific course (for instructor analytics)
  async getCourseEnrollments(courseId) {
    const result = await pool.query(
      `
      SELECT 
        e.id,
        e.enrolled_at,
        e.completed_at,
        e.progress,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        c.title as course_title,
        CASE 
          WHEN e.completed_at IS NOT NULL THEN 'completed'
          WHEN e.progress > 0 THEN 'active'
          ELSE 'enrolled'
        END as status
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at DESC
    `,
      [courseId]
    );

    return result.rows;
  },

  // 🆕 Get enrollment statistics for a course
  async getCourseEnrollmentStats(courseId) {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(completed_at) as completed_enrollments,
        AVG(progress) as average_progress
      FROM enrollments 
      WHERE course_id = $1
    `,
      [courseId]
    );

    const stats = result.rows[0];
    return {
      total_enrollments: parseInt(stats.total_enrollments),
      completed_enrollments: parseInt(stats.completed_enrollments),
      average_progress: Math.round(parseFloat(stats.average_progress) || 0),
      completion_rate:
        stats.total_enrollments > 0
          ? Math.round(
              (stats.completed_enrollments / stats.total_enrollments) * 100
            )
          : 0,
    };
  },
  // Get admin statistics
  async getAdminStats() {
    const result = await pool.query(
      `
    SELECT
      COUNT(*) as total_enrollments,
      COUNT(CASE WHEN completed_at IS NULL THEN 1 END) as active_enrollments,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_enrollments,
      COUNT(DISTINCT user_id) as enrolled_users,
      COUNT(DISTINCT course_id) as courses_with_enrollments,
      AVG(progress) as average_progress
    FROM enrollments
    `
    );

    const stats = result.rows[0];
    return {
      total_enrollments: parseInt(stats.total_enrollments),
      active_enrollments: parseInt(stats.active_enrollments),
      completed_enrollments: parseInt(stats.completed_enrollments),
      enrolled_users: parseInt(stats.enrolled_users),
      courses_with_enrollments: parseInt(stats.courses_with_enrollments),
      average_progress: Math.round(parseFloat(stats.average_progress) || 0),
    };
  },
  // Add these methods to your existing enrollments.model.js

  // Get detailed course enrollments with student progress
  async getCourseEnrollmentsWithDetails(courseId) {
    const result = await pool.query(
      `
    SELECT
      e.id as enrollment_id,
      e.enrolled_at,
      e.completed_at,
      e.progress,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.avatar_url,
      
      -- Lesson completion stats
      COALESCE(lc.completed_lessons, 0) as completed_lessons,
      COALESCE(total_lessons.total, 0) as total_lessons,
      
      -- Assignment stats
      COALESCE(assignment_stats.total_assignments, 0) as total_assignments,
      COALESCE(assignment_stats.submitted_assignments, 0) as submitted_assignments,
      COALESCE(assignment_stats.graded_assignments, 0) as graded_assignments,
      COALESCE(assignment_stats.avg_assignment_grade, 0) as avg_assignment_grade,
      
      -- Quiz stats
      COALESCE(quiz_stats.total_quizzes, 0) as total_quizzes,
      COALESCE(quiz_stats.attempted_quizzes, 0) as attempted_quizzes,
      COALESCE(quiz_stats.correct_answers, 0) as correct_answers,
      COALESCE(quiz_stats.quiz_score_percentage, 0) as quiz_score_percentage,
      
      CASE
        WHEN e.completed_at IS NOT NULL THEN 'completed'
        WHEN e.progress > 0 THEN 'active'
        ELSE 'enrolled'
      END as status

    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    
    -- Total lessons in course
    LEFT JOIN (
      SELECT m.course_id, COUNT(l.id) as total
      FROM modules m
      LEFT JOIN lessons l ON m.id = l.module_id
      WHERE m.course_id = $1
      GROUP BY m.course_id
    ) total_lessons ON total_lessons.course_id = $1
    
    -- Completed lessons by user
    LEFT JOIN (
      SELECT lc.user_id, COUNT(lc.lesson_id) as completed_lessons
      FROM lesson_completions lc
      JOIN lessons l ON lc.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
      GROUP BY lc.user_id
    ) lc ON lc.user_id = u.id
    
    -- Assignment statistics
    LEFT JOIN (
      SELECT 
        s.user_id,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(DISTINCT s.assignment_id) as submitted_assignments,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.assignment_id END) as graded_assignments,
        AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as avg_assignment_grade
      FROM assignments a
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      LEFT JOIN submissions s ON a.id = s.assignment_id
      WHERE m.course_id = $1
      GROUP BY s.user_id
    ) assignment_stats ON assignment_stats.user_id = u.id
    
    -- Quiz statistics
    LEFT JOIN (
      SELECT 
        qa.user_id,
        COUNT(DISTINCT q.id) as total_quizzes,
        COUNT(DISTINCT qa.quiz_id) as attempted_quizzes,
        COUNT(CASE WHEN qa.is_correct THEN 1 END) as correct_answers,
        CASE 
          WHEN COUNT(DISTINCT qa.quiz_id) > 0 
          THEN ROUND((COUNT(CASE WHEN qa.is_correct THEN 1 END)::float / COUNT(DISTINCT qa.quiz_id)) * 100)
          ELSE 0
        END as quiz_score_percentage
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      WHERE m.course_id = $1
      GROUP BY qa.user_id
    ) quiz_stats ON quiz_stats.user_id = u.id
    
    WHERE e.course_id = $1
    ORDER BY e.enrolled_at DESC
    `,
      [courseId]
    );
    return result.rows;
  },

  // Get comprehensive course analytics
  async getCourseAnalytics(courseId) {
    const result = await pool.query(
      `
    WITH course_stats AS (
      SELECT
        -- Enrollment stats
        COUNT(e.id) as total_enrollments,
        COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments,
        COUNT(CASE WHEN e.progress > 0 AND e.completed_at IS NULL THEN 1 END) as active_enrollments,
        AVG(e.progress) as avg_progress,
        
        -- Content stats
        (SELECT COUNT(*) FROM modules WHERE course_id = $1) as total_modules,
        (SELECT COUNT(l.*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1) as total_lessons,
        (SELECT COUNT(a.*) FROM assignments a JOIN lessons l ON a.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1) as total_assignments,
        (SELECT COUNT(q.*) FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1) as total_quizzes
        
      FROM enrollments e
      WHERE e.course_id = $1
    ),
    assignment_stats AS (
      SELECT
        COUNT(s.*) as total_submissions,
        COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
        AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as avg_grade,
        COUNT(CASE WHEN s.submitted_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_submissions
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    ),
    quiz_stats AS (
      SELECT
        COUNT(qa.*) as total_attempts,
        COUNT(CASE WHEN qa.is_correct THEN 1 END) as correct_attempts,
        COUNT(CASE WHEN qa.attempted_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_attempts
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN lessons l ON q.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    )
    SELECT * FROM course_stats, assignment_stats, quiz_stats
    `,
      [courseId]
    );

    const stats = result.rows[0];
    return {
      enrollments: {
        total: parseInt(stats.total_enrollments || 0),
        completed: parseInt(stats.completed_enrollments || 0),
        active: parseInt(stats.active_enrollments || 0),
        completion_rate:
          stats.total_enrollments > 0
            ? Math.round(
                (stats.completed_enrollments / stats.total_enrollments) * 100
              )
            : 0,
        avg_progress: Math.round(parseFloat(stats.avg_progress) || 0),
      },
      content: {
        modules: parseInt(stats.total_modules || 0),
        lessons: parseInt(stats.total_lessons || 0),
        assignments: parseInt(stats.total_assignments || 0),
        quizzes: parseInt(stats.total_quizzes || 0),
      },
      assignments: {
        total_submissions: parseInt(stats.total_submissions || 0),
        graded_submissions: parseInt(stats.graded_submissions || 0),
        pending_grading:
          parseInt(stats.total_submissions || 0) -
          parseInt(stats.graded_submissions || 0),
        avg_grade: Math.round(parseFloat(stats.avg_grade) || 0),
        recent_submissions: parseInt(stats.recent_submissions || 0),
      },
      quizzes: {
        total_attempts: parseInt(stats.total_attempts || 0),
        correct_attempts: parseInt(stats.correct_attempts || 0),
        accuracy_rate:
          stats.total_attempts > 0
            ? Math.round((stats.correct_attempts / stats.total_attempts) * 100)
            : 0,
        recent_attempts: parseInt(stats.recent_attempts || 0),
      },
    };
  },

  // Get ungraded submissions for a course
  async getUngradedSubmissions(courseId) {
    const result = await pool.query(
      `
    SELECT
      s.id as submission_id,
      s.assignment_id,
      s.user_id,
      s.submitted_at,
      s.submission_url,
      s.submission_text,
      u.name as student_name,
      u.email as student_email,
      a.title as assignment_title,
      a.max_points,
      l.title as lesson_title
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    JOIN assignments a ON s.assignment_id = a.id
    JOIN lessons l ON a.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = $1 AND s.grade IS NULL
    ORDER BY s.submitted_at ASC
    `,
      [courseId]
    );
    return result.rows;
  },
  // Get admin statistics
  async getAdminStats() {
    const result = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM enrollments) as total_enrollments,
         (SELECT COUNT(DISTINCT user_id) FROM enrollments) as unique_students,
         (SELECT COUNT(DISTINCT course_id) FROM enrollments) as courses_with_enrollments,
         (SELECT AVG(progress) FROM enrollments) as average_progress
      `
    );
    return result.rows[0];
  },
};
