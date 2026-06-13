const mongoose = require("mongoose");
const Certificate = require("../models/Certificate.js");
const Student = require("../models/Student.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";
const getLoggedUserId = (req) => req.user?._id || req.user?.id;
const getLoggedUserName = (req) => req.user?.name || "System User";

const todayDate = () => new Date().toISOString().split("T")[0];

const generateCertificateId = async () => {
  const prefix = "SLB-CER-";

  const lastCertificate = await Certificate.findOne({
    certificateId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastCertificate?.certificateId) {
    const lastNumber = parseInt(
      lastCertificate.certificateId.split("-").pop(),
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

const getCertificateQueryByRole = (req) => {
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

const buildQrCode = (certificateId, studentCode) => {
  return `${certificateId}-${studentCode}`;
};

exports.createCertificate = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      courseCompleted,
      type,
      issueDate,
      date,
      facultyApproval,
      certificateFile,
      certificateFileName,
      certificatePdf,
      certificatePdfName,
      qrCode,
      qrCodeName,
      status,
      remarks,
    } = req.body;

    if (!studentId || !type) {
      return res.status(400).json({
        message: "Student and certificate type are required",
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

    const certificateId = await generateCertificateId();
    const finalStudentCode = studentCode || student.studentId;
    const finalIssueDate = issueDate || date || todayDate();
    const approvalStatus = facultyApproval || "Pending";

    const certificate = await Certificate.create({
      certificateId,
      studentId: student._id,
      studentName: studentName || student.name,
      studentCode: finalStudentCode,
      branch: branch || student.branch,
      course: course || student.course,
      courseCompleted: courseCompleted || course || student.course,
      type,
      issueDate: finalIssueDate,
      date: finalIssueDate,

      facultyApproval: approvalStatus,
      approvedBy: approvalStatus === "Approved" ? getLoggedUserId(req) : null,
      approvedByName:
        approvalStatus === "Approved" ? getLoggedUserName(req) : "",
      approvedAt:
        approvalStatus === "Approved" ? new Date().toISOString() : "",

      certificateFile: certificateFile || certificatePdf || "",
      certificateFileName:
        certificateFileName || certificatePdfName || "",
      certificatePdf: certificatePdf || certificateFile || "",
      certificatePdfName:
        certificatePdfName || certificateFileName || "",

      qrCode: qrCode || buildQrCode(certificateId, finalStudentCode),
      qrCodeName: qrCodeName || "",

      status: status || "Generated",
      remarks,
      generatedBy: getLoggedUserId(req),
      generatedByName: getLoggedUserName(req),
    });

    res.status(201).json({
      message: "Certificate generated successfully",
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getCertificates = async (req, res) => {
  try {
    const query = getCertificateQueryByRole(req);

    const { type, status, facultyApproval, branch, studentId } = req.query;

    if (type) query.type = type;
    if (status) query.status = status;
    if (facultyApproval) query.facultyApproval = facultyApproval;
    if (branch) query.branch = branch;
    if (studentId) query.studentId = studentId;

    const certificates = await Certificate.find(query)
      .populate("studentId", "name studentId branch course batch")
      .populate("generatedBy", "name email role")
      .populate("approvedBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(certificates);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query)
      .populate("studentId", "name studentId branch course batch")
      .populate("generatedBy", "name email role")
      .populate("approvedBy", "name email role");

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    res.json(certificate);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      courseCompleted,
      type,
      issueDate,
      date,
      facultyApproval,
      certificateFile,
      certificateFileName,
      certificatePdf,
      certificatePdfName,
      qrCode,
      qrCodeName,
      status,
      remarks,
    } = req.body;

    let selectedStudent = await Student.findById(certificate.studentId);

    if (studentId && String(studentId) !== String(certificate.studentId)) {
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

      certificate.studentId = selectedStudent._id;
      certificate.studentName = studentName || selectedStudent.name;
      certificate.studentCode = studentCode || selectedStudent.studentId;
      certificate.branch = branch || selectedStudent.branch;
      certificate.course = course || selectedStudent.course;
      certificate.courseCompleted =
        courseCompleted || course || selectedStudent.course;
      certificate.qrCode = buildQrCode(
        certificate.certificateId,
        selectedStudent.studentId
      );
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const oldApproval = certificate.facultyApproval;

    certificate.studentName = studentName || certificate.studentName;
    certificate.studentCode = studentCode || certificate.studentCode;
    certificate.branch = branch || certificate.branch;
    certificate.course = course || certificate.course;
    certificate.courseCompleted =
      courseCompleted || certificate.courseCompleted;
    certificate.type = type || certificate.type;

    certificate.issueDate = issueDate || date || certificate.issueDate;
    certificate.date = issueDate || date || certificate.date;

    certificate.facultyApproval =
      facultyApproval || certificate.facultyApproval;

    if (
      facultyApproval === "Approved" &&
      oldApproval !== "Approved"
    ) {
      certificate.approvedBy = getLoggedUserId(req);
      certificate.approvedByName = getLoggedUserName(req);
      certificate.approvedAt = new Date().toISOString();
    }

    if (facultyApproval === "Rejected") {
      certificate.approvedBy = getLoggedUserId(req);
      certificate.approvedByName = getLoggedUserName(req);
      certificate.approvedAt = new Date().toISOString();
    }

    certificate.certificateFile =
      certificateFile || certificatePdf || certificate.certificateFile;
    certificate.certificateFileName =
      certificateFileName ||
      certificatePdfName ||
      certificate.certificateFileName;

    certificate.certificatePdf =
      certificatePdf || certificateFile || certificate.certificatePdf;
    certificate.certificatePdfName =
      certificatePdfName ||
      certificateFileName ||
      certificate.certificatePdfName;

    certificate.qrCode = qrCode || certificate.qrCode;
    certificate.qrCodeName = qrCodeName || certificate.qrCodeName;

    certificate.status = status || certificate.status;
    certificate.remarks =
      remarks !== undefined ? remarks : certificate.remarks;

    await certificate.save();

    res.json({
      message: "Certificate updated successfully",
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    await Certificate.findByIdAndDelete(certificate._id);

    res.json({
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};