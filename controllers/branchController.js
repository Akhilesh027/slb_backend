const Branch = require("../models/Branch.js");
const Faculty = require("../models/Faculty.js");
const Student = require("../models/Student.js");
const { restrictBranchAccess } = require("../utils/branchAccess.js");

const generateBranchCode = async (name) => {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const shortCode = cleanName.slice(0, 3) || "BRN";
  const prefix = `SLB-${shortCode}-BR-`;

  const lastBranch = await Branch.findOne({
    branchCode: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastBranch?.branchCode) {
    const lastNumber = parseInt(lastBranch.branchCode.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

const getLiveBranchCounts = async (branchName) => {
  const students = await Student.countDocuments({
    branch: branchName,
    status: "Active",
  });

  const faculty = await Faculty.countDocuments({
    assignedBranch: branchName,
    status: "Active",
  });

  return { students, faculty };
};

exports.createBranch = async (req, res) => {
  try {
    const { name, location, managerId, managerName, contact, status } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        message: "Branch name and location are required",
      });
    }

    const existingBranch = await Branch.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingBranch) {
      return res.status(400).json({
        message: "Branch already exists",
      });
    }

    const branchCode = await generateBranchCode(name);

    const branch = await Branch.create({
      branchCode,
      name,
      location,
      managerId: managerId || null,
      managerName: managerName || "Not Assigned",
      contact,
      students: 0,
      faculty: 0,
      status: status || "Active",
    });

    res.status(201).json({
      message: "Branch created successfully",
      branch,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const query = {};

    if (req.user?.role === "branch_admin" || req.user?.role === "faculty") {
      query.name = req.user.branch;
    }

    const branches = await Branch.find(query)
      .populate("managerId", "name email role branch status")
      .sort({ createdAt: -1 });

    const branchesWithCounts = await Promise.all(
      branches.map(async (branch) => {
        const counts = await getLiveBranchCounts(branch.name);

        branch.students = counts.students;
        branch.faculty = counts.faculty;
        await branch.save();

        return branch;
      })
    );

    res.json(branchesWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate(
      "managerId",
      "name email role branch status"
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (!restrictBranchAccess(req, branch.name)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const counts = await getLiveBranchCounts(branch.name);

    branch.students = counts.students;
    branch.faculty = counts.faculty;
    await branch.save();

    res.json(branch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (!restrictBranchAccess(req, branch.name)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const { name, location, managerId, managerName, contact, status } = req.body;
    const oldName = branch.name;

    if (name && name !== oldName) {
      const existingBranch = await Branch.findOne({
        _id: { $ne: branch._id },
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (existingBranch) {
        return res.status(400).json({
          message: "Another branch with this name already exists",
        });
      }
    }

    branch.name = name || branch.name;
    branch.location = location || branch.location;
    branch.managerId = managerId || branch.managerId;
    branch.managerName = managerName || branch.managerName;
    branch.contact = contact || branch.contact;
    branch.status = status || branch.status;

    await branch.save();

    if (name && name !== oldName) {
      await Faculty.updateMany(
        { assignedBranch: oldName },
        { assignedBranch: name }
      );

      await Student.updateMany({ branch: oldName }, { branch: name });
    }

    const counts = await getLiveBranchCounts(branch.name);

    branch.students = counts.students;
    branch.faculty = counts.faculty;
    await branch.save();

    const updatedBranch = await Branch.findById(req.params.id).populate(
      "managerId",
      "name email role branch status"
    );

    res.json({
      message: "Branch updated successfully",
      branch: updatedBranch,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (!restrictBranchAccess(req, branch.name)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const activeStudents = await Student.countDocuments({
      branch: branch.name,
      status: "Active",
    });

    const activeFaculty = await Faculty.countDocuments({
      assignedBranch: branch.name,
      status: "Active",
    });

    if (activeStudents > 0 || activeFaculty > 0) {
      return res.status(400).json({
        message:
          "Cannot delete branch because students or faculty are assigned to this branch",
      });
    }

    await Branch.findByIdAndDelete(req.params.id);

    res.json({ message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};