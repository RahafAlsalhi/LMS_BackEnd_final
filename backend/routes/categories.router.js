// backend/routes/categories.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { CategoriesController } from "../controllers/categories.controller.js";

const router = express.Router();

// Get all categories (Public)
router.get("/", CategoriesController.getAllCategories);

// Get category by ID (Public)
router.get("/:id", CategoriesController.getCategoryById);

// Create category (Admin only)
router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  CategoriesController.createCategory
);

// Update category (Admin only)
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  CategoriesController.updateCategory
);

// Delete category (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  CategoriesController.deleteCategory
);

export default router;
