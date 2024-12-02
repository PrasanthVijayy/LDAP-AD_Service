import { bind, search } from "../../utils/ldapUtils.js";

class DomainService {
  async listDCs() {
    try {
      console.log("Service: listDCs - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const baseDN = process.env.LDAP_BASE_DN;
      const searchFilter = "(objectClass=dcObject)";
      const scope = "sub";

      const rawDCs = await search(baseDN, searchFilter, scope);
      console.log("Service: listDCs - Completed");

      const dcs = rawDCs.map((dc) => ({
        dn: dc.dn, 
        dcName: dc.dc,
        description: dc.description || null, 
      }));

      // Return the DC entries
      return { count: dcs.length, dcs };
    } catch (error) {
      console.log("Service: listDCs - Error", error);
      throw error;
    }
  }
}

export default DomainService;