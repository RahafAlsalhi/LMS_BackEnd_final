// backend/controllers/courses.controller.js
import { CoursesModel } from "../models/courses.model.js";
import { EnrollmentsModel } from "../models/enrollments.model.js";

import { pool } from "../config/database.js";

export const CoursesController = {
  // Get categories (specific route)
  async getAllCategories(req, res) {
    try {
      const categories = await CoursesModel.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get instructor's own courses (specific route)
  async getInstructorCourses(req, res) {
    try {
      const instructorId = req.user.userId;
      const courses = await CoursesModel.getInstructorCourses(instructorId);
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all courses for admin (specific route)
  async getAllCoursesForAdmin(req, res) {
    try {
      const courses = await CoursesModel.getAllCoursesForAdmin();
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get published courses for students (specific route)
  async getPublishedCourses(req, res) {
    try {
      const courses = await CoursesModel.getPublishedCourses();
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all courses (public, published and approved only)
  async getAllPublicCourses(req, res) {
    try {
      const courses = await CoursesModel.getAllPublicCourses();
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get course by ID (parameterized route)
  async getCourseById(req, res) {
    try {
      const { id } = req.params;
      const course = await CoursesModel.getCourseById(id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Create course (Instructor only)
  async createCourse(req, res) {
    try {
      const { title, description, category_id, price = 0 } = req.body;
      const instructor_id = req.user.userId;

      const course = await CoursesModel.createCourse(
        title,
        description,
        instructor_id,
        category_id,
        price
      );

      res.status(201).json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update course
  async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        category_id,
        price,
        is_published,
        is_approved,
      } = req.body;

      console.log("Updating course:", id);
      console.log("Update data:", req.body);
      console.log(
        "is_approved value:",
        is_approved,
        "type:",
        typeof is_approved
      );

      // SPECIAL CASE: If rejecting course (is_approved = false), delete it instead
      if (is_approved === false || is_approved === "false") {
        console.log("Rejecting course - will delete it");

        // First get course details for logging
        const courseResult = await pool.query(
          `SELECT c.*, u.name as instructor_name 
         FROM courses c 
         LEFT JOIN users u ON c.instructor_id = u.id 
         WHERE c.id = $1::uuid`,
          [id]
        );

        if (courseResult.rows.length === 0) {
          return res.status(404).json({ message: "Course not found" });
        }

        const course = courseResult.rows[0];

        // Delete the course using the existing model method
        const deletedCourse = await CoursesModel.deleteCourse(id);

        if (!deletedCourse) {
          return res.status(404).json({ message: "Course not found" });
        }

        console.log(
          `Course "${course.title}" by ${course.instructor_name} has been rejected and deleted`
        );

        return res.json({
          success: true,
          message: `Course "${course.title}" has been rejected and deleted`,
          action: "deleted",
          deleted_course: course,
        });
      }

      // Normal update flow for other fields (approval or other updates)
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(title);
        paramIndex++;
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(description);
        paramIndex++;
      }
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex}::uuid`);
        updateValues.push(category_id);
        paramIndex++;
      }
      if (price !== undefined) {
        updateFields.push(`price = $${paramIndex}`);
        updateValues.push(parseFloat(price));
        paramIndex++;
      }
      if (is_published !== undefined) {
        updateFields.push(`is_published = $${paramIndex}`);
        updateValues.push(Boolean(is_published));
        paramIndex++;
      }

      // Handle approval (only for true values now, since false = delete)
      if (is_approved === true || is_approved === "true") {
        updateFields.push(`is_approved = $${paramIndex}`);
        updateValues.push(true);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add the WHERE clause parameter
      updateValues.push(id);
      const whereParamIndex = updateValues.length;

      const updateQuery = `
      UPDATE courses 
      SET ${updateFields.join(", ")} 
      WHERE id = $${whereParamIndex}::uuid 
      RETURNING *
    `;

      console.log("Update query:", updateQuery);
      console.log("Update values:", updateValues);

      // Execute the query
      const result = await pool.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      const updatedCourse = result.rows[0];
      console.log("Updated course:", updatedCourse);

      res.json({
        success: true,
        action: "updated",
        course: updatedCourse,
      });
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Server error: " + error.message });
    }
  },

  // Delete course
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      const instructorId = req.user.userId;
      const userRole = req.user.role;

      console.log("🗑️ Delete course request:", {
        courseId: id,
        instructorId: instructorId,
        userRole: userRole,
      });

      // First, verify the course exists and get course details
      const course = await CoursesModel.getCourseById(id);

      if (!course) {
        console.log("❌ Course not found:", id);
        return res.status(404).json({ message: "Course not found" });
      }

      // Verify authorization: instructor can only delete their own courses, admin can delete any
      if (userRole !== "admin" && course.instructor_id !== instructorId) {
        console.log("❌ Unauthorized delete attempt:", {
          courseInstructorId: course.instructor_id,
          requestingUserId: instructorId,
        });
        return res.status(403).json({
          message: "Access denied. You can only delete your own courses.",
        });
      }

      console.log("✅ Authorization passed, deleting course:", course.title);

      // Delete the course
      const deletedCourse = await CoursesModel.deleteCourse(id);

      if (!deletedCourse) {
        console.log("❌ Course deletion failed for ID:", id);
        return res
          .status(404)
          .json({ message: "Course not found or already deleted" });
      }

      console.log("✅ Course successfully deleted:", {
        courseId: id,
        courseTitle: course.title,
        deletedBy: instructorId,
      });

      res.json({
        success: true,
        message: "Course deleted successfully",
        deletedCourse: {
          id: deletedCourse.id,
          title: course.title,
        },
      });
    } catch (error) {
      console.error("❌ Error deleting course:", error);

      // Handle specific database errors
      if (error.code === "23503") {
        return res.status(400).json({
          message:
            "Cannot delete course. Please remove all related enrollments and content first.",
        });
      }

      res.status(500).json({
        message: "Server error during course deletion",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Get comprehensive course details for instructor
  async getCourseDetailsForInstructor(req, res) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.userId;

      // Verify instructor owns this course
      const course = await CoursesModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.instructor_id !== instructorId && req.user.role !== "admin") {
        return res.status(403).json({
          message:
            "Access denied. You can only view details for your own courses.",
        });
      }

      // Get comprehensive data
      const [enrollments, analytics, ungradedSubmissions] = await Promise.all([
        EnrollmentsModel.getCourseEnrollmentsWithDetails(courseId),
        EnrollmentsModel.getCourseAnalytics(courseId),
        EnrollmentsModel.getUngradedSubmissions(courseId),
      ]);

      res.json({
        success: true,
        course,
        enrollments,
        analytics,
        ungradedSubmissions,
        summary: {
          total_students: enrollments.length,
          active_students: enrollments.filter((e) => e.status === "active")
            .length,
          completed_students: enrollments.filter(
            (e) => e.status === "completed"
          ).length,
          pending_grades: ungradedSubmissions.length,
        },
      });
    } catch (error) {
      console.error("Error fetching course details:", error);
      res.status(500).json({
        message: "Failed to fetch course details",
        error: error.message,
      });
    }
  },
  // Get course details with all modules, lessons, assignments, and quizzes for editing
  // Replace your getCourseEditDetails method in courses.controller.js with this debug version
  async getCourseEditDetails(req, res) {
    try {
      const { id } = req.params;
      const instructorId = req.user.userId;

      console.log("🔍 Getting course edit details for:", id);
      console.log("🔍 Instructor ID:", instructorId);

      // Verify instructor owns this course (unless admin)
      console.log("🔍 Step 1: Getting basic course info...");
      const course = await CoursesModel.getCourseById(id);
      if (!course) {
        console.log("❌ Course not found");
        return res.status(404).json({ message: "Course not found" });
      }
      console.log("✅ Basic course found:", course.title);

      if (course.instructor_id !== instructorId && req.user.role !== "admin") {
        console.log("❌ Access denied");
        return res.status(403).json({
          message: "Access denied. You can only edit your own courses.",
        });
      }
      console.log("✅ Authorization passed");

      // Get course with full structure
      console.log("🔍 Step 2: Getting course with full structure...");
      try {
        const courseWithStructure =
          await CoursesModel.getCourseWithFullStructure(id);
        console.log(
          "✅ Course structure loaded successfully:",
          courseWithStructure?.title
        );

        res.json({
          success: true,
          course: courseWithStructure,
        });
      } catch (structureError) {
        console.error(
          "❌ Error in getCourseWithFullStructure:",
          structureError
        );
        console.error("❌ Error message:", structureError.message);
        console.error("❌ Error stack:", structureError.stack);

        // Return the basic course info if full structure fails
        console.log("🔧 Falling back to basic course info...");
        res.json({
          success: true,
          course: course,
          warning: "Full course structure could not be loaded",
          error: structureError.message,
        });
      }
    } catch (error) {
      console.error("❌ Error in getCourseEditDetails:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        message: "Failed to fetch course details for editing",
        error: error.message,
      });
    }
  },
};
