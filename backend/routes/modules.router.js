// backend/routes/modules.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { ModulesController } from "../controllers/modules.controller.js";

const router = express.Router();

// Get all modules for a course
router.get(
  "/course/:courseId",
  authenticateToken,
  ModulesController.getModulesByCourse
);

// Get module with lessons
router.get("/:id", authenticateToken, ModulesController.getModuleById);

// Create new module (Instructor only)
router.post(
  "/",
  authenticateToken,
  requireRole("instructor", "admin"),
  ModulesController.createModule
);

// Update module
router.put(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  ModulesController.updateModule
);

// Delete module
router.delete(
  "/:id",
  authenticateToken,
  requireRole("instructor", "admin"),
  ModulesController.deleteModule
);
router.get("/:id/lessons", ModulesController.getLessonsByModule);

export default router;
