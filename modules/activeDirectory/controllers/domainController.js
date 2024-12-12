"use strict"; // Using strict mode

import DomainService from "../../activeDirectory/services/domainService.js";
import logger from "../../../config/logger.js";

class DomainController {
  constructor() {
    this.domainService = new DomainService();
  }

  listDCs = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listDCs - Started");
      const dcs = await this.domainService.listDCs();
      logger.success("[AD] Controller: listDCs - Completed");
      res.status(200).json(dcs);
    } catch (error) {
      console.log("[AD] Controller: listDCs - Error", error);
      next(error);
    }
  };
}

export default DomainController;
