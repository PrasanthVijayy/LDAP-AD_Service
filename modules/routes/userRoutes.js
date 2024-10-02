// User Routes page.

import express from "express";
import UserController from "../controllers/userController.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const userController = new UserController();

const userRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/users", router);

  router.post("/addUser", userController.addUser); // Add user
  router.get("/listUsers", apiLimiter(50), userController.listUsers); // List user
  router.put("/resetPwd", userController.resetPassword); // Reset password
  router.put("/deleteUser", userController.deleteUser); // Delete user (shadowFlag -> 0 or 1)
  router.put("/updateUser", userController.updateUser); // Update user
  router.put("/updateContactDetails", userController.updateContactDetails) // Update contactDetails only
  router.post("/modifyUserAccess", userController.updateUserStatus); // Enable or Disable user (shadowInactive -> 0 or 1)
  router.get("/getdisabledUsers", apiLimiter(10), userController.getdisabledUsers); // List disabledUsers
  router.post("/lockGroupMembers", userController.lockGroupMembers); // Lock users from groups
  router.post("/userLockAction", userController.userLockAction); // Lock or Unlock user (shadowExpire -> 0 or 1)
  router.get("/listLockedUsers", apiLimiter(10), userController.listLockedUsers); // List lockedUsers
  router.post("/listUpdatedUsers", userController.listUpdatedUsers); // List updatedUsers


  /* SELF SERVICE ROUTES */
  router.get("/search", userController.searchUser); // Search user
  router.post("/chpwd", userController.chpwd); // Change password
  router.post("/authenticate", userController.login); // Login
};

export default userRoutes;
