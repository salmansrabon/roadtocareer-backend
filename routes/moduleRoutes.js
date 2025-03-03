const express = require("express");
const router = express.Router();
const { createModule, listModule } = require("../controllers/moduleController");

// ✅ Route to add a new module
router.post("/add", createModule);
router.get("/list", listModule)

module.exports = router;
