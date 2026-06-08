const User = require("../models/User.js");

exports.getBranchAdmins = async (req, res) => {
  try {
    const users = await User.find({
      role: "branch_admin",
      status: "Active",
    })
      .select("name email phone role branch status")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};