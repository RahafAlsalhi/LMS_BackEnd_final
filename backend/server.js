// backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/modules", require("./routes/modules"));
app.use("/api/lessons", require("./routes/lessons"));
app.use("/api/enrollments", require("./routes/enrollments"));
app.use("/api/quizzes", require("./routes/quizzes"));
app.use("/api/assignments", require("./routes/assignments"));

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
      const { Pool } = require("pg");
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
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

module.exports = app;
