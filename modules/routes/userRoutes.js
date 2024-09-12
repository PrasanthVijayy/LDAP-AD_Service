// User Routes page.

import express from "express";
import UserController from "../controllers/userController.js";

const userController = new UserController();

const userRoutes = (app, apiLimiter) => {
  const router = express.Router();
  app.use("/LDAP/v1/users", router);

  router.post("/addUser", userController.addUser);
  router.get("/listUsers", apiLimiter, userController.listUsers);
  router.put("/resetPwd", userController.resetPassword);
  router.delete("/deleteUser", userController.deleteUser);
  // router.post('/enableUser', userController.enableUser);
  // router.put('/updateUser', userController.updateUser);
};

export default userRoutes;
