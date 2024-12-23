"use strict";
import express from "express";
import UserController from "../../activeDirectory/controllers/userController.js";
import apiLimiter from "../../../middleware/apiLimiter.js";
import { sessionMiddleware } from "../../../middleware/sessionMiddleware.js";
import csrfProtection from "../../../UI/libs/csurfProtection.js";

const userController = new UserController();

const adUserRoutes = (app) => {
  const router = express.Router();
  app.use("/AD/v1/users", router);

  router.post("/addUser", csrfProtection, sessionMiddleware, apiLimiter(), userController.addUser); // Add user
  router.get("/listUsers", csrfProtection, sessionMiddleware, apiLimiter(), userController.listUsers); // List user
  router.put("/resetPwd", csrfProtection, sessionMiddleware, apiLimiter(), userController.resetPassword); // Reset password
  router.delete("/deleteUser", csrfProtection, sessionMiddleware, apiLimiter(), userController.deleteUser); // Delete user
  router.put("/updateUser", csrfProtection, sessionMiddleware, apiLimiter(), userController.updateUser); // Update user
  router.put("/updateContactDetails", csrfProtection, sessionMiddleware, apiLimiter(), userController.updateContactDetails); // Update contactDetails only
  router.post("/modifyUserAccess", csrfProtection, sessionMiddleware, apiLimiter(), userController.updateUserStatus); // Enable or Disable user (shadowInactive -> 0 or 1)
  router.get("/getdisabledUsers", csrfProtection, sessionMiddleware, apiLimiter(), userController.getdisabledUsers); // List disabledUsers
  router.post("/lockGroupMembers", csrfProtection, sessionMiddleware, apiLimiter(), userController.lockGroupMembers); // Lock users from groups
  router.post("/userLockAction", csrfProtection, sessionMiddleware, apiLimiter(), userController.userLockAction); // Lock or Unlock user (shadowExpire -> 0 or 1)
  router.get("/listLockedUsers", csrfProtection, sessionMiddleware, apiLimiter(), userController.listLockedUsers); // List lockedUsers
  router.post("/listUpdatedUsers", csrfProtection, sessionMiddleware, apiLimiter(), userController.listUpdatedUsers); // List updatedUsers
  router.post("/groupMembership", csrfProtection, sessionMiddleware, apiLimiter(), userController.groupMembership); // Group membership of  a user

  /* SELF SERVICE ROUTES */
  router.get("/search", csrfProtection, sessionMiddleware, apiLimiter(), userController.searchUser); // Search user
  router.post("/chpwd", csrfProtection, sessionMiddleware, apiLimiter(), userController.chpwd); // Change password
  router.post("/authenticate", apiLimiter(), userController.login); // Login
};

export default adUserRoutes;
