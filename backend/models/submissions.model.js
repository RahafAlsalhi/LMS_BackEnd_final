// backend/models/submissions.model.js - FINAL CORRECTED VERSION
import { pool } from "../config/database.js";

export const SubmissionsModel = {
  // Submit assignment (Student - upsert operation)
  async submitAssignment(assignmentId, userId, submissionText, submissionUrl) {
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, user_id, submission_text, submission_url) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (assignment_id, user_id) 
       DO UPDATE SET 
         submission_text = $3, 
         submission_url = $4, 
         submitted_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [assignmentId, userId, submissionText, submissionUrl]
    );
    return result.rows[0];
  },

  // Get submission by assignment and user
  async getSubmission(assignmentId, userId) {
    const result = await pool.query(
      `SELECT s.*, a.title as assignment_title, a.max_points, a.deadline,
            COALESCE(u.name, u.email) as student_name,
            u.email as student_email
     FROM submissions s
     JOIN assignments a ON s.assignment_id = a.id
     JOIN users u ON s.user_id = u.id
     WHERE s.assignment_id = $1 AND s.user_id = $2`,
      [assignmentId, userId]
    );
    return result.rows[0];
  },

  // Get all submissions for an assignment (Instructor)
  async getSubmissionsByAssignment(assignmentId) {
    const result = await pool.query(
      `SELECT s.*, 
            COALESCE(u.name, u.email) as student_name,
            COALESCE(grader.name, grader.email) as grader_name,
            u.email as student_email
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN users grader ON s.graded_by = grader.id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );
    return result.rows;
  },

  // Get student's submissions for a course/lesson
  async getStudentSubmissions(userId, lessonId = null) {
    let query = `
      SELECT s.*, a.title as assignment_title, a.max_points, a.deadline,
             l.title as lesson_title, c.title as course_title
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE s.user_id = $1
    `;

    const params = [userId];

    if (lessonId) {
      query += " AND a.lesson_id = $2";
      params.push(lessonId);
    }

    query += " ORDER BY s.submitted_at DESC";

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Grade assignment submission (Instructor)
  async gradeSubmission(assignmentId, userId, grade, feedback, gradedBy) {
    const result = await pool.query(
      `UPDATE submissions 
       SET grade = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP 
       WHERE assignment_id = $4 AND user_id = $5 
       RETURNING *`,
      [grade, feedback, gradedBy, assignmentId, userId]
    );
    return result.rows[0];
  },

  // Check if student has submitted assignment
  async hasSubmitted(assignmentId, userId) {
    const result = await pool.query(
      "SELECT id FROM submissions WHERE assignment_id = $1 AND user_id = $2",
      [assignmentId, userId]
    );
    return result.rows.length > 0;
  },

  // Get submission statistics for assignment (Instructor)
  async getSubmissionStats(assignmentId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_submissions,
         COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_count,
         AVG(grade) as average_grade,
         MAX(grade) as highest_grade,
         MIN(grade) as lowest_grade
       FROM submissions 
       WHERE assignment_id = $1`,
      [assignmentId]
    );
    return result.rows[0];
  },
};
