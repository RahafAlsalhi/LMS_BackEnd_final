// backend/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import dotenv from "dotenv";
// In your app.js or server.js
// Import routers
import authRouter from "./routes/auth.router.js";
import usersRouter from "./routes/users.router.js";
import categoriesRouter from "./routes/categories.router.js";
import coursesRouter from "./routes/courses.router.js";
import modulesRouter from "./routes/modules.router.js";
import lessonsRouter from "./routes/lessons.router.js";
import enrollmentsRouter from "./routes/enrollments.router.js";
import quizzesRouter from "./routes/quizzes.router.js";
import assignmentsRouter from "./routes/assignments.router.js";
import submissionsRouter from "./routes/submissions.router.js";
import quizAttemptsRouter from "./routes/quiz-attempts.router.js";

// ES Module setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Range",
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
    ],
    exposedHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Enhanced video-specific CORS headers
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173"];

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Range, Accept-Ranges, Content-Length, Content-Range"
  );
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges"
  );
  res.header("Accept-Ranges", "bytes");
  res.header("Cache-Control", "no-cache");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});
// Serve static files (uploaded videos, assignments, submissions)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes - EXACT SAME ENDPOINTS AS BEFORE
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/quiz-attempts", quizAttemptsRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "LMS API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Database test endpoint (development only)
if (process.env.NODE_ENV === "development") {
  app.get("/api/test-db", async (req, res) => {
    try {
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: String(process.env.DB_PASSWORD || "deraabka20"),
      });

      const result = await pool.query(
        "SELECT NOW() as server_time, version() as db_version"
      );
      await pool.end();

      res.json({
        status: "OK",
        message: "Database connection successful",
        server_time: result.rows[0].server_time,
        database_version: result.rows[0].db_version.split(" ")[0],
      });
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        message: "Database connection failed",
        error: error.message,
      });
    }
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  if (process.env.NODE_ENV === "development") {
    console.error("Stack:", err.stack);
  }

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files",
      });
    }
  }

  // Handle custom file type errors
  if (
    err.message === "Only video files are allowed!" ||
    err.message === "Only document files are allowed!"
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle specific error types
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File too large",
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      "GET /api/health",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/me",
      "GET /api/courses",
      "GET /api/courses/:id",
      "GET /api/modules/course/:courseId",
      "POST /api/lessons (with file upload)",
      "POST /api/assignments/:id/submit (with file upload)",
      ...(process.env.NODE_ENV === "development" ? ["GET /api/test-db"] : []),
    ],
  });
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log("🚀 LMS Backend Server Started");
  console.log("================================");
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📁 File Uploads: http://localhost:${PORT}/uploads`);
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 DB Test: http://localhost:${PORT}/api/test-db`);
  }
  console.log("================================");
});

// Handle server startup errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
});

export default app;
