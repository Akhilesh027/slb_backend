const express = require("express");

const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/examController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

const viewRoles = [
  "super_admin",
  "admin",
  "branch_admin",
  "faculty",
  "student",
  "parent",
];

const manageRoles = ["super_admin", "admin", "branch_admin", "faculty"];

const deleteRoles = ["super_admin", "admin", "branch_admin"];

router.get("/", protect, authorize(...viewRoles), getExams);
router.get("/:id", protect, authorize(...viewRoles), getExamById);

router.post("/", protect, authorize(...manageRoles), createExam);
router.put("/:id", protect, authorize(...manageRoles), updateExam);
router.delete("/:id", protect, authorize(...deleteRoles), deleteExam);

module.exports = router;