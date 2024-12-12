"use strict";
import express from "express";
import GroupController from "../../openLdap/controllers/groupController.js";
import { sessionMiddleware } from "../../../middleware/sessionMiddleware.js";
import apiLimiter from "../../../middleware/apiLimiter.js";
import csrfProtection from "../../../UI/libs/csurfProtection.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/groups", router);

  router.post("/createGroup", csrfProtection, sessionMiddleware, apiLimiter(), groupController.createGroup); // Create group 
  router.get("/listGroups", csrfProtection, sessionMiddleware, apiLimiter(),  groupController.listGroups); // List groups - additional
  router.post("/addToGroup", csrfProtection, sessionMiddleware, apiLimiter(), groupController.addToGroup); // Add user to group
  router.delete("/deleteFromGroup", csrfProtection, sessionMiddleware, apiLimiter(),  groupController.deleteFromGroup); // Delete user from group
  router.get("/membersInGroup", csrfProtection, sessionMiddleware, apiLimiter(30), groupController.membersInGroup); // List members in group - additional
  router.post("/addToAdminGroup", csrfProtection, sessionMiddleware, apiLimiter(), groupController.addToAdminGroup); // Add user to admin group
  router.delete("/deleteFromAdminGroup", csrfProtection, sessionMiddleware, apiLimiter(), groupController.deleteFromAdminGroup); // Delete user from admin group
  router.delete("/deleteMemberFromGroups", csrfProtection, sessionMiddleware, apiLimiter(), groupController.deleteUserFromGroups); // Delete member from all groups
};
export default groupRoutes;
