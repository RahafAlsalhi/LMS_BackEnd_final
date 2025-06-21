// backend/controllers/enrollments.controller.js
import { EnrollmentsModel } from "../models/enrollments.model.js";
import { pool } from "../config/database.js";
export const EnrollmentsController = {
  // Enroll in course
  async enrollInCourse(req, res) {
    try {
      const { course_id } = req.body;
      const user_id = req.user.userId;

      const enrollment = await EnrollmentsModel.enrollInCourse(
        user_id,
        course_id
      );

      res.status(201).json(enrollment);
    } catch (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return res
          .status(400)
          .json({ message: "Already enrolled in this course" });
      }
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get user enrollments
  async getUserEnrollments(req, res) {
    try {
      const user_id = req.user.userId;

      const enrollments = await EnrollmentsModel.getUserEnrollments(user_id);

      res.json(enrollments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // 🆕 Get course enrollments with detailed student information (Instructor Only)
  async getCourseEnrollments(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.userId;

      // First verify that the instructor owns this course
      const courseCheckResult = await pool.query(
        `SELECT instructor_id FROM courses WHERE id = $1`,
        [courseId]
      );

      if (courseCheckResult.rows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (courseCheckResult.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({
          error:
            "Access denied. You can only view enrollments for your own courses.",
        });
      }

      // Use the model to get enrollments
      const enrollments = await EnrollmentsModel.getCourseEnrollments(courseId);

      res.json({
        success: true,
        data: enrollments,
        total: enrollments.length,
      });
    } catch (error) {
      console.error("Error fetching course enrollments:", error);
      res.status(500).json({
        error: "Failed to fetch course enrollments",
        details: error.message,
      });
    }
  },

  // 🆕 Get detailed course enrollments with progress and performance data
  async getCourseEnrollmentsWithDetails(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.userId;

      // Verify instructor owns the course
      const courseCheckResult = await pool.query(
        `SELECT instructor_id FROM courses WHERE id = $1`,
        [courseId]
      );

      if (courseCheckResult.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (courseCheckResult.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({
          message: "Access denied. You can only view your own course data.",
        });
      }

      const enrollments =
        await EnrollmentsModel.getCourseEnrollmentsWithDetails(courseId);

      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching detailed enrollments:", error);
      res.status(500).json({
        message: "Failed to fetch detailed enrollment data",
        error: error.message,
      });
    }
  },

  // 🆕 Get comprehensive course analytics
  async getCourseAnalytics(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.userId;

      // Verify instructor owns the course
      const courseCheckResult = await pool.query(
        `SELECT instructor_id FROM courses WHERE id = $1`,
        [courseId]
      );

      if (courseCheckResult.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (courseCheckResult.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({
          message:
            "Access denied. You can only view your own course analytics.",
        });
      }

      const analytics = await EnrollmentsModel.getCourseAnalytics(courseId);

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching course analytics:", error);
      res.status(500).json({
        message: "Failed to fetch course analytics",
        error: error.message,
      });
    }
  },

  // 🆕 Get ungraded submissions for a course
  async getUngradedSubmissions(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.userId;

      // Verify instructor owns the course
      const courseCheckResult = await pool.query(
        `SELECT instructor_id FROM courses WHERE id = $1`,
        [courseId]
      );

      if (courseCheckResult.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (courseCheckResult.rows[0].instructor_id !== instructorId) {
        return res.status(403).json({
          message:
            "Access denied. You can only view your own course submissions.",
        });
      }

      const ungradedSubmissions = await EnrollmentsModel.getUngradedSubmissions(
        courseId
      );

      res.json(ungradedSubmissions);
    } catch (error) {
      console.error("Error fetching ungraded submissions:", error);
      res.status(500).json({
        message: "Failed to fetch ungraded submissions",
        error: error.message,
      });
    }
  },

  // Get admin statistics
  async getAdminStats(req, res) {
    try {
      const stats = await EnrollmentsModel.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
