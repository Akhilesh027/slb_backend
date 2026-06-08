const Notification = require("../models/Notification.js");
const User = require("../models/User.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";

const generateNotificationId = async () => {
  const prefix = "SLB-NOT-";

  const lastNotification = await Notification.findOne({
    notificationId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastNotification?.notificationId) {
    const lastNumber = parseInt(
      lastNotification.notificationId.split("-").pop(),
      10
    );
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

const normalizeAudience = (role) => {
  if (role === "student") return "Students";
  if (role === "parent") return "Parents";
  if (role === "faculty") return "Faculty";
  if (role === "branch_admin") return "Branch Admin";
  return "All";
};

const getLoggedUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const getNotificationQueryByRole = (req) => {
  const role = req.user?.role;

  if (isAdmin(req)) return {};

  const audience = normalizeAudience(role);
  const branch = getUserBranch(req);
  const userId = getLoggedUserId(req);

  return {
    status: "Active",
    $and: [
      {
        $or: [
          { recipientId: userId },
          { recipientId: null },
          { recipientId: { $exists: false } },
        ],
      },
      {
        $or: [
          { audience: "All" },
          { audience },
          { audience: "Specific" },
        ],
      },
      {
        $or: [
          { branch: "All" },
          { branch },
          { branch: "" },
          { branch: { $exists: false } },
        ],
      },
    ],
  };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;

  if (!branchName || branchName === "All") {
    return true;
  }

  return getUserBranch(req) === branchName;
};

exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      audience,
      branch,
      recipientId,
      date,
      status,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required",
      });
    }

    const finalBranch = isAdmin(req) ? branch || "All" : getUserBranch(req);

    if (!restrictBranchAccess(req, finalBranch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    let recipientName = "";

    if (recipientId) {
      const recipient = await User.findById(recipientId).select(
        "name email role branch status"
      );

      if (!recipient) {
        return res.status(404).json({
          message: "Selected recipient not found",
        });
      }

      if (!isAdmin(req) && recipient.branch !== getUserBranch(req)) {
        return res.status(403).json({
          message: "Access denied for selected recipient",
        });
      }

      recipientName = recipient.name;
    }

    const notificationId = await generateNotificationId();

    const notification = await Notification.create({
      notificationId,
      title,
      message,
      type: type || "General Announcement",
      audience: recipientId ? "Specific" : audience || "All",
      branch: finalBranch || "All",
      recipientId: recipientId || null,
      recipientName,
      date: date || new Date().toISOString().split("T")[0],
      status: status || "Active",
      createdBy: getLoggedUserId(req),
    });

    res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const query = getNotificationQueryByRole(req);

    const notifications = await Notification.find(query)
      .populate("recipientId", "name email role branch status")
      .populate("createdBy", "name email role branch")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getNotificationQueryByRole(req),
    };

    const notification = await Notification.findOne(query)
      .populate("recipientId", "name email role branch status")
      .populate("createdBy", "name email role branch");

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateNotification = async (req, res) => {
  try {
    const baseQuery = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, branch: getUserBranch(req) };

    const notification = await Notification.findOne(baseQuery);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    const {
      title,
      message,
      type,
      audience,
      branch,
      recipientId,
      date,
      status,
    } = req.body;

    const finalBranch = isAdmin(req)
      ? branch || notification.branch
      : getUserBranch(req);

    if (!restrictBranchAccess(req, finalBranch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    let recipientName = notification.recipientName || "";

    if (recipientId) {
      const recipient = await User.findById(recipientId).select(
        "name email role branch status"
      );

      if (!recipient) {
        return res.status(404).json({
          message: "Selected recipient not found",
        });
      }

      if (!isAdmin(req) && recipient.branch !== getUserBranch(req)) {
        return res.status(403).json({
          message: "Access denied for selected recipient",
        });
      }

      recipientName = recipient.name;
    }

    notification.title = title || notification.title;
    notification.message = message || notification.message;
    notification.type = type || notification.type;
    notification.audience = recipientId
      ? "Specific"
      : audience || notification.audience;
    notification.branch = finalBranch || notification.branch;
    notification.recipientId = recipientId || null;
    notification.recipientName = recipientId ? recipientName : "";
    notification.date = date || notification.date;
    notification.status = status || notification.status;

    await notification.save();

    const updatedNotification = await Notification.findById(notification._id)
      .populate("recipientId", "name email role branch status")
      .populate("createdBy", "name email role branch");

    res.json({
      message: "Notification updated successfully",
      notification: updatedNotification,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const baseQuery = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, branch: getUserBranch(req) };

    const notification = await Notification.findOne(baseQuery);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    await Notification.findByIdAndDelete(notification._id);

    res.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};