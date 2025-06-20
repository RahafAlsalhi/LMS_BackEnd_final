// backend/test-auth.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testAuth() {
  console.log("🧪 Testing Auth Flow...\n");

  try {
    const client = await pool.connect();

    // Get admin user
    const adminResult = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@lms.com"]
    );
    if (adminResult.rows.length === 0) {
      console.log("❌ Admin user not found");
      return;
    }

    const admin = adminResult.rows[0];
    console.log("✅ Admin user found:", admin.name, admin.email, admin.role);

    // Generate a test token
    const testToken = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Test token generated");
    console.log("🔑 Token:", testToken.substring(0, 50) + "...");

    // Test token verification
    try {
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
      console.log("✅ Token verification successful");
      console.log("👤 Decoded:", decoded.userId, decoded.role);
    } catch (error) {
      console.log("❌ Token verification failed:", error.message);
    }

    // Test user lookup with decoded ID
    const userLookup = await client.query(
      "SELECT id, name, email, role, is_active FROM users WHERE id = $1",
      [admin.id]
    );

    if (userLookup.rows.length > 0) {
      console.log("✅ User lookup successful");
      console.log("👤 User data:", userLookup.rows[0]);
    } else {
      console.log("❌ User lookup failed");
    }

    client.release();

    console.log("\n💡 To test manually:");
    console.log("1. Login and copy the token from localStorage");
    console.log(
      '2. Test: curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/me'
    );
    console.log(
      "3. Or use this test token:",
      testToken.substring(0, 30) + "..."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  await pool.end();
  process.exit(0);
}

testAuth();
