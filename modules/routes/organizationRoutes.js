import express from "express";
import OrganizationController from "../controllers/organizationController.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import apiLimiter from "../../middleware/apiLimiter.js";

const organizationController = new OrganizationController();

const organizationRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/organizations", router);

  router.post("/createOrganization", sessionMiddleware, apiLimiter(), organizationController.createOrganization); // Create organization - additional
  router.get("/listOrganizations", sessionMiddleware, apiLimiter(), organizationController.listOrganizaitons); // List organizations
};
export default organizationRoutes;
