// backend/scripts/setup-db.js
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  console.log("🚀 Setting up LMS database...");

  try {
    const client = await pool.connect();

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create all tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructor_id UUID NOT NULL REFERENCES users(id),
        category_id UUID REFERENCES categories(id),
        price DECIMAL(10,2) DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        course_id UUID NOT NULL REFERENCES courses(id),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 0,
        UNIQUE(user_id, course_id)
      );

      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id UUID NOT NULL REFERENCES courses(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        module_id UUID NOT NULL REFERENCES modules(id),
        title VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content_url TEXT,
        content_text TEXT,
        duration INTEGER DEFAULT 0,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lesson_completions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lesson_id UUID NOT NULL REFERENCES lessons(id),
        user_id UUID NOT NULL REFERENCES users(id),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lesson_id, user_id)
      );
    `);

    // Insert categories
    await client.query(`
      INSERT INTO categories (name, description) VALUES 
      ('Programming', 'Programming courses'),
      ('Business', 'Business courses'),
      ('Design', 'Design courses')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create admin user
    const adminExists = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ["admin@lms.com"]
    );
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["Admin User", "admin@lms.com", hashedPassword, "admin"]
      );
      console.log("✅ Admin created: admin@lms.com / admin123");
    }

    client.release();
    console.log("✅ Database setup complete!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  }

  await pool.end();
}

setupDatabase();
