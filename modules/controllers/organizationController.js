import OrganizationService from "../services/orgainzationService.js";
import { BadRequestError, ConflictError } from "../../utils/error.js";
import { search } from "../../utils/ldapUtils.js";

class OrganizationController {
  constructor() {
    this.organizationService = new OrganizationService();
  }

  createOrganization = async (req, res, next) => {
    try {
      console.log("Controller: createOrganization - Started");
      const { organizationName, attributes } = req.body;
      if (!organizationName) {
        throw new BadRequestError("Missing field: organizationName");
      }

      const baseDN = `${process.env.LDAP_BASE_DN}`;
      const filter = `(ou=${organizationName})`;

      // Search for existing OU
      const organizationExists = await search(baseDN, filter);
      if (organizationExists.length > 0) {
        throw new ConflictError(`Organization already exists.`);
      }

      const organization = await this.organizationService.createOrganization(
        organizationName,
        attributes
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
      console.log("Controller: listOrganizaitons - Completed");
      res.status(200).json(organizations);
    } catch (error) {
      console.log("Controller: listOrganizaitons - Error", error);
      next(error);
    }
  };
}

export default OrganizationController;
