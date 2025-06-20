// backend/controllers/modules.controller.js
import { ModulesModel } from "../models/modules.model.js";

export const ModulesController = {
  // Get all modules for a course
  async getModulesByCourse(req, res) {
    try {
      const { courseId } = req.params;

      const modules = await ModulesModel.getModulesByCourse(courseId);

      res.json(modules);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get module with lessons
  async getModuleById(req, res) {
    try {
      const { id } = req.params;

      // Get module details
      const module = await ModulesModel.getModuleById(id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get lessons for this module
      const lessons = await ModulesModel.getLessonsByModule(id);

      // Combine module with lessons
      module.lessons = lessons;

      res.json(module);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Get lessons for a module
  async getLessonsByModule(req, res) {
    try {
      const { id } = req.params;
      const lessons = await ModulesModel.getLessonsByModule(id);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Create new module (Instructor only)
  async createModule(req, res) {
    try {
      const { course_id, title, description } = req.body;

      if (!course_id || !title) {
        return res
          .status(400)
          .json({ message: "Course ID and title are required" });
      }

      // Get the next order index
      const orderIndex = await ModulesModel.getNextOrderIndex(course_id);

      const moduleData = {
        courseId: course_id,
        title,
        description,
        orderIndex,
      };

      const module = await ModulesModel.createModule(moduleData);

      res.status(201).json(module);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update module
  async updateModule(req, res) {
    try {
      const { id } = req.params;
      const { title, description, order_index } = req.body;

      const moduleData = {
        title,
        description,
        orderIndex: order_index,
      };

      const module = await ModulesModel.updateModule(id, moduleData);

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json(module);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete module
  async deleteModule(req, res) {
    try {
      const { id } = req.params;

      const deletedModule = await ModulesModel.deleteModule(id);

      if (!deletedModule) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
