const express = require("express");
const { getBranchAdmins } = require("../controllers/userController.js");
const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/branch-admins", protect, getBranchAdmins);

module.exports = router;