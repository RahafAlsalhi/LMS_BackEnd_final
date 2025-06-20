// backend/check-admin.js
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAndCreateAdmin() {
  console.log("🔍 Checking admin user...");

  try {
    const client = await pool.connect();

    // Check if admin exists
    const adminCheck = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@lms.com"]
    );

    if (adminCheck.rows.length === 0) {
      console.log("❌ Admin user not found. Creating...");

      // Create admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["Admin User", "admin@lms.com", hashedPassword, "admin"]
      );

      console.log("✅ Admin user created successfully!");
      console.log("📧 Email: admin@lms.com");
      console.log("🔑 Password: admin123");
    } else {
      console.log("✅ Admin user exists:");
      console.log("📧 Email:", adminCheck.rows[0].email);
      console.log("👤 Name:", adminCheck.rows[0].name);
      console.log("🎭 Role:", adminCheck.rows[0].role);
      console.log("✅ Active:", adminCheck.rows[0].is_active);

      // Test password
      const isPasswordCorrect = await bcrypt.compare(
        "admin123",
        adminCheck.rows[0].password_hash
      );
      console.log('🔑 Password "admin123" works:', isPasswordCorrect);

      if (!isPasswordCorrect) {
        console.log('🔄 Resetting password to "admin123"...');
        const newHashedPassword = await bcrypt.hash("admin123", 10);
        await client.query(
          "UPDATE users SET password_hash = $1 WHERE email = $2",
          [newHashedPassword, "admin@lms.com"]
        );
        console.log("✅ Password reset complete!");
      }
    }

    // Show all users
    const allUsers = await client.query(
      "SELECT email, role, is_active FROM users ORDER BY created_at"
    );
    console.log("\n👥 All users in database:");
    allUsers.rows.forEach((user) => {
      console.log(
        `   📧 ${user.email} (${user.role}) - ${
          user.is_active ? "Active" : "Inactive"
        }`
      );
    });

    client.release();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await pool.end();
  process.exit(0);
}

checkAndCreateAdmin();
