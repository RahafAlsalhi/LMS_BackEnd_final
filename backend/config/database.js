const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "lms_db",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
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

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
};

module.exports = { sequelize, testConnection };
