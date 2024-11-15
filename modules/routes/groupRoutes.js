import express from "express";
import GroupController from "../controllers/groupController.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/groups", router);

  router.post("/createGroup", sessionMiddleware, apiLimiter(), groupController.createGroup); // Create group 
  router.get("/listGroups", sessionMiddleware, apiLimiter(),  groupController.listGroups); // List groups - additional
  router.post("/addToGroup", sessionMiddleware, apiLimiter(), groupController.addToGroup); // Add user to group
  router.delete("/deleteFromGroup", sessionMiddleware, apiLimiter(),  groupController.deleteFromGroup); // Delete user from group
  router.get("/membersInGroup", sessionMiddleware, apiLimiter(30), groupController.membersInGroup); // List members in group - additional
  router.post("/addToAdminGroup", sessionMiddleware, apiLimiter(), groupController.addToAdminGroup); // Add user to admin group
  router.delete("/deleteFromAdminGroup", sessionMiddleware, apiLimiter(), groupController.deleteFromAdminGroup); // Delete user from admin group
  router.delete("/deleteMemberFromGroups", sessionMiddleware, apiLimiter(), groupController.deleteUserFromGroups); // Delete member from all groups
};
export default groupRoutes;
