const Faculty = require("../models/Faculty.js");
const User = require("../models/User.js");
const Branch = require("../models/Branch.js");

const branchCodes = {
  Kukatpally: "KKP",
  Miyapur: "MYP",
  "LB Nagar": "LBN",
  Secunderabad: "SCB",
  Gachibowli: "GCB",
  Hyderabad: "HYD",
};

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => {
  return adminRoles.includes(req.user?.role);
};

const getUserBranch = (req) => {
  return req.user?.branch || "";
};

const getBranchFilter = (req) => {
  if (isAdmin(req)) {
    return {};
  }

  if (req.user?.role === "branch_admin") {
    return { assignedBranch: getUserBranch(req) };
  }

  return { assignedBranch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) {
    return true;
  }

  return getUserBranch(req) === branchName;
};

const getBranchCode = (branchName = "") => {
  return (
    branchCodes[branchName] ||
    branchName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) ||
    "OTH"
  );
};

const generateFacultyId = async (branch) => {
  const branchCode = getBranchCode(branch);
  const prefix = `SLB-${branchCode}-FAC-`;

  const lastFaculty = await Faculty.findOne({
    facultyId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastFaculty?.facultyId) {
    const lastNumber = parseInt(lastFaculty.facultyId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
};

const syncBranchFacultyCounts = async (...branchNames) => {
  const uniqueBranches = [...new Set(branchNames.filter(Boolean))];

  await Promise.all(
    uniqueBranches.map(async (branchName) => {
      const count = await Faculty.countDocuments({
        assignedBranch: branchName,
        status: "Active",
      });

      await Branch.findOneAndUpdate(
        { name: branchName },
        { faculty: count },
        { new: true }
      );
    })
  );
};

exports.createFaculty = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      role,
      qualification,
      experience,
      specialization,
      assignedBranch,
      assignedBatches,
      status,
      password,
    } = req.body;

    if (!name || !email || !mobile || !assignedBranch || !role) {
      return res.status(400).json({
        message: "Name, mobile, email, role and branch are required",
      });
    }

    if (!restrictBranchAccess(req, assignedBranch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const branchExists = await Branch.findOne({ name: assignedBranch });

    if (!branchExists) {
      return res.status(400).json({
        message: "Selected branch does not exist",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const facultyId = await generateFacultyId(assignedBranch);

    const faculty = await Faculty.create({
      facultyId,
      name,
      mobile,
      email: cleanEmail,
      qualification,
      experience,
      specialization,
      assignedBranch,
      assignedBatches: normalizeArray(assignedBatches),
      status: status || "Active",
    });

    const user = await User.create({
      name,
      email: cleanEmail,
      phone: mobile,
      password: password || "faculty123",
      role: role || "faculty",
      branch: assignedBranch,
      referenceId: faculty._id,
      referenceModel: "Faculty",
      status: status || "Active",
    });

    faculty.userId = user._id;
    await faculty.save();

    await syncBranchFacultyCounts(assignedBranch);

    res.status(201).json({
      message: "Faculty and login user created successfully",
      faculty,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        status: user.status,
      },
      defaultPassword: password ? undefined : "faculty123",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFaculty = async (req, res) => {
  try {
    const query = getBranchFilter(req);

    const faculty = await Faculty.find(query)
      .populate("userId", "name email role branch status")
      .sort({ createdAt: -1 });

    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFacultyById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getBranchFilter(req),
    };

    const faculty = await Faculty.findOne(query).populate(
      "userId",
      "name email role branch status"
    );

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found or access denied",
      });
    }

    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (!restrictBranchAccess(req, faculty.assignedBranch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const {
      name,
      mobile,
      email,
      role,
      qualification,
      experience,
      specialization,
      assignedBranch,
      assignedBatches,
      status,
    } = req.body;

    if (assignedBranch && !restrictBranchAccess(req, assignedBranch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const oldBranch = faculty.assignedBranch;

    if (assignedBranch) {
      const branchExists = await Branch.findOne({ name: assignedBranch });

      if (!branchExists) {
        return res.status(400).json({
          message: "Selected branch does not exist",
        });
      }
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();

      const emailExists = await User.findOne({
        email: cleanEmail,
        _id: { $ne: faculty.userId },
      });

      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      faculty.email = cleanEmail;
    }

    faculty.name = name || faculty.name;
    faculty.mobile = mobile || faculty.mobile;
    faculty.qualification = qualification || faculty.qualification;
    faculty.experience = experience || faculty.experience;
    faculty.specialization = specialization || faculty.specialization;
    faculty.assignedBranch = assignedBranch || faculty.assignedBranch;
    faculty.assignedBatches =
      assignedBatches !== undefined
        ? normalizeArray(assignedBatches)
        : faculty.assignedBatches;
    faculty.status = status || faculty.status;

    await faculty.save();

    if (faculty.userId) {
      await User.findByIdAndUpdate(
        faculty.userId,
        {
          name: faculty.name,
          email: faculty.email,
          phone: faculty.mobile,
          status: faculty.status,
          role: role || "faculty",
          branch: faculty.assignedBranch,
        },
        { new: true }
      );
    }

    await syncBranchFacultyCounts(oldBranch, faculty.assignedBranch);

    const updatedFaculty = await Faculty.findById(req.params.id).populate(
      "userId",
      "name email role branch status"
    );

    res.json({
      message: "Faculty updated successfully",
      faculty: updatedFaculty,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (!restrictBranchAccess(req, faculty.assignedBranch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const oldBranch = faculty.assignedBranch;

    if (faculty.userId) {
      await User.findByIdAndDelete(faculty.userId);
    }

    await Faculty.findByIdAndDelete(req.params.id);

    await syncBranchFacultyCounts(oldBranch);

    res.json({
      message: "Faculty and login user deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};