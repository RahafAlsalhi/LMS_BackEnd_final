// backend/controllers/assignments.controller.js
import { AssignmentsModel } from "../models/assignments.model.js";

export const AssignmentsController = {
  // Create assignment (Instructor only)
  async createAssignment(req, res) {
    try {
      const { lesson_id, title, description, deadline, max_points } = req.body;

      const assignment = await AssignmentsModel.createAssignment(
        lesson_id,
        title,
        description,
        deadline,
        max_points || 100
      );

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  },

  // Get assignment by ID
  async getAssignment(req, res) {
    try {
      const { id } = req.params;
      const assignment = await AssignmentsModel.getAssignmentById(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get assignments by lesson
  async getAssignmentsByLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const assignments = await AssignmentsModel.getAssignmentsByLesson(
        lessonId
      );
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update assignment (Instructor only)
  async updateAssignment(req, res) {
    try {
      const { id } = req.params;
      const { title, description, deadline, max_points } = req.body;

      const assignment = await AssignmentsModel.updateAssignment(
        id,
        title,
        description,
        deadline,
        max_points
      );

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete assignment (Instructor only)
  async deleteAssignment(req, res) {
    try {
      const { id } = req.params;
      const assignment = await AssignmentsModel.deleteAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
