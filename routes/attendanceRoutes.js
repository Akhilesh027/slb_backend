const express = require("express");

const {
  createAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
} = require("../controllers/attendanceController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

const viewRoles = [
  "super_admin",
  "branch_admin",
  "faculty",
  "student",
  "parent",
];

const manageRoles = [
  "super_admin",
  "branch_admin",
  "faculty",
];

const deleteRoles = [
  "super_admin",
  "branch_admin",
];

router.get("/", protect, authorize(...viewRoles), getAttendance);
router.get("/:id", protect, authorize(...viewRoles), getAttendanceById);

router.post("/", protect, authorize(...manageRoles), createAttendance);
router.put("/:id", protect, authorize(...manageRoles), updateAttendance);

router.delete("/:id", protect, authorize(...deleteRoles), deleteAttendance);

module.exports = router;