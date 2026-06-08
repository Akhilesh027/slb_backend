const express = require("express");

const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, authorize("super_admin"), createBranch);
router.get("/", protect, authorize("super_admin", "branch_admin"), getBranches);
router.get("/:id", protect, authorize("super_admin", "branch_admin"), getBranchById);
router.put("/:id", protect, authorize("super_admin"), updateBranch);
router.delete("/:id", protect, authorize("super_admin"), deleteBranch);

module.exports = router;