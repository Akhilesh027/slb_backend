const Attendance = require("../models/Attendance.js");
const Student = require("../models/Student.js");
const Notification = require("../models/Notification.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";

const generateAttendanceId = async () => {
  const prefix = "SLB-ATT-";

  const last = await Attendance.findOne({
    attendanceId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (last?.attendanceId) {
    const lastNumber = parseInt(last.attendanceId.split("-").pop(), 10);
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

const createAttendanceNotification = async ({
  req,
  student,
  attendance,
  action = "marked",
}) => {
  if (!student?.userId) return;

  const notificationId = await generateNotificationId();

  await Notification.create({
    notificationId,
    title: `Attendance ${action}`,
    message: `Dear ${student.name}, your attendance for ${attendance.date} has been ${action} as ${attendance.status}.`,
    type: "General Announcement",
    audience: "Specific",
    branch: student.branch,
    recipientId: student.userId,
    recipientName: student.name,
    date: new Date().toISOString().split("T")[0],
    status: "Active",
    createdBy: req.user?._id || req.user?.id,
  });
};

const updateStudentAttendancePercentage = async (studentId) => {
  const total = await Attendance.countDocuments({
    studentId,
    status: { $ne: "Holiday" },
  });

  const present = await Attendance.countDocuments({
    studentId,
    status: "Present",
  });

  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  await Student.findByIdAndUpdate(studentId, {
    attendancePercentage: percentage,
  });
};

const getAttendanceQueryByRole = (req) => {
  const role = req.user?.role;
  const referenceId = req.user?.referenceId;

  if (isAdmin(req)) return {};

  if (role === "branch_admin" || role === "faculty") {
    return { branch: getUserBranch(req) };
  }

  if (role === "student") {
    return { studentId: referenceId };
  }

  if (role === "parent") {
    return { studentId: req.user?.studentId || referenceId };
  }

  return { branch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;

  const userBranch = getUserBranch(req);

  return userBranch && userBranch === branchName;
};

exports.createAttendance = async (req, res) => {
  try {
    const {
      date,
      studentId,
      studentName,
      studentCode,
      batch,
      course,
      branch,
      facultyId,
      facultyName,
      mode,
      status,
      remarks,
    } = req.body;

    if (!date || !studentId) {
      return res.status(400).json({
        message: "Date and student are required",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (!restrictBranchAccess(req, student.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch student",
      });
    }

    const alreadyMarked = await Attendance.findOne({
      date,
      studentId,
    });

    if (alreadyMarked) {
      return res.status(400).json({
        message: "Attendance already marked for this student on this date",
      });
    }

    const attendanceId = await generateAttendanceId();

    const finalFacultyId =
      req.user?.role === "faculty"
        ? req.user.referenceId
        : facultyId || req.user?._id || req.user?.id;

    const finalFacultyName = req.user?.name || facultyName || "System User";

    const attendance = await Attendance.create({
      attendanceId,
      date,
      studentId,
      studentName: studentName || student.name,
      studentCode: studentCode || student.studentId,
      batch:
        batch ||
        (Array.isArray(student.batch)
          ? student.batch.join(", ")
          : student.batch),
      course: course || student.course,
      branch: branch || student.branch,
      facultyId: finalFacultyId,
      facultyName: finalFacultyName,
      mode: mode || student.trainingMode,
      status: status || "Present",
      remarks,
    });

    await updateStudentAttendancePercentage(studentId);

    await createAttendanceNotification({
      req,
      student,
      attendance,
      action: "marked",
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const query = getAttendanceQueryByRole(req);

    const attendance = await Attendance.find(query)
      .populate("studentId", "name studentId branch course batch trainingMode")
      .populate("facultyId", "name email role")
      .sort({ date: -1, createdAt: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getAttendanceById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getAttendanceQueryByRole(req),
    };

    const attendance = await Attendance.findOne(query)
      .populate("studentId", "name studentId branch course batch trainingMode")
      .populate("facultyId", "name email role");

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance not found or access denied",
      });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const {
      date,
      studentId,
      studentName,
      studentCode,
      batch,
      course,
      branch,
      facultyId,
      facultyName,
      mode,
      status,
      remarks,
    } = req.body;

    const query = {
      _id: req.params.id,
      ...getAttendanceQueryByRole(req),
    };

    const attendance = await Attendance.findOne(query);

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance not found or access denied",
      });
    }

    const oldStudentId = attendance.studentId;

    let selectedStudent = await Student.findById(attendance.studentId);

    if (studentId && String(studentId) !== String(attendance.studentId)) {
      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      if (!restrictBranchAccess(req, student.branch)) {
        return res.status(403).json({
          message: "Access denied for selected student branch",
        });
      }

      const duplicate = await Attendance.findOne({
        _id: { $ne: attendance._id },
        date: date || attendance.date,
        studentId,
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Attendance already marked for this student on this date",
        });
      }

      selectedStudent = student;
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    attendance.date = date || attendance.date;
    attendance.studentId = studentId || attendance.studentId;
    attendance.studentName = studentName || attendance.studentName;
    attendance.studentCode = studentCode || attendance.studentCode;
    attendance.batch = batch || attendance.batch;
    attendance.course = course || attendance.course;
    attendance.branch = branch || attendance.branch;
    attendance.facultyId =
      req.user?.role === "faculty"
        ? req.user.referenceId
        : facultyId || attendance.facultyId;
    attendance.facultyName =
      req.user?.name || facultyName || attendance.facultyName;
    attendance.mode = mode || attendance.mode;
    attendance.status = status || attendance.status;
    attendance.remarks = remarks || attendance.remarks;

    await attendance.save();

    await updateStudentAttendancePercentage(attendance.studentId);

    if (String(oldStudentId) !== String(attendance.studentId)) {
      await updateStudentAttendancePercentage(oldStudentId);
    }

    await createAttendanceNotification({
      req,
      student: selectedStudent,
      attendance,
      action: "updated",
    });

    res.json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getAttendanceQueryByRole(req),
    };

    const attendance = await Attendance.findOne(query);

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance not found or access denied",
      });
    }

    const studentId = attendance.studentId;

    await Attendance.findByIdAndDelete(attendance._id);

    await updateStudentAttendancePercentage(studentId);

    res.json({
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};