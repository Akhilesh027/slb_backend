const express = require("express");

const {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  markNotificationRead,
  deleteNotification,
} = require("../controllers/notificationController.js");

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

const manageRoles = ["super_admin", "admin", "branch_admin"];

const deleteRoles = ["super_admin", "admin", "branch_admin"];

router.get("/", protect, authorize(...viewRoles), getNotifications);
router.get("/:id", protect, authorize(...viewRoles), getNotificationById);

router.post("/", protect, authorize(...manageRoles), createNotification);
router.put("/:id", protect, authorize(...manageRoles), updateNotification);

router.patch(
  "/:id/read",
  protect,
  authorize(...viewRoles),
  markNotificationRead
);

router.delete(
  "/:id",
  protect,
  authorize(...deleteRoles),
  deleteNotification
);

module.exports = router;