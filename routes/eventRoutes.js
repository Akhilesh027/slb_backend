const express = require("express");

const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/", protect, authorize("super_admin", "branch_admin", "faculty","student"), getEvents);
router.get("/:id", protect, authorize("super_admin", "branch_admin", "faculty","student"), getEventById);
router.post("/", protect, authorize("super_admin", "branch_admin"), createEvent);
router.put("/:id", protect, authorize("super_admin", "branch_admin"), updateEvent);
router.delete("/:id", protect, authorize("super_admin"), deleteEvent);

module.exports = router;