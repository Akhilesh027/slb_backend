const express = require("express");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/", protect, authorize("super_admin", "branch_admin", "faculty", "student"), getStudents);

router.get("/:id", protect, authorize("super_admin", "branch_admin", "faculty", "student", "parent"), getStudentById);

router.post("/", protect, authorize("super_admin", "branch_admin"), createStudent);

router.put("/:id", protect, authorize("super_admin", "branch_admin"), updateStudent);

router.delete("/:id", protect, authorize("super_admin"), deleteStudent);

module.exports = router;