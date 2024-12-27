import { search, add, bind, unBind } from "../../../utils/adUtils.js";
import { NotFoundError, ConflictError } from "../../../utils/error.js";
import { connectToAD } from "../../../config/adConfig.js";
import logger from "../../../config/logger.js";

class OrganizationService {
  async createOrganization(payload) {
    try {
      logger.success("[AD] Service: createOrganization - Started");

      await connectToAD(); // Ensure AD instance is initialized
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;

      // Construct the Distinguished Name (DN)
      const organizationDN = `OU=${payload.organizationName},${baseDN}`;
      const organizationAttributes = {
        ou: payload.organizationName,
        objectClass: ["top", "organizationalUnit"],
        description: payload.description || "Default organization",
      };
      // Add the new organization
      await add(organizationDN, organizationAttributes);

      logger.success("[AD] Service: createOrganization - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: createOrganization - Completed");
      return { message: "Organization created successfully." };
    } catch (error) {
      logger.error(`[AD] Service: login - Error - Unbind initiated`);
      await unBind(); // Unbind the user
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
      logger.success("[AD] Service: listOrganizaitons - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;
      const searchFilter = filter
        ? `(${filter})`
        : "(objectClass=organizationalUnit)";
      const scope = "sub";
      const rawOrganizations = await search(baseDN, searchFilter, scope);

      console.log("filter:", filter || null);
      logger.success("[AD] Service: listOrganizaitons - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: listOrganizaitons - Completed");
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
      logger.error(
        `[AD] Service: listOrganizaitons - Error - Unbind initiated`
      );
      await unBind(); // Unbind the user
      console.error("Service: listOrganizaitons - Error", error);
      throw error;
    }
  }

  async listContainers(filter) {
    try {
      logger.success("[AD] Service: listContainers - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;
      const searchFilter = filter ? `(${filter})` : "(objectClass=container)";
      const scope = "sub";
      const rawContainers = await search(baseDN, searchFilter, scope);

      console.log("filter:", filter || null);
      logger.success("[AD] Service: listContainers - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: listContainers - Completed");

      // Filter the containers to include only those with the proper CN format (CN=...,DC=...,DC=...)
      const properContainers = rawContainers.filter((container) =>
        /^CN=[^,]+,DC=[^,]+,DC=[^,]+$/.test(container.dn)
      );

      // Transform the filtered container data
      const containers = properContainers.map((container) => ({
        dn: container.dn,
        containerDN: container.cn || null,
        description: container.description || null,
      }));

      if (containers.length === 0) {
        throw new NotFoundError("No containers found.");
      }

      return { Count: containers.length, containers: containers };
    } catch (error) {
      logger.error(`[AD] Service: listContainers - Error - Unbind initiated`);
      await unBind(); // Unbind the user
      console.error("Service: listContainers - Error", error);
      throw error;
    }
  }

  async directoryEntities() {
    try {
      logger.success("[AD] Service: directoryEntities - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;

      // Search for organizational units
      const ouSearchFilter = "(objectClass=organizationalUnit)";
      const ouScope = "sub";
      const rawOUs = await search(baseDN, ouSearchFilter, ouScope);

      // Search for containers
      const containerSearchFilter = "(objectClass=container)";
      const containerScope = "sub";
      const rawContainers = await search(
        baseDN,
        containerSearchFilter,
        containerScope
      );

      // Filter the containers to include only those with the proper CN format (CN=...,DC=...,DC=...)
      const properContainers = rawContainers.filter((container) =>
        /^CN=[^,]+,DC=[^,]+,DC=[^,]+$/.test(container.dn)
      );

      logger.success("[AD] Service: directoryEntities - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: directoryEntities - Completed");

      // Map the results to a uniform structure
      const organizationalUnits = rawOUs.map((ou) => ({
        type: "Organizational Unit",
        dn: ou.dn,
        name: ou.ou || null,
        description: ou.description || null,
      }));

      const containers = properContainers.map((container) => ({
        type: "Container",
        dn: container.dn,
        name: container.cn || null,
        description: container.description || null,
      }));

      const combinedEntities = [...organizationalUnits, ...containers];
      return {
        Count: organizationalUnits.length + containers.length,
        Entites: combinedEntities,
      };
    } catch (error) {
      logger.error("[AD] Service: directoryEntities - Error", error);
      await unBind(); // Unbind the user
      console.error("Service: directoryEntities - Error", error);
      throw error;
    }
  }
}

export default OrganizationService;
