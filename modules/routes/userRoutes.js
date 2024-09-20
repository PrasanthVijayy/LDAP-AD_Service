// User Routes page.

import express from "express";
import UserController from "../controllers/userController.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const userController = new UserController();

const userRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/users", router);

  router.post("/addUser", userController.addUser);
  router.get("/listUsers", apiLimiter(50), userController.listUsers);
  router.put("/resetPwd", userController.resetPassword);
  router.delete("/deleteUser", userController.deleteUser);
  router.put("/updateUser", userController.updateUser);
  router.put("/updateContactDetails", userController.updateContactDetails)
  router.post("/modifyUserAccess", userController.updateUserStatus);
  router.get("/getdisabledUsers", apiLimiter(10), userController.getdisabledUsers); //additional
  router.post("/modifyUserLockStatus", userController.modifyUserLockStatus);
  router.get("/listLockedUsers", apiLimiter(10), userController.listLockedUsers); 
};

export default userRoutes;
