// routes/authRoutes.js
const express = require("express");
const { login, me, createSuperAdmin, getBranchAdmins } = require("../controllers/authController.js");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, me);
router.post(
  "/create-super-admin",
  createSuperAdmin
);

module.exports = router;