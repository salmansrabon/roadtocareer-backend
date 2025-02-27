const { Sequelize } = require("sequelize");
require("dotenv").config(); // ✅ Load environment variables

// ✅ Initialize Sequelize connection
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false, // Disable logging of SQL queries
});

// ✅ Test Database Connection
sequelize.authenticate()
    .then(() => console.log("✅ Database connected successfully"))
    .catch((err) => {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    });

module.exports = sequelize;
