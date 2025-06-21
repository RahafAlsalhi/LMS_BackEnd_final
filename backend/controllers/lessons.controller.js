// backend/controllers/lessons.controller.js
import { LessonsModel } from "../models/lessons.model.js";

export const LessonsController = {
  // Create new lesson with file upload support
  async createLesson(req, res) {
    try {
      const { module_id, title, content_type, content_text, duration } =
        req.body;

      console.log("📝 Creating lesson with data:", {
        module_id,
        title,
        content_type,
        content_text,
        duration,
      });

      if (!module_id || !title || !content_type) {
        return res.status(400).json({
          message: "Module ID, title, and content type are required",
        });
      }

      // Handle uploaded video file
      let content_url = null;
      if (req.file) {
        content_url = req.file.filename; // Save just the filename
        console.log("📹 Video uploaded:", req.file.filename);
        console.log("📁 Full path:", req.file.path);
      }

      // Get the next order index
      const orderIndex = await LessonsModel.getNextOrderIndex(module_id);

      const lessonData = {
        moduleId: module_id,
        title,
        contentType: content_type,
        contentUrl: content_url, // This will now have the video filename
        contentText: content_text,
        duration: parseInt(duration) || 0,
        orderIndex,
      };

      console.log("💾 Saving lesson with data:", lessonData);

      const lesson = await LessonsModel.createLesson(lessonData);

      console.log("✅ Lesson created successfully:", lesson);

      res.status(201).json(lesson);
    } catch (error) {
      console.error("❌ Error creating lesson:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Update lesson
  async updateLesson(req, res) {
    try {
      const { id } = req.params;
      const { title, content_type, content_text, duration, order_index } =
        req.body;

      // Handle uploaded video file
      let content_url = null;
      if (req.file) {
        content_url = req.file.filename;
      }

      const lessonData = {
        title,
        contentType: content_type,
        contentUrl: content_url,
        contentText: content_text,
        duration: parseInt(duration) || 0,
        orderIndex: order_index,
      };

      const lesson = await LessonsModel.updateLesson(id, lessonData);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      res.json(lesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete lesson
  async deleteLesson(req, res) {
    try {
      const { id } = req.params;
      const lesson = await LessonsModel.deleteLesson(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      res.json({ message: "Lesson deleted successfully" });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get lesson by ID
  async getLessonById(req, res) {
    try {
      const { id } = req.params;
      const lesson = await LessonsModel.getLessonById(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Mark lesson as complete
  async markLessonComplete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Check if lesson exists
      const lessonExists = await LessonsModel.checkLessonExists(id);
      if (!lessonExists) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      const completion = await LessonsModel.markLessonComplete(id, userId);

      res.json({
        message: "Lesson marked as complete",
        completion,
      });
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get progress for a course
  async getCourseProgress(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;

      const progress = await LessonsModel.getLessonProgressByCourse(
        courseId,
        userId
      );

      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
