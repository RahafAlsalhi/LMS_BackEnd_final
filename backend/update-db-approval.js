// backend/update-db-approval.js
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateDatabase() {
  // console.log("🔄 Updating database for approval system...");

  try {
    const client = await pool.connect();

    // Add approval column if it doesn't exist
    // console.log("📝 Adding is_approved column...");
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
    `);

    // Update existing users
    // console.log("👥 Updating existing users...");

    // Make students and admins approved by default
    await client.query(`
      UPDATE users SET is_approved = true WHERE role IN ('student', 'admin');
    `);

    // Make instructors need approval (except if they already have courses)
    await client.query(`
      UPDATE users SET is_approved = false 
      WHERE role = 'instructor' 
      AND id NOT IN (SELECT DISTINCT instructor_id FROM courses);
    `);

    // Keep existing instructors with courses approved
    await client.query(`
      UPDATE users SET is_approved = true 
      WHERE role = 'instructor' 
      AND id IN (SELECT DISTINCT instructor_id FROM courses);
    `);

    // Check current status
    const userStats = await client.query(`
      SELECT role, is_approved, COUNT(*) as count
      FROM users 
      GROUP BY role, is_approved 
      ORDER BY role, is_approved;
    `);

    // console.log("\n📊 User approval status:");
    userStats.rows.forEach((row) => {
      console.log(
        `   ${row.role}: ${row.is_approved ? "Approved" : "Pending"} - ${
          row.count
        } users`
      );
    });

    client.release();
    // console.log("\n✅ Database updated successfully!");
    // console.log("\n🎯 What happens now:");
    // console.log("   • New instructor registrations will need admin approval");
    // console.log("   • Existing instructors with courses remain approved");
    // console.log("   • Students and admins are auto-approved");
    // console.log("   • Only approved instructors can create courses");
  } catch (error) {
    // console.error("❌ Database update failed:", error.message);
  }

  await pool.end();
  process.exit(0);
}

updateDatabase();
