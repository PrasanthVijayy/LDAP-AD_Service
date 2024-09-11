import express from "express";
import OrganizationController from "../controllers/organizationController.js";

const organizationController = new OrganizationController();

const organizationRoutes = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/organizations", router);

  router.get("/listOrganizations", (req, res, next) => organizationController.listOrganizaitons(req, res, next)
  );
};
export default organizationRoutes;
