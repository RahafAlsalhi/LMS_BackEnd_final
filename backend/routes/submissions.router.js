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

// Get my submission for specific assignment
router.get(
  "/assignment/:assignmentId/my",
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
  "/assignment/:assignmentId/download",
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

// Grade a specific submission
router.put(
  "/assignment/:assignmentId/user/:userId/grade",
  authenticateToken,
  requireRole("instructor", "admin"),
  SubmissionsController.gradeSubmission
);
export default router;
