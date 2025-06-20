// backend/config/database.js
import { Sequelize } from "sequelize";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// 🔧 Force string conversion and validation
const DB_HOST = String(process.env.DB_HOST || "localhost");
const DB_PORT = parseInt(process.env.DB_PORT) || 5432;
const DB_NAME = String(process.env.DB_NAME || "Rahaf");
const DB_USER = String(process.env.DB_USER || "postgres");
const DB_PASSWORD = String(process.env.DB_PASSWORD || "deraabka20");

// 🔍 DEBUG: Environment variables
console.log("🔧 Database Configuration Debug:");
console.log("  DB_HOST:", DB_HOST, typeof DB_HOST);
console.log("  DB_PORT:", DB_PORT, typeof DB_PORT);
console.log("  DB_NAME:", DB_NAME, typeof DB_NAME);
console.log("  DB_USER:", DB_USER, typeof DB_USER);
console.log(
  "  DB_PASSWORD:",
  DB_PASSWORD ? "***SET***" : "❌ EMPTY",
  typeof DB_PASSWORD
);
console.log("  DB_PASSWORD length:", DB_PASSWORD.length);

// Validate that password is not empty
if (!DB_PASSWORD || DB_PASSWORD === "undefined" || DB_PASSWORD === "null") {
  console.error("❌ CRITICAL: Database password is empty or invalid!");
  console.error("   Current value:", DB_PASSWORD);
  console.error("   Please check your .env file");
  process.exit(1);
}

// Database configuration object
const dbConfig = {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
};

console.log("✅ Database config created successfully");

// Sequelize instance
export const sequelize = new Sequelize({
  dialect: "postgres",
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.user, // Note: Sequelize uses 'username' not 'user'
  password: dbConfig.password,
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Raw PostgreSQL Pool for direct queries
export const pool = new Pool(dbConfig);

// Test Sequelize connection
export const testConnection = async () => {
  try {
    console.log("🔄 Testing Sequelize connection...");
    await sequelize.authenticate();
    console.log("✅ Sequelize: Database connection established successfully.");

    // Test raw query
    const [results] = await sequelize.query("SELECT NOW() as current_time", {
      type: sequelize.QueryTypes.SELECT,
    });
    console.log("✅ Sequelize test query result:", results.current_time);
  } catch (error) {
    console.error("❌ Sequelize connection failed:");
    console.error("   Error:", error.message);
    console.error("   Code:", error.code);
    throw error;
  }
};

// Test raw pool connection
export const testPoolConnection = async () => {
  try {
    console.log("🔄 Testing Pool connection...");
    const client = await pool.connect();

    const result = await client.query("SELECT NOW() as current_time");
    console.log("✅ Pool: Database connection established successfully.");
    console.log("✅ Pool test query result:", result.rows[0].current_time);

    client.release();
  } catch (error) {
    console.error("❌ Pool connection failed:");
    console.error("   Error:", error.message);
    console.error("   Code:", error.code);
    throw error;
  }
};

// Handle pool errors
pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client:", err);
});

// Graceful shutdown
export const closeConnections = async () => {
  try {
    await sequelize.close();
    await pool.end();
    console.log("🔒 Database connections closed successfully.");
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
  }
};

// Test both connections on startup
const initializeDatabase = async () => {
  try {
    await testConnection();
    await testPoolConnection();
    console.log("🎉 All database connections initialized successfully!");
  } catch (error) {
    console.error("💥 Database initialization failed:", error);
    process.exit(1);
  }
};

// Auto-initialize when this module is imported
initializeDatabase();

// Default export for backward compatibility
export default pool;
