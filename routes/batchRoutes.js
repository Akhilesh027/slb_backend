const express = require("express");

const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
} = require("../controllers/batchController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/", protect, authorize("super_admin", "branch_admin", "faculty"), getBatches);
router.get("/:id", protect, authorize("super_admin", "branch_admin", "faculty"), getBatchById);
router.post("/", protect, authorize("super_admin", "branch_admin" ,"faculty"), createBatch);
router.put("/:id", protect, authorize("super_admin", "branch_admin", "faculty"), updateBatch);
router.delete("/:id", protect, authorize("super_admin"), deleteBatch);

module.exports = router;