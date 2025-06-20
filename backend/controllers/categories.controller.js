// backend/controllers/categories.controller.js
import { CategoriesModel } from "../models/categories.model.js";

export const CategoriesController = {
  // Get all categories (Public)
  async getAllCategories(req, res) {
    try {
      const categories = await CategoriesModel.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get category by ID (Public)
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await CategoriesModel.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Create category (Admin only)
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name || name.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Category name must be at least 2 characters" });
      }

      // Check if category already exists
      const existingCategory = await CategoriesModel.findCategoryByName(name);
      if (existingCategory) {
        return res.status(400).json({ message: "Category already exists" });
      }

      const category = await CategoriesModel.createCategory(name, description);

      res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update category (Admin only)
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || name.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Category name must be at least 2 characters" });
      }

      // Check if another category has the same name
      const existingCategory =
        await CategoriesModel.findCategoryByNameExcludingId(name, id);
      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category name already exists" });
      }

      const category = await CategoriesModel.updateCategory(
        id,
        name,
        description
      );

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: "Category updated successfully",
        category,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete category (Admin only)
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Check if category has courses
      const coursesCount = await CategoriesModel.getCoursesCountInCategory(id);
      if (coursesCount > 0) {
        return res.status(400).json({
          message: `Cannot delete category. It has ${coursesCount} courses. Move or delete the courses first.`,
        });
      }

      const deletedCategory = await CategoriesModel.deleteCategory(id);

      if (!deletedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: `Category "${deletedCategory.name}" deleted successfully`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
