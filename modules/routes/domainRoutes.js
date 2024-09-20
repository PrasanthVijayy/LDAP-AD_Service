import express from "express";
import DomainController from "../controllers/domainController.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const domainController = new DomainController();

const domainRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/dc", router);

  router.get("/listDCs", apiLimiter(10), domainController.listDCs);
};

export default domainRoutes;
