import express from "express";
import {
  listGroups,
  addToGroup,
  deleteFromGroup,
} from "../controllers/groupController.js";

const router = express.Router();

router.get("/listgroups", listGroups);
router.post("/addtogroup", addToGroup);
router.post("/deletefromgroup", deleteFromGroup);

export default router;
