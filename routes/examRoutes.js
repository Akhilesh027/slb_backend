const express = require("express");

const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/examController.js");

const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, createExam);
router.get("/", protect, getExams);
router.get("/:id", protect, getExamById);
router.put("/:id", protect, updateExam);
router.delete("/:id", protect, deleteExam);

module.exports = router;