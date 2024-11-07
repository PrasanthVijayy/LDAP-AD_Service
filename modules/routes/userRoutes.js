import express from "express";
import UserController from "../controllers/userController.js";
import apiLimiter from "../../middleware/apiLimiter.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";

const userController = new UserController();

const userRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/users", router);

  router.post("/addUser", sessionMiddleware, userController.addUser); // Add user
  router.get("/listUsers", sessionMiddleware,  apiLimiter(30), userController.listUsers); // List user
  router.put("/resetPwd", sessionMiddleware, userController.resetPassword); // Reset password
  router.delete("/deleteUser", sessionMiddleware, userController.deleteUser); // Delete user
  router.put("/updateUser", sessionMiddleware, apiLimiter(5), userController.updateUser); // Update user
  router.put("/updateContactDetails", sessionMiddleware, apiLimiter(5), userController.updateContactDetails); // Update contactDetails only
  router.post("/modifyUserAccess", sessionMiddleware, userController.updateUserStatus); // Enable or Disable user (shadowInactive -> 0 or 1)
  router.get("/getdisabledUsers", sessionMiddleware, apiLimiter(10), userController.getdisabledUsers); // List disabledUsers
  router.post("/lockGroupMembers", sessionMiddleware, userController.lockGroupMembers); // Lock users from groups
  router.post("/userLockAction", sessionMiddleware, userController.userLockAction); // Lock or Unlock user (shadowExpire -> 0 or 1)
  router.get("/listLockedUsers",  sessionMiddleware, apiLimiter(10), userController.listLockedUsers); // List lockedUsers
  router.post("/listUpdatedUsers", sessionMiddleware, userController.listUpdatedUsers); // List updatedUsers


  /* SELF SERVICE ROUTES */
  router.get("/search", sessionMiddleware, userController.searchUser); // Search user
  router.post("/chpwd", sessionMiddleware, userController.chpwd); // Change password
  router.post("/authenticate", userController.login); // Login
};

export default userRoutes;
