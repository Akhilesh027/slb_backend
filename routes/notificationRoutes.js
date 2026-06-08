const express = require("express");

const {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
} = require("../controllers/notificationController.js");

const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, createNotification);
router.get("/", protect, getNotifications);
router.get("/:id", protect, getNotificationById);
router.put("/:id", protect, updateNotification);
router.delete("/:id", protect, deleteNotification);

module.exports = router;