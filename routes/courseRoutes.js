const express = require("express");

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/", protect, authorize("super_admin", "branch_admin", "faculty"), getCourses);

router.get("/:id", protect, authorize("super_admin", "branch_admin", "faculty"), getCourseById);

router.post("/", protect, authorize("super_admin", "branch_admin"), createCourse);

router.put("/:id", protect, authorize("super_admin", "branch_admin"), updateCourse);

router.delete("/:id", protect, authorize("super_admin"), deleteCourse);

module.exports = router;