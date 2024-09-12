import express from "express";
import GroupController from "../controllers/groupController.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/groups", router);

  router.post("/createGroup", groupController.createGroup);
  router.get("/listGroups", groupController.listGroups);
  router.post("/addToGroup", groupController.addToGroup);
  router.delete("/deleteFromGroup", groupController.deleteFromGroup);
  router.get("/membersInGroup", groupController.membersInGroup);
  router.post("/addAdminGroup", groupController.addAdminGroup);
  router.delete("/deleteAdminGroup", groupController.deleteAdminGroup);
};
export default groupRoutes;
