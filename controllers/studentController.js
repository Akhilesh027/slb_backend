const Student = require("../models/Student.js");
const User = require("../models/User.js");
const Branch = require("../models/Branch.js");
const Course = require("../models/Course.js");
const Batch = require("../models/Batch.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);

const getUserBranch = (req) => req.user?.branch || "";

const getStudentBranchFilter = (req) => {
  if (isAdmin(req)) return {};

  if (req.user?.role === "branch_admin" || req.user?.role === "faculty") {
    return { branch: getUserBranch(req) };
  }

  if (req.user?.role === "student" || req.user?.role === "parent") {
    return { _id: req.user.referenceId };
  }

  return { branch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;
  return getUserBranch(req) === branchName;
};

const getBranchCode = (branchName = "") => {
  return (
    branchName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) || "OTH"
  );
};

const generateStudentId = async (branch) => {
  const branchCode = getBranchCode(branch);
  const prefix = `SLB-${branchCode}-STU-`;

  const lastStudent = await Student.findOne({
    studentId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastStudent?.studentId) {
    const lastNumber = parseInt(lastStudent.studentId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

const normalizeBatches = (batch) => {
  if (Array.isArray(batch)) return batch;
  if (!batch) return [];
  return [batch];
};

const syncBranchStudentCounts = async (...branchNames) => {
  const uniqueBranches = [...new Set(branchNames.filter(Boolean))];

  await Promise.all(
    uniqueBranches.map(async (branchName) => {
      const count = await Student.countDocuments({
        branch: branchName,
        status: "Active",
      });

      await Branch.findOneAndUpdate(
        { name: branchName },
        { students: count },
        { new: true }
      );
    })
  );
};

const syncBatchEnrollmentCounts = async (...batchNames) => {
  const uniqueBatches = [...new Set(batchNames.flat().filter(Boolean))];

  await Promise.all(
    uniqueBatches.map(async (batchName) => {
      const batchDocs = await Batch.find({ batchName });

      await Promise.all(
        batchDocs.map(async (batchDoc) => {
          const count = await Student.countDocuments({
            batch: batchName,
            branch: batchDoc.branch,
            status: "Active",
          });

          await Batch.findByIdAndUpdate(
            batchDoc._id,
            { enrolled: count },
            { new: true }
          );
        })
      );
    })
  );
};

exports.createStudent = async (req, res) => {
  let createdStudent = null;

  try {
    const {
      name,
      gender,
      dob,
      parentName,
      parentMobile,
      studentMobile,
      email,
      address,
      branch,
      course,
      batch,
      trainingMode,
      admissionDate,
      feeStatus,
      attendancePercentage,
      status,
      password,
    } = req.body;

    if (!name || !email || !studentMobile || !branch || !course) {
      return res.status(400).json({
        message: "Name, mobile, email, branch and course are required",
      });
    }

    if (!restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const selectedBatches = normalizeBatches(batch);

    const branchExists = await Branch.findOne({ name: branch });

    if (!branchExists) {
      return res.status(400).json({
        message: "Selected branch does not exist",
      });
    }

    const courseExists = await Course.findOne({
      courseName: course,
      status: "Active",
    });

    if (!courseExists) {
      return res.status(400).json({
        message: "Selected course does not exist or is inactive",
      });
    }

    if (selectedBatches.length > 0) {
      const activeBatches = await Batch.find({
        batchName: { $in: selectedBatches },
        branch,
        status: "Active",
      });

      if (activeBatches.length !== selectedBatches.length) {
        return res.status(400).json({
          message:
            "One or more selected batches are invalid, inactive, or not available in selected branch",
        });
      }
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const studentId = await generateStudentId(branch);

    createdStudent = await Student.create({
      studentId,
      name,
      gender,
      dob,
      parentName,
      parentMobile,
      studentMobile,
      email: cleanEmail,
      address,
      branch,
      course,
      batch: selectedBatches,
      trainingMode,
      admissionDate,
      feeStatus: feeStatus || "Pending",
      attendancePercentage: Number(attendancePercentage) || 0,
      status: status || "Active",
    });

    const user = await User.create({
      name,
      email: cleanEmail,
      phone: studentMobile,
      password: password || "student123",
      role: "student",
      branch,
      referenceId: createdStudent._id,
      referenceModel: "Student",
      status: status || "Active",
    });

    createdStudent.userId = user._id;
    await createdStudent.save();

    await syncBranchStudentCounts(branch);
    await syncBatchEnrollmentCounts(selectedBatches);

    res.status(201).json({
      message: "Student and login user created successfully",
      student: createdStudent,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        status: user.status,
      },
      defaultPassword: password ? undefined : "student123",
    });
  } catch (error) {
    if (createdStudent?._id) {
      await Student.findByIdAndDelete(createdStudent._id);
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const query = getStudentBranchFilter(req);

    const students = await Student.find(query)
      .populate("userId", "name email role branch status")
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    let query = {
      _id: req.params.id,
    };

    if (!isAdmin(req)) {
      if (req.user?.role === "student" || req.user?.role === "parent") {
        query._id = req.user.referenceId;
      } else {
        query.branch = getUserBranch(req);
      }
    }

    const student = await Student.findOne(query).populate(
      "userId",
      "name email role branch status"
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found or access denied",
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (!restrictBranchAccess(req, student.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const {
      name,
      gender,
      dob,
      parentName,
      parentMobile,
      studentMobile,
      email,
      address,
      branch,
      course,
      batch,
      trainingMode,
      admissionDate,
      feeStatus,
      attendancePercentage,
      status,
    } = req.body;

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const oldBranch = student.branch;
    const oldBatches = student.batch || [];
    const selectedBatches =
      batch !== undefined ? normalizeBatches(batch) : student.batch;
    const finalBranch = branch || student.branch;

    if (branch) {
      const branchExists = await Branch.findOne({ name: branch });

      if (!branchExists) {
        return res.status(400).json({
          message: "Selected branch does not exist",
        });
      }
    }

    if (course) {
      const courseExists = await Course.findOne({
        courseName: course,
        status: "Active",
      });

      if (!courseExists) {
        return res.status(400).json({
          message: "Selected course does not exist or is inactive",
        });
      }
    }

    if (selectedBatches.length > 0) {
      const activeBatches = await Batch.find({
        batchName: { $in: selectedBatches },
        branch: finalBranch,
        status: "Active",
      });

      if (activeBatches.length !== selectedBatches.length) {
        return res.status(400).json({
          message:
            "One or more selected batches are invalid, inactive, or not available in selected branch",
        });
      }
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();

      const emailExists = await User.findOne({
        email: cleanEmail,
        _id: { $ne: student.userId },
      });

      if (emailExists) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      student.email = cleanEmail;
    }

    student.name = name || student.name;
    student.gender = gender || student.gender;
    student.dob = dob || student.dob;
    student.parentName = parentName || student.parentName;
    student.parentMobile = parentMobile || student.parentMobile;
    student.studentMobile = studentMobile || student.studentMobile;
    student.address = address || student.address;
    student.branch = branch || student.branch;
    student.course = course || student.course;
    student.batch = selectedBatches;
    student.trainingMode = trainingMode || student.trainingMode;
    student.admissionDate = admissionDate || student.admissionDate;
    student.feeStatus = feeStatus || student.feeStatus;
    student.attendancePercentage =
      attendancePercentage !== undefined
        ? Number(attendancePercentage) || 0
        : student.attendancePercentage;
    student.status = status || student.status;

    await student.save();

    if (student.userId) {
      await User.findByIdAndUpdate(
        student.userId,
        {
          name: student.name,
          email: student.email,
          phone: student.studentMobile,
          status: student.status,
          role: "student",
          branch: student.branch,
        },
        { new: true }
      );
    }

    await syncBranchStudentCounts(oldBranch, student.branch);
    await syncBatchEnrollmentCounts(oldBatches, student.batch);

    const updatedStudent = await Student.findById(req.params.id).populate(
      "userId",
      "name email role branch status"
    );

    res.json({
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (!restrictBranchAccess(req, student.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const oldBranch = student.branch;
    const oldBatches = student.batch || [];

    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    await Student.findByIdAndDelete(req.params.id);

    await syncBranchStudentCounts(oldBranch);
    await syncBatchEnrollmentCounts(oldBatches);

    res.json({
      message: "Student and login user deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};