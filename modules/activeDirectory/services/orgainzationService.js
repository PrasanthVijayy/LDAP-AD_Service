import { search, add, bind } from "../../../utils/adUtils.js";
import { NotFoundError, ConflictError } from "../../../utils/error.js";
import { connectToAD } from "../../../config/adConfig.js";
import logger from "../../../config/logger.js";

class OrganizationService {
  async createOrganization(organizationName, description) {
    try {
      logger.info("[AD] Service: createOrganization - Started");

      await connectToAD(); // Ensure AD instance is initialized
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;

      // Construct the Distinguished Name (DN)
      const organizationDN = `OU=${organizationName},${baseDN}`;
      const organizationAttributes = {
        ou: organizationName,
        objectClass: ["top", "organizationalUnit"],
        description: description || "Default organization",
      };
      // Add the new organization
      await add(organizationDN, organizationAttributes);

      logger.info("[AD] Service: createOrganization - Completed");
      return { message: "Organization created successfully." };
    } catch (error) {
      console.error("Service: createOrganization - Error", error);
      if (error.message.includes("00002071")) {
        throw new ConflictError("Organization already exists.");
      } else {
        throw error;
      }
    }
  }

  async listOrganizaitons(filter) {
    try {
      logger.info("[AD] Service: listOrganizaitons - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;
      const searchFilter = filter
        ? `(${filter})`
        : "(objectClass=organizationalUnit)";
      const scope = "sub";
      const rawOrganizations = await search(baseDN, searchFilter, scope);

      console.log("filter:", filter || null);
      logger.info("[AD] Service: listOrganizaitons - Completed");
      const organizations = rawOrganizations.map((organization) => ({
        dn: organization.dn,
        organizationDN: organization.ou || null,
        description: organization.description || null,
      }));
      if (organizations.length === 0) {
        throw new NotFoundError("No organizations found.");
      }
      return { Count: organizations.length, organizations };
    } catch (error) {
      console.error("Service: listOrganizaitons - Error", error);
      throw error;
    }
  }
}

export default OrganizationService;
