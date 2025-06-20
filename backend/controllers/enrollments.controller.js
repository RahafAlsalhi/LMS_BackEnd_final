// backend/controllers/enrollments.controller.js
import { EnrollmentsModel } from "../models/enrollments.model.js";

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
  // Add this method to your EnrollmentsController class

  async getCourseEnrollments(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;

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
