const mongoose = require("mongoose");
const Payment = require("../models/Payment.js");
const Student = require("../models/Student.js");
const Notification = require("../models/Notification.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";
const getLoggedUserId = (req) => req.user?._id || req.user?.id;

const generatePaymentId = async () => {
  const prefix = "SLB-PAY-";

  const lastPayment = await Payment.findOne({
    paymentId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastPayment?.paymentId) {
    const lastNumber = parseInt(lastPayment.paymentId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

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

const findStudentSafely = async (studentId) => {
  if (!studentId) return null;

  if (mongoose.Types.ObjectId.isValid(studentId)) {
    return Student.findById(studentId);
  }

  return Student.findOne({
    $or: [{ studentId }, { email: studentId }, { name: studentId }],
  });
};

const createPaymentStatusNotification = async ({
  req,
  student,
  payment,
  oldStatus,
  newStatus,
}) => {
  if (!student?.userId) return;
  if (!newStatus || oldStatus === newStatus) return;

  const notificationId = await generateNotificationId();

  let title = "Payment Status Updated";
  let message = `Dear ${student.name}, your payment ${payment.paymentId} status has been updated to ${newStatus}.`;

  if (newStatus === "Approved") {
    title = "Payment Approved";
    message = `Dear ${student.name}, your payment of ₹${payment.amount} has been approved. Your fee status is now Paid.`;
  }

  if (newStatus === "Rejected") {
    title = "Payment Rejected";
    message = `Dear ${student.name}, your payment of ₹${payment.amount} has been rejected. Please contact admin or submit correct payment details.`;
  }

  await Notification.create({
    notificationId,
    title,
    message,
    type: "Fee Reminder",
    audience: "Specific",
    branch: student.branch,
    recipientId: student.userId,
    recipientName: student.name,
    date: new Date().toISOString().split("T")[0],
    status: "Active",
    createdBy: getLoggedUserId(req),
  });
};

const getPaymentQueryByRole = (req) => {
  const role = req.user?.role;

  if (isAdmin(req)) return {};

  if (role === "branch_admin" || role === "faculty") {
    return { branch: getUserBranch(req) };
  }

  if (role === "student" || role === "parent") {
    return { studentId: req.user.referenceId };
  }

  return { branch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;
  return getUserBranch(req) === branchName;
};

exports.createPayment = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      amount,
      mode,
      transaction,
      date,
      proof,
      status,
      remarks,
    } = req.body;

    if (!studentId || !amount || !mode) {
      return res.status(400).json({
        message: "Student, amount and payment mode are required",
      });
    }

    const student = await findStudentSafely(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found. Please send valid student _id.",
      });
    }

    if (!restrictBranchAccess(req, student.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch student",
      });
    }

    const uploadedFilePath = req.file
      ? `/uploads/payments/${req.file.filename}`
      : null;

    const paymentId = await generatePaymentId();

    const payment = await Payment.create({
      paymentId,
      studentId: student._id,
      studentName: studentName || student.name,
      studentCode: studentCode || student.studentId,
      branch: branch || student.branch,
      course: course || student.course,
      amount: Number(amount),
      mode,
      transaction,
      date: date || new Date().toISOString().split("T")[0],
      proof: uploadedFilePath || proof,
      proofFileName: req.file?.originalname || "",
      status: status || "Pending",
      remarks,
    });

    res.status(201).json({
      message: "Payment submitted successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const query = getPaymentQueryByRole(req);

    const payments = await Payment.find(query)
      .populate("studentId", "name studentId branch course batch userId")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getPaymentQueryByRole(req),
    };

    const payment = await Payment.findOne(query).populate(
      "studentId",
      "name studentId branch course batch userId"
    );

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found or access denied",
      });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getPaymentQueryByRole(req),
    };

    const payment = await Payment.findOne(query);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found or access denied",
      });
    }

    const oldStatus = payment.status;

    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      amount,
      mode,
      transaction,
      date,
      proof,
      status,
      remarks,
    } = req.body;

    let student = await Student.findById(payment.studentId);

    if (studentId && String(studentId) !== String(payment.studentId)) {
      student = await findStudentSafely(studentId);

      if (!student) {
        return res.status(404).json({
          message: "Student not found. Please send valid student _id.",
        });
      }

      if (!restrictBranchAccess(req, student.branch)) {
        return res.status(403).json({
          message: "Access denied for selected student branch",
        });
      }

      payment.studentId = student._id;
      payment.studentName = studentName || student.name;
      payment.studentCode = studentCode || student.studentId;
      payment.branch = branch || student.branch;
      payment.course = course || student.course;
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    if (req.file) {
      payment.proof = `/uploads/payments/${req.file.filename}`;
      payment.proofFileName = req.file.originalname;
    }

    payment.studentName = studentName || payment.studentName;
    payment.studentCode = studentCode || payment.studentCode;
    payment.branch = branch || payment.branch;
    payment.course = course || payment.course;
    payment.amount = amount !== undefined ? Number(amount) : payment.amount;
    payment.mode = mode || payment.mode;
    payment.transaction = transaction || payment.transaction;
    payment.date = date || payment.date;
    payment.proof = req.file ? payment.proof : proof || payment.proof;
    payment.status = status || payment.status;
    payment.remarks = remarks || payment.remarks;

    if (status === "Approved" || status === "Rejected") {
      payment.verifiedBy = getLoggedUserId(req);
      payment.verifiedAt = new Date().toISOString();
    }

    await payment.save();

    if (status === "Approved") {
      await Student.findByIdAndUpdate(payment.studentId, {
        feeStatus: "Paid",
      });
    }

    if (status === "Rejected") {
      await Student.findByIdAndUpdate(payment.studentId, {
        feeStatus: "Pending",
      });
    }

    if (status && oldStatus !== status) {
      await createPaymentStatusNotification({
        req,
        student,
        payment,
        oldStatus,
        newStatus: status,
      });
    }

    res.json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getPaymentQueryByRole(req),
    };

    const payment = await Payment.findOne(query);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found or access denied",
      });
    }

    await Payment.findByIdAndDelete(payment._id);

    res.json({
      message: "Payment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};