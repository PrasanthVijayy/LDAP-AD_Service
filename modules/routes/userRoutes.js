import express from "express";
import UserController from "../controllers/userController.js";
import apiLimiter from "../../middleware/apiLimiter.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";

const userController = new UserController();

const userRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/users", router);

  router.post("/addUser", sessionMiddleware, apiLimiter(), userController.addUser); // Add user
  router.get("/listUsers", sessionMiddleware,  apiLimiter(), userController.listUsers); // List user
  router.put("/resetPwd", sessionMiddleware, apiLimiter(), userController.resetPassword); // Reset password
  router.delete("/deleteUser", sessionMiddleware, apiLimiter(), userController.deleteUser); // Delete user
  router.put("/updateUser", sessionMiddleware, apiLimiter(), userController.updateUser); // Update user
  router.put("/updateContactDetails", sessionMiddleware, apiLimiter(), userController.updateContactDetails); // Update contactDetails only
  router.post("/modifyUserAccess", sessionMiddleware, apiLimiter(), userController.updateUserStatus); // Enable or Disable user (shadowInactive -> 0 or 1)
  router.get("/getdisabledUsers", sessionMiddleware, apiLimiter(), userController.getdisabledUsers); // List disabledUsers
  router.post("/lockGroupMembers", sessionMiddleware, apiLimiter(),userController.lockGroupMembers); // Lock users from groups
  router.post("/userLockAction", sessionMiddleware, apiLimiter(), userController.userLockAction); // Lock or Unlock user (shadowExpire -> 0 or 1)
  router.get("/listLockedUsers",  sessionMiddleware, apiLimiter(), userController.listLockedUsers); // List lockedUsers
  router.post("/listUpdatedUsers", sessionMiddleware, apiLimiter(),userController.listUpdatedUsers); // List updatedUsers


  /* SELF SERVICE ROUTES */
  router.get("/search",  sessionMiddleware, apiLimiter(), userController.searchUser); // Search user
  router.post("/chpwd",  sessionMiddleware, apiLimiter(), userController.chpwd); // Change password
  router.post("/authenticate", apiLimiter(), userController.login); // Login
};

export default userRoutes;
