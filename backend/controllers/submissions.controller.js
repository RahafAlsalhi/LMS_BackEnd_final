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

  // Grade a submission (Instructor)
  async gradeSubmission(req, res) {
    try {
      const { assignmentId, userId } = req.params;
      const { grade, feedback } = req.body;
      const gradedBy = req.user.userId;

      const gradedSubmission = await SubmissionsModel.gradeSubmission(
        assignmentId,
        userId,
        grade,
        feedback,
        gradedBy
      );

      if (!gradedSubmission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      res.json({
        ...gradedSubmission,
        message: "Submission graded successfully",
      });
    } catch (error) {
      console.error("Error grading submission:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  async downloadAssignmentFile(req, res) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // For students, get their own submission
      // For instructors, they can download any submission (you might want to add userId param for instructors)
      let submission;

      if (userRole === "student") {
        submission = await SubmissionsModel.getSubmission(assignmentId, userId);
      } else {
        // For instructors, you might want to pass userId as query param
        const targetUserId = req.query.userId || userId;
        submission = await SubmissionsModel.getSubmission(
          assignmentId,
          targetUserId
        );
      }

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (!submission.submission_url) {
        return res
          .status(404)
          .json({ message: "No file attached to this submission" });
      }

      const filePath = path.join(process.cwd(), submission.submission_url);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

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
      };

      const contentType = contentTypes[fileExt] || "application/octet-stream";

      // Set appropriate headers
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(filePath)}"`
      );

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
