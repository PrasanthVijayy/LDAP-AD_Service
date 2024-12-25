"use strict";
import express from "express";
import OrganizationController from "../../activeDirectory/controllers/organizationController.js";
import { sessionMiddleware } from "../../../middleware/sessionMiddleware.js";
import apiLimiter from "../../../middleware/apiLimiter.js";
import csrfProtection from "../../../UI/libs/csurfProtection.js";

const organizationController = new OrganizationController();

const adOrganizationRoutes = (app) => {
  const router = express.Router();
  app.use("/AD/v1/organizations", router);

  router.post("/createOrganization", csrfProtection, sessionMiddleware, apiLimiter(), organizationController.createOrganization); // Create organization - additional
  router.get("/listOrganizations", csrfProtection, sessionMiddleware, apiLimiter(), organizationController.listOrganizaitons); // List organizations
  router.get("/listContainers",  csrfProtection, sessionMiddleware, apiLimiter(), organizationController.listContainers); // List containers
};
export default adOrganizationRoutes;
