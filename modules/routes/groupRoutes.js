import express from 'express';
import GroupController from "../controllers/groupController.js";

const groupController = new GroupController();

const groupRoutes = (app) => {
    const router = express.Router();
    app.use("/LDAP/v1/groups", router);

    router.post("/createGroup", (req, res, next) => groupController.createGroup(req, res, next));
    router.get("/listGroups", (req, res, next) => groupController.listGroups(req, res, next));
    router.post("/addToGroup", (req, res, next) => groupController.addToGroup(req, res, next));
    router.post("/deleteFromGroup", (req, res, next) => groupController.deleteFromGroup(req, res, next));
    router.post("/addAdminGroup", (req, res, next) => groupController.addAdminGroup(req, res, next));
    router.post("/deleteAdminGroup", (req, res, next) => groupController.deleteAdminGroup(req, res, next));
}
export default router;
