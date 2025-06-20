// backend/troubleshoot-db.js
require("dotenv").config();
const { Pool } = require("pg");

async function troubleshootConnection() {
  console.log("🔍 Database Connection Troubleshoot\n");

  // Show current environment variables
  console.log("📋 Current .env values:");
  console.log(`   DB_HOST: ${process.env.DB_HOST || "NOT SET"}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || "NOT SET"}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || "NOT SET"}`);
  console.log(`   DB_USER: ${process.env.DB_USER || "NOT SET"}`);
  console.log(
    `   DB_PASSWORD: ${process.env.DB_PASSWORD ? "***SET***" : "NOT SET"}\n`
  );

  if (!process.env.DB_PASSWORD) {
    console.error("❌ DB_PASSWORD is not set in .env file!");
    console.log("\n🔧 Fix: Add DB_PASSWORD=your_actual_password to .env file");
    process.exit(1);
  }

  // Test different connection scenarios
  const configs = [
    {
      name: "Default Config",
      config: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || "lms_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
      },
    },
    {
      name: "Without Database (test user auth)",
      config: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        database: "postgres", // Default database
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
      },
    },
  ];

  for (const { name, config } of configs) {
    console.log(`🧪 Testing: ${name}`);
    const pool = new Pool(config);

    try {
      const client = await pool.connect();
      console.log(`   ✅ Connection successful!`);

      const result = await client.query("SELECT version(), current_database()");
      console.log(`   📊 Database: ${result.rows[0].current_database}`);
      console.log(
        `   🐘 PostgreSQL Version: ${result.rows[0].version.split(" ")[1]}`
      );

      client.release();
      await pool.end();
      console.log("");
      break; // If successful, no need to test further
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      await pool.end();

      if (error.code === "28P01") {
        console.log("   💡 This is a password authentication error");
      } else if (error.code === "3D000") {
        console.log("   💡 Database does not exist");
      } else if (error.code === "ECONNREFUSED") {
        console.log("   💡 PostgreSQL server is not running");
      }
      console.log("");
    }
  }

  console.log("🔧 Common Solutions:");
  console.log("   1. Check PostgreSQL is running");
  console.log("   2. Verify password in .env file");
  console.log("   3. Create database: CREATE DATABASE lms_db;");
  console.log("   4. Check user permissions");
  console.log("\n📱 Quick fixes to try:");
  console.log("   • Open pgAdmin and test connection manually");
  console.log("   • Reset postgres password if needed");
  console.log("   • Use different user if postgres doesn't work");
}

troubleshootConnection();
