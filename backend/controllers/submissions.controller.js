// backend/controllers/submissions.controller.js (Enhanced version)
import { SubmissionsModel } from "../models/submissions.model.js";
import { AssignmentsModel } from "../models/assignments.model.js";
import fs from "fs";
import path from "path";

export const SubmissionsController = {
  async submitAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const { submission_text } = req.body;
      const userId = req.user.userId;

      // Get file path if file was uploaded
      let submissionUrl = null;
      if (req.file) {
        // Store relative path for database
        submissionUrl = `uploads/submissions/${req.file.filename}`;
      }

      // Validate that at least one submission method is provided
      if (!submission_text?.trim() && !submissionUrl) {
        return res.status(400).json({
          message: "Please provide either text submission or upload a file.",
        });
      }

      // Submit assignment (this will update if already exists due to your upsert logic)
      const submission = await SubmissionsModel.submitAssignment(
        assignmentId,
        userId,
        submission_text?.trim() || null,
        submissionUrl
      );

      res.status(201).json({
        ...submission,
        file_name: req.file ? req.file.originalname : null,
        file_type: req.file ? path.extname(req.file.originalname) : null,
        message: "Assignment submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);

      // Clean up uploaded file if submission fails
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }

      res.status(500).json({ message: "Failed to submit assignment" });
    }
  },

  // Get student's submission for specific assignment
  async getMySubmission(req, res) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.userId;

      const submission = await SubmissionsModel.getSubmission(
        assignmentId,
        userId
      );

      if (!submission) {
        return res.status(404).json({ message: "No submission found" });
      }

      // Add file info if submission has a file
      if (submission.submission_url) {
        const filePath = path.join(process.cwd(), submission.submission_url);
        submission.file_exists = fs.existsSync(filePath);
        submission.file_name = path.basename(submission.submission_url);
        submission.file_type = path.extname(submission.submission_url);
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all student's submissions
  async getMySubmissions(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.query;

      const submissions = await SubmissionsModel.getStudentSubmissions(
        userId,
        lessonId || null
      );

      // Add file info for each submission
      const submissionsWithFileInfo = submissions.map((submission) => {
        if (submission.submission_url) {
          const filePath = path.join(process.cwd(), submission.submission_url);
          submission.file_exists = fs.existsSync(filePath);
          submission.file_name = path.basename(submission.submission_url);
          submission.file_type = path.extname(submission.submission_url);
        }
        return submission;
      });

      res.json(submissionsWithFileInfo);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all submissions for an assignment (Instructor)
  async getAssignmentSubmissions(req, res) {
    try {
      const { assignmentId } = req.params;

      const submissions = await SubmissionsModel.getSubmissionsByAssignment(
        assignmentId
      );

      // Add file info for each submission
      const submissionsWithFileInfo = submissions.map((submission) => {
        if (submission.submission_url) {
          const filePath = path.join(process.cwd(), submission.submission_url);
          submission.file_exists = fs.existsSync(filePath);
          submission.file_name = path.basename(submission.submission_url);
          submission.file_type = path.extname(submission.submission_url);
        }
        return submission;
      });

      res.json(submissionsWithFileInfo);
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // 🆕 Enhanced Grade a submission (Instructor) with validation
  async gradeSubmission(req, res) {
    try {
      const { assignmentId, userId } = req.params;
      const { grade, feedback } = req.body;
      const gradedBy = req.user.userId;

      // Validate grade input
      if (grade === undefined || grade === null || grade < 0) {
        return res.status(400).json({
          message: "Grade must be a non-negative number",
        });
      }

      // Get assignment details to check max_points
      const assignment = await AssignmentsModel.getAssignmentById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (grade > assignment.max_points) {
        return res.status(400).json({
          message: `Grade cannot exceed maximum points (${assignment.max_points})`,
        });
      }

      const gradedSubmission = await SubmissionsModel.gradeSubmission(
        assignmentId,
        userId,
        grade,
        feedback || null,
        gradedBy
      );

      if (!gradedSubmission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      res.json({
        ...gradedSubmission,
        message: "Submission graded successfully",
        percentage: Math.round((grade / assignment.max_points) * 100),
      });
    } catch (error) {
      console.error("Error grading submission:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // 🆕 Bulk grading functionality
  async bulkGradeSubmissions(req, res) {
    try {
      const { grades } = req.body; // Array of { assignmentId, userId, grade, feedback }
      const gradedBy = req.user.userId;

      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({
          message: "Grades array is required and must not be empty",
        });
      }

      const results = [];
      const errors = [];

      for (const gradeData of grades) {
        try {
          const { assignmentId, userId, grade, feedback } = gradeData;

          const gradedSubmission = await SubmissionsModel.gradeSubmission(
            assignmentId,
            userId,
            grade,
            feedback || null,
            gradedBy
          );

          if (gradedSubmission) {
            results.push({
              assignmentId,
              userId,
              success: true,
              submission: gradedSubmission,
            });
          } else {
            errors.push({
              assignmentId,
              userId,
              error: "Submission not found",
            });
          }
        } catch (error) {
          errors.push({
            assignmentId: gradeData.assignmentId,
            userId: gradeData.userId,
            error: error.message,
          });
        }
      }

      res.json({
        message: "Bulk grading completed",
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      });
    } catch (error) {
      console.error("Error in bulk grading:", error);
      res.status(500).json({ message: "Server error during bulk grading" });
    }
  },

  // Download submission file with enhanced security
  // Fixed downloadAssignmentFile method in submissions.controller.js

  async downloadAssignmentFile(req, res) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get the submission - for students, get their own submission
      // For instructors, they might need to download any student's submission
      let submission;

      if (userRole === "student") {
        // Students can only download their own submissions
        submission = await SubmissionsModel.getSubmission(assignmentId, userId);
      } else if (userRole === "instructor" || userRole === "admin") {
        // Instructors can download any submission for their assignments
        const targetUserId = req.query.userId || userId;
        submission = await SubmissionsModel.getSubmission(
          assignmentId,
          targetUserId
        );

        // If no specific userId provided and instructor, try to find any submission for this assignment
        if (!submission && !req.query.userId) {
          const allSubmissions =
            await SubmissionsModel.getSubmissionsByAssignment(assignmentId);
          if (allSubmissions.length > 0) {
            // If there's only one submission, use it
            if (allSubmissions.length === 1) {
              submission = allSubmissions[0];
            } else {
              return res.status(400).json({
                message:
                  "Multiple submissions found. Please specify userId parameter.",
              });
            }
          }
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (!submission.submission_url) {
        return res
          .status(404)
          .json({ message: "No file attached to this submission" });
      }

      // Construct file path - handle both absolute and relative paths
      let filePath;
      if (path.isAbsolute(submission.submission_url)) {
        filePath = submission.submission_url;
      } else {
        filePath = path.join(process.cwd(), submission.submission_url);
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        console.error(`Original submission_url: ${submission.submission_url}`);
        return res.status(404).json({
          message: "File not found on server",
          debug:
            process.env.NODE_ENV === "development"
              ? { filePath, submission_url: submission.submission_url }
              : undefined,
        });
      }

      // Get file stats for additional info
      const stats = fs.statSync(filePath);

      // Get file extension to set appropriate content type
      const fileExt = path.extname(filePath).toLowerCase();
      const contentTypes = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip": "application/zip",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
      };

      const contentType = contentTypes[fileExt] || "application/octet-stream";
      const fileName = path.basename(filePath);

      // Set appropriate headers
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader("Content-Length", stats.size);

      // Create read stream and handle errors
      const fileStream = fs.createReadStream(filePath);

      fileStream.on("error", (error) => {
        console.error("Error reading file:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error reading file" });
        }
      });

      fileStream.on("open", () => {
        // Log the download for audit purposes
        console.log(
          `File downloaded: ${fileName} by user ${userId} (${userRole})`
        );
      });

      // Stream the file
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Server error during file download",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    }
  },

  // 🆕 Get submission statistics for instructors
  async getSubmissionStats(req, res) {
    try {
      const { assignmentId } = req.params;

      const stats = await SubmissionsModel.getSubmissionStats(assignmentId);

      res.json({
        assignment_id: assignmentId,
        ...stats,
        grading_progress:
          stats.total_submissions > 0
            ? Math.round((stats.graded_count / stats.total_submissions) * 100)
            : 0,
      });
    } catch (error) {
      console.error("Error fetching submission stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
