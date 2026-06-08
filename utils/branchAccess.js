const getBranchFilter = (req, field = "branch") => {
  if (req.user?.role === "branch_admin" || req.user?.role === "faculty") {
    return req.user.branch ? { [field]: req.user.branch } : {};
  }

  return {};
};

const restrictBranchAccess = (req, branchName) => {
  if (req.user?.role === "super_admin") return true;

  if (req.user?.role === "branch_admin" || req.user?.role === "faculty") {
    return req.user.branch === branchName;
  }

  return true;
};

module.exports = {
  getBranchFilter,
  restrictBranchAccess,
};