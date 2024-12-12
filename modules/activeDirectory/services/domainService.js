import { bind, search } from "../../../utils/adUtils.js";
import logger from "../../../config/logger.js";

class DomainService {
  async listDCs() {
    try {
      logger.success("[AD] Service: listDCs - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const baseDN = process.env.AD_BASE_DN;
      const searchFilter = "(objectClass=domain)";
      const scope = "sub";

      const rawDCs = await search(baseDN, searchFilter, scope);
      logger.success("[AD] Service: listDCs - Completed");

      const dcs = rawDCs.map((dc) => ({
        dn: dc.dn,
        dcName: dc.dc,
        description: dc.description || null,
      }));

      // Return the DC entries
      return { count: dcs.length, dcs };
    } catch (error) {
      console.log("[AD] Service: listDCs - Error", error);
      throw error;
    }
  }
}

export default DomainService;
