const express = require("express");

const {
  createFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty,
  
} = require("../controllers/facultyController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

const staffRoles = ["super_admin", "branch_admin", "branch_manager", "faculty"];

router.post("/", protect, authorize(...staffRoles), createFaculty);
router.get("/", protect, authorize(...staffRoles), getFaculty);
router.get("/:id", protect, authorize(...staffRoles), getFacultyById);
router.put("/:id", protect, authorize(...staffRoles), updateFaculty);
router.delete("/:id", protect, authorize(...staffRoles), deleteFaculty);

module.exports = router;