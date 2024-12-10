"use strict"; // Using strict mode

import OrganizationService from "../../activeDirectory/services/orgainzationService.js";
import { BadRequestError, ConflictError } from "../../../utils/error.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
import logger from "../../../config/logger.js";
class OrganizationController {
  constructor() {
    this.organizationService = new OrganizationService();
  }

  createOrganization = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: createOrganization - Started");

      const { organizationName, description } = req.body;

      // const encryptedData = req.body.data;
      // const payload = decryptPayload(encryptedData); // Decrypt input data

      // Validate required fields
      if (!organizationName) {
        throw new BadRequestError("Missing field: organizationName");
      }

      // Delegate to the service layer
      const result = await this.organizationService.createOrganization(
        organizationName, description
      );

      logger.success("[AD] Controller: createOrganization - Completed");
      res.status(201).json(result); // Send success response
    } catch (error) {
      console.error("[AD] Controller: createOrganization - Error", error);
      next(error); // Forward errors to error middleware
    }
  };

  listOrganizaitons = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: listOrganizaitons - Started");
      const filter = req.query.filter || "";
      const organizations = await this.organizationService.listOrganizaitons(
        filter
      );
      // const encryptData = encryptPayload(organizations);
      logger.info("[AD] Controller: listOrganizaitons - Completed");
      res.status(200).json(organizations);
      // res.status(200).json({ data: encryptData });
    } catch (error) {
      console.error("[AD] Controller: listOrganizaitons - Error", error);
      next(error);
    }
  };
}

export default OrganizationController;
