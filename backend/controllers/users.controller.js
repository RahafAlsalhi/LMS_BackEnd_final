// backend/controllers/users.controller.js
import { UsersModel } from "../models/users.model.js";

export const UsersController = {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const users = await UsersModel.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get pending instructor approvals (Admin only)
  async getPendingInstructors(req, res) {
    try {
      const pendingInstructors = await UsersModel.getPendingInstructors();
      res.json(pendingInstructors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Approve/reject instructor (Admin only)
  async updateInstructorApproval(req, res) {
    try {
      const { id } = req.params;
      const { is_approved } = req.body;

      if (is_approved === false) {
        // If rejecting, delete the user account entirely
        const deletedUser = await UsersModel.deleteInstructor(id);

        if (!deletedUser) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        res.json({
          message: `Instructor application rejected and account removed`,
          user: deletedUser,
        });
      } else {
        // If approving, set is_approved = true
        const approvedUser = await UsersModel.approveInstructor(
          id,
          is_approved
        );

        if (!approvedUser) {
          return res.status(404).json({ message: "Instructor not found" });
        }

        res.json({
          message: `Instructor approved successfully`,
          user: approvedUser,
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update user status (Admin only)
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const updatedUser = await UsersModel.updateUserStatus(id, is_active);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: `User ${is_active ? "activated" : "deactivated"} successfully`,
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Update user details (Admin only)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      const updatedUser = await UsersModel.updateUser(id, {
        name,
        email,
        role,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete user by ID (Admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deletedUser = await UsersModel.deleteUser(id);

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User deleted successfully",
        user: deletedUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
