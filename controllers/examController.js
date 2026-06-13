const mongoose = require("mongoose");
const Exam = require("../models/Exam.js");
const Student = require("../models/Student.js");
const Faculty = require("../models/Faculty.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";
const getLoggedUserId = (req) => req.user?._id || req.user?.id;
const getLoggedUserName = (req) => req.user?.name || "System User";

const todayDate = () => new Date().toISOString().split("T")[0];

const generateExamId = async () => {
  const prefix = "SLB-EXM-";

  const lastExam = await Exam.findOne({
    examId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastExam?.examId) {
    const lastNumber = parseInt(lastExam.examId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

const getGrade = (total) => {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "Fail";
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

const getExamQueryByRole = (req) => {
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

const getFacultyInfo = async (facultyId, fallbackName = "") => {
  if (!facultyId) {
    return {
      facultyId: null,
      facultyName: fallbackName || "",
    };
  }

  const faculty = await Faculty.findById(facultyId);

  if (!faculty) {
    return {
      facultyId: null,
      facultyName: fallbackName || "",
    };
  }

  return {
    facultyId: faculty._id,
    facultyName: faculty.name,
  };
};

exports.createExam = async (req, res) => {
  try {
    const {
      name,
      examType,
      type,
      examDate,
      date,
      startTime,
      endTime,
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      batch,
      facultyId,
      facultyName,
      examiner,
      practical,
      theory,
      viva,
      status,
      resultStatus,
      remarks,
    } = req.body;

    if (!name || !studentId) {
      return res.status(400).json({
        message: "Exam name and student are required",
      });
    }

    const student = await findStudentSafely(studentId);

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

    const practicalMarks = Number(practical) || 0;
    const theoryMarks = Number(theory) || 0;
    const vivaMarks = Number(viva) || 0;
    const total = practicalMarks + theoryMarks + vivaMarks;

    const facultyInfo = await getFacultyInfo(facultyId, facultyName || examiner);
    const examId = await generateExamId();

    const finalExamType = examType || type || "Monthly Assessment";
    const finalDate = examDate || date || todayDate();

    const exam = await Exam.create({
      examId,
      name,
      examType: finalExamType,
      type: finalExamType,
      examDate: finalDate,
      date: finalDate,
      startTime: startTime || "",
      endTime: endTime || "",

      studentId: student._id,
      studentName: studentName || student.name,
      studentCode: studentCode || student.studentId,
      branch: branch || student.branch,
      course: course || student.course,
      batch:
        batch ||
        (Array.isArray(student.batch) ? student.batch.join(", ") : student.batch),

      facultyId: facultyInfo.facultyId,
      facultyName: facultyInfo.facultyName,
      examiner: examiner || facultyInfo.facultyName,

      practical: practicalMarks,
      theory: theoryMarks,
      viva: vivaMarks,
      total,
      grade: getGrade(total),

      resultStatus: resultStatus || status || "Scheduled",
      status: resultStatus || status || "Scheduled",
      remarks,

      createdBy: getLoggedUserId(req),
      createdByName: getLoggedUserName(req),
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const query = getExamQueryByRole(req);

    const { examType, type, branch, course, batch, status, studentId } =
      req.query;

    if (examType || type) query.examType = examType || type;
    if (branch) query.branch = branch;
    if (course) query.course = course;
    if (batch) query.batch = { $regex: batch, $options: "i" };
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;

    const exams = await Exam.find(query)
      .populate("studentId", "name studentId branch course batch")
      .populate("facultyId", "name facultyId assignedBranch status")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query)
      .populate("studentId", "name studentId branch course batch")
      .populate("facultyId", "name facultyId assignedBranch status")
      .populate("createdBy", "name email role");

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    const {
      name,
      examType,
      type,
      examDate,
      date,
      startTime,
      endTime,
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      batch,
      facultyId,
      facultyName,
      examiner,
      practical,
      theory,
      viva,
      status,
      resultStatus,
      remarks,
    } = req.body;

    let selectedStudent = await Student.findById(exam.studentId);

    if (studentId && String(studentId) !== String(exam.studentId)) {
      selectedStudent = await findStudentSafely(studentId);

      if (!selectedStudent) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      if (!restrictBranchAccess(req, selectedStudent.branch)) {
        return res.status(403).json({
          message: "Access denied for selected student branch",
        });
      }

      exam.studentId = selectedStudent._id;
      exam.studentName = studentName || selectedStudent.name;
      exam.studentCode = studentCode || selectedStudent.studentId;
      exam.branch = branch || selectedStudent.branch;
      exam.course = course || selectedStudent.course;
      exam.batch =
        batch ||
        (Array.isArray(selectedStudent.batch)
          ? selectedStudent.batch.join(", ")
          : selectedStudent.batch);
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const practicalMarks =
      practical !== undefined ? Number(practical) || 0 : exam.practical;

    const theoryMarks =
      theory !== undefined ? Number(theory) || 0 : exam.theory;

    const vivaMarks = viva !== undefined ? Number(viva) || 0 : exam.viva;

    const total = practicalMarks + theoryMarks + vivaMarks;

    let facultyInfo = {
      facultyId: exam.facultyId,
      facultyName: exam.facultyName,
    };

    if (facultyId !== undefined) {
      facultyInfo = await getFacultyInfo(facultyId, facultyName || examiner);
    }

    const finalExamType = examType || type || exam.examType;
    const finalDate = examDate || date || exam.examDate;

    exam.name = name || exam.name;
    exam.examType = finalExamType;
    exam.type = finalExamType;

    exam.examDate = finalDate;
    exam.date = finalDate;
    exam.startTime = startTime !== undefined ? startTime : exam.startTime;
    exam.endTime = endTime !== undefined ? endTime : exam.endTime;

    exam.studentName = studentName || exam.studentName;
    exam.studentCode = studentCode || exam.studentCode;
    exam.branch = branch || exam.branch;
    exam.course = course || exam.course;
    exam.batch = batch || exam.batch;

    exam.facultyId = facultyInfo.facultyId;
    exam.facultyName = facultyInfo.facultyName;
    exam.examiner = examiner || facultyInfo.facultyName || exam.examiner;

    exam.practical = practicalMarks;
    exam.theory = theoryMarks;
    exam.viva = vivaMarks;
    exam.total = total;
    exam.grade = getGrade(total);

    exam.resultStatus = resultStatus || status || exam.resultStatus;
    exam.status = resultStatus || status || exam.status;
    exam.remarks = remarks !== undefined ? remarks : exam.remarks;

    await exam.save();

    res.json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    await Exam.findByIdAndDelete(exam._id);

    res.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};