// backend/debug-server.js
// This script will help identify which route is causing the problem

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "LMS API is running",
    timestamp: new Date().toISOString(),
  });
});

console.log("✅ Basic server setup complete");

// Test each route one by one
try {
  console.log("🔍 Testing auth routes...");
  const authRoutes = require("./routes/auth");
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading auth routes:", error.message);
}

try {
  console.log("🔍 Testing user routes...");
  const userRoutes = require("./routes/users");
  app.use("/api/users", userRoutes);
  console.log("✅ User routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading user routes:", error.message);
}

try {
  console.log("🔍 Testing course routes...");
  const courseRoutes = require("./routes/courses");
  app.use("/api/courses", courseRoutes);
  console.log("✅ Course routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading course routes:", error.message);
}

try {
  console.log("🔍 Testing enrollment routes...");
  const enrollmentRoutes = require("./routes/enrollments");
  app.use("/api/enrollments", enrollmentRoutes);
  console.log("✅ Enrollment routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading enrollment routes:", error.message);
}

try {
  console.log("🔍 Testing quiz routes...");
  const quizRoutes = require("./routes/quizzes");
  app.use("/api/quizzes", quizRoutes);
  console.log("✅ Quiz routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading quiz routes:", error.message);
}

try {
  console.log("🔍 Testing assignment routes...");
  const assignmentRoutes = require("./routes/assignments");
  app.use("/api/assignments", assignmentRoutes);
  console.log("✅ Assignment routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading assignment routes:", error.message);
}

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});
