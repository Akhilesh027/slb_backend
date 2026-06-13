const Notification = require("../models/Notification.js");
const User = require("../models/User.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";
const getLoggedUserId = (req) => req.user?._id || req.user?.id;
const getLoggedUserName = (req) => req.user?.name || "System User";

const todayDate = () => new Date().toISOString().split("T")[0];

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

const getNotificationQueryByRole = (req) => {
  const role = req.user?.role;

  if (isAdmin(req)) return {};

  const audience = normalizeAudience(role);
  const branch = getUserBranch(req);
  const userId = getLoggedUserId(req);

  return {
    status: { $in: ["Active", "Sent", "Scheduled"] },
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
          { audience: "Specific Branch" },
          { audience: "Specific Batch" },
          { audience: role === "student" ? "Specific Student" : "" },
          { audience: role === "faculty" ? "Specific Faculty" : "" },
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

  if (!branchName || branchName === "All") return true;

  return getUserBranch(req) === branchName;
};

const resolveRecipient = async (req, recipientId) => {
  if (!recipientId) {
    return {
      recipientId: null,
      recipientName: "",
    };
  }

  const recipient = await User.findById(recipientId).select(
    "name email role branch status"
  );

  if (!recipient) {
    throw new Error("Selected recipient not found");
  }

  if (!isAdmin(req) && recipient.branch !== getUserBranch(req)) {
    throw new Error("Access denied for selected recipient");
  }

  return {
    recipientId: recipient._id,
    recipientName: recipient.name,
  };
};

exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      audience,
      branch,
      batch,
      recipientId,
      recipientName,
      priority,
      sendType,
      date,
      scheduledDate,
      scheduledTime,
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

    let recipientInfo = {
      recipientId: null,
      recipientName: recipientName || "",
    };

    if (recipientId) {
      try {
        recipientInfo = await resolveRecipient(req, recipientId);
      } catch (error) {
        return res.status(
          error.message.includes("not found") ? 404 : 403
        ).json({
          message: error.message,
        });
      }
    }

    const notificationId = await generateNotificationId();

    const finalSendType = sendType || "Send Now";

    const notification = await Notification.create({
      notificationId,
      title,
      message,
      type: type || "General Announcement",
      audience: recipientId ? "Specific" : audience || "All",
      branch: finalBranch || "All",
      batch: batch || "",
      recipientId: recipientInfo.recipientId,
      recipientName: recipientInfo.recipientName,
      priority: priority || "Medium",
      sendType: finalSendType,
      date: date || todayDate(),
      scheduledDate: scheduledDate || "",
      scheduledTime: scheduledTime || "",
      status:
        status ||
        (finalSendType === "Schedule Later" ? "Scheduled" : "Active"),
      createdBy: getLoggedUserId(req),
      createdByName: getLoggedUserName(req),
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

    const {
      type,
      audience,
      branch,
      batch,
      status,
      priority,
      isRead,
      date,
    } = req.query;

    if (type) query.type = type;
    if (audience) query.audience = audience;
    if (branch) query.branch = branch;
    if (batch) query.batch = batch;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (date) query.date = date;

    if (isRead === "true") query.isRead = true;
    if (isRead === "false") query.isRead = false;

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
      batch,
      recipientId,
      recipientName,
      priority,
      sendType,
      date,
      scheduledDate,
      scheduledTime,
      status,
      isRead,
    } = req.body;

    const finalBranch = isAdmin(req)
      ? branch || notification.branch
      : getUserBranch(req);

    if (!restrictBranchAccess(req, finalBranch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    let recipientInfo = {
      recipientId: notification.recipientId,
      recipientName: notification.recipientName || "",
    };

    if (recipientId) {
      try {
        recipientInfo = await resolveRecipient(req, recipientId);
      } catch (error) {
        return res.status(
          error.message.includes("not found") ? 404 : 403
        ).json({
          message: error.message,
        });
      }
    }

    notification.title = title || notification.title;
    notification.message = message || notification.message;
    notification.type = type || notification.type;
    notification.audience = recipientId
      ? "Specific"
      : audience || notification.audience;
    notification.branch = finalBranch || notification.branch;
    notification.batch = batch !== undefined ? batch : notification.batch;
    notification.recipientId = recipientId ? recipientInfo.recipientId : null;
    notification.recipientName = recipientId
      ? recipientInfo.recipientName
      : recipientName || "";
    notification.priority = priority || notification.priority;
    notification.sendType = sendType || notification.sendType;
    notification.date = date || notification.date;
    notification.scheduledDate =
      scheduledDate !== undefined
        ? scheduledDate
        : notification.scheduledDate;
    notification.scheduledTime =
      scheduledTime !== undefined
        ? scheduledTime
        : notification.scheduledTime;
    notification.status = status || notification.status;

    if (isRead !== undefined) {
      notification.isRead = Boolean(isRead);
      notification.readAt = isRead ? new Date().toISOString() : "";
    }

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

exports.markNotificationRead = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getNotificationQueryByRole(req),
    };

    const notification = await Notification.findOne(query);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date().toISOString();

    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification,
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