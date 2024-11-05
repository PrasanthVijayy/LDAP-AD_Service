import express from "express";
import GroupController from "../controllers/groupController.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/groups", router);

    // SESSION CHECK ROUTE
    router.get("/session/check", sessionMiddleware, (res) => {
      res.status(200).json({ status: "success", message: "Session is active" });
    });

  router.post("/createGroup", sessionMiddleware, groupController.createGroup); // Create group 
  router.get("/listGroups", sessionMiddleware, apiLimiter(30), groupController.listGroups); // List groups - additional
  router.post("/addToGroup", sessionMiddleware, groupController.addToGroup); // Add user to group
  router.delete("/deleteFromGroup", sessionMiddleware, groupController.deleteFromGroup); // Delete user from group
  router.get("/membersInGroup", sessionMiddleware, apiLimiter(30), groupController.membersInGroup); // List members in group - additional
  router.post("/addToAdminGroup", sessionMiddleware, groupController.addToAdminGroup); // Add user to admin group
  router.delete("/deleteFromAdminGroup", sessionMiddleware, groupController.deleteFromAdminGroup); // Delete user from admin group
  router.delete("/deleteMemberFromGroups", sessionMiddleware, groupController.deleteUserFromGroups); // Delete member from all groups
};
export default groupRoutes;
