// backend/routes/submissions.router.js
import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { SubmissionsController } from "../controllers/submissions.controller.js";
import { uploadSubmission } from "../middleware/upload.js";

const router = express.Router();

const handleUploadError = (err, req, res, next) => {
  if (err instanceof Error) {
    if (err.message.includes("Only document files are allowed")) {
      return res.status(400).json({
        message:
          "Please upload a valid document file (PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX)",
      });
    }
    if (err.message.includes("File too large")) {
      return res.status(400).json({
        message: "File too large. Maximum size is 10MB.",
      });
    }
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Student routes
// Submit assignment
router.post(
  "/assignment/:assignmentId",
  authenticateToken,
  requireRole("student"),
  uploadSubmission.single("assignment_file"), // Use your existing uploadSubmission
  handleUploadError,
  SubmissionsController.submitAssignment
);

// 🆕 NEW: Alternative route for StudentManagement component (matches the controller expectation)
router.post(
  "/:assignmentId",
  authenticateToken,
  requireRole("student"),
  uploadSubmission.single("file"), // Note: using 'file' to match controller expectation
  handleUploadError,
  SubmissionsController.submitAssignment
);

// Get my submission for specific assignment
router.get(
  "/assignment/:assignmentId/my",
  authenticateToken,
  requireRole("student"),
  SubmissionsController.getMySubmission
);

// 🆕 NEW: Alternative route for StudentManagement component
router.get(
  "/:assignmentId/my",
  authenticateToken,
  requireRole("student"),
  SubmissionsController.getMySubmission
);

// Get all my submissions (optionally filtered by lesson)
router.get(
  "/my",
  authenticateToken,
  requireRole("student"),
  SubmissionsController.getMySubmissions
);

// Download assignment file
router.get(
  "/:assignmentId/download",
  authenticateToken,
  SubmissionsController.downloadAssignmentFile
);

// 🆕 NEW: Simplified download route for StudentManagement component
router.get(
  "/download/:assignmentId",
  authenticateToken,
  SubmissionsController.downloadAssignmentFile
);

// Instructor routes
// Get all submissions for an assignment
router.get(
  "/assignment/:assignmentId",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.getAssignmentSubmissions
);

// 🆕 NEW: Get submission statistics for an assignment (for instructor analytics)
router.get(
  "/assignment/:assignmentId/stats",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.getSubmissionStats
);

// Grade a specific submission
router.put(
  "/assignment/:assignmentId/user/:userId/grade",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.gradeSubmission
);

// 🆕 NEW: Alternative grading route to match StudentManagement component expectations
router.put(
  "/grade/:assignmentId/:userId",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.gradeSubmission
);

// 🆕 NEW: Bulk grading functionality for instructors
router.post(
  "/bulk-grade",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.bulkGradeSubmissions
);

export default router;
