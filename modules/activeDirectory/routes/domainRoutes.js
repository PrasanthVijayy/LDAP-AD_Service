import express from "express";
import DomainController from "../../activeDirectory/controllers/domainController.js";
import apiLimiter from "../../../middleware/apiLimiter.js";
import { sessionMiddleware } from "../../../middleware/sessionMiddleware.js";
import csrfProtection from "../../../UI/libs/csurfProtection.js";


const domainController = new DomainController();

const adDomainRoutes = (app) => {
  const router = express.Router();
  app.use("/AD/v1/dc", router);

  router.get("/listDCs", csrfProtection, sessionMiddleware, apiLimiter(), domainController.listDCs); // list DCs
};

export default adDomainRoutes;
