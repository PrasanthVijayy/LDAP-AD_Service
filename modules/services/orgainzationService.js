import { search, bind, add } from "../../utils/ldapUtils.js";
import { NotFoundError } from "../../utils/error.js";

class OrganizationService {
  async createOrganization(organizationName, description) {
    try {
      console.log("Service: createOrganization - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const organizationDN = `ou=${organizationName},${process.env.LDAP_BASE_DN}`;
      const organizationAttributes = {
        ou: organizationName,
        objectClass: ["top", "organizationalUnit"],
        description: description || "Default organization",
      };
      await add(organizationDN, organizationAttributes);
      console.log("Service: createOrganization - Completed");
      return { message: "Organization created successfully." };
    } catch (error) {
      console.log("Service: createOrganization - Error", error);
      throw error;
    }
  }
  async listOrganizaitons(filter) {
    try {
      console.log("Service: listOrganizaitons - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const baseDN = process.env.LDAP_BASE_DN || "ou=groups,dc=example,dc=com";
      const searchFilter = filter
        ? `(${filter})`
        : "(objectClass=organizationalUnit)";
      const scope = "sub";
      const rawOrganizations = await search(baseDN, searchFilter, scope);

      console.log("filter", filter);
      console.log("Service: listOrganizaitons - Completed");
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
      console.log("Service: listOrganizaitons - Error", error);
      throw error;
    }
  }
}

export default OrganizationService;
