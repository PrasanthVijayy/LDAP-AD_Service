import express from "express";
import GroupController from "../controllers/groupController.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/groups", router);

  router.post("/createGroup", groupController.createGroup); // Create group 
  router.get("/listGroups", groupController.listGroups); // List groups - additional
  router.post("/addToGroup", groupController.addToGroup); // Add user to group
  router.delete("/deleteFromGroup", groupController.deleteFromGroup); // Delete user from group
  router.get("/membersInGroup", groupController.membersInGroup); // List members in group - additional
  router.post("/addToAdminGroup", groupController.addToAdminGroup); // Add user to admin group
  router.delete("/deleteFromAdminGroup", groupController.deleteFromAdminGroup); // Delete user from admin group
  router.delete("/deleteMemberFromGroups", groupController.deleteUserFromGroups); // Delete member from all groups
};
export default groupRoutes;
