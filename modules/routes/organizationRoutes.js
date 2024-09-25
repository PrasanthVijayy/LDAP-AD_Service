import express from "express";
import OrganizationController from "../controllers/organizationController.js";

const organizationController = new OrganizationController();

const organizationRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/organizations", router);

  router.post("/createOrganization", organizationController.createOrganization); // Create organization - additional
  router.get("/listOrganizations", organizationController.listOrganizaitons); // List organizations
};
export default organizationRoutes;
