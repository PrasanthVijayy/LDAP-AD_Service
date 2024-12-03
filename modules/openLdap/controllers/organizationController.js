"use strict"; // Using strict mode

import OrganizationService from "../../openLdap/services/orgainzationService.js";
import { BadRequestError, ConflictError } from "../../../utils/error.js";
import { search } from "../../../utils/ldapUtils.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";

class OrganizationController {
  constructor() {
    this.organizationService = new OrganizationService();
  }

  createOrganization = async (req, res, next) => {
    try {
      console.log("Controller: createOrganization - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      if (!payload.organizationName) {
        throw new BadRequestError("Missing field: organizationName");
      }

      const baseDN = `${process.env.LDAP_BASE_DN}`;
      const filter = `(ou=${payload.organizationName})`;

      // Search for existing OU
      // const organizationExists = await search(baseDN, filter);
      // if (organizationExists.length > 0) {
      //   throw new ConflictError(`Organization already exists.`);
      // }

      const organization = await this.organizationService.createOrganization(
        payload
      );
      console.log("Controller: createOrganization - Completed");
      res.status(201).json(organization);
    } catch (error) {
      console.log("Controller: createOrganization - Error", error);
      next(error);
    }
  };

  listOrganizaitons = async (req, res, next) => {
    try {
      console.log("Controller: listOrganizaitons - Started");
      const filter = req.query.filter || "";
      const organizations = await this.organizationService.listOrganizaitons(
        filter
      );
      const encryptData = encryptPayload(organizations);
      console.log("Controller: listOrganizaitons - Completed");
      res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: listOrganizaitons - Error", error);
      next(error);
    }
  };
}

export default OrganizationController;
