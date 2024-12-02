"use strict"; // Using strict mode

import DomainService from "../../services/domainService.js";

class DomainController {
  constructor() {
    this.domainService = new DomainService();
  }

  listDCs = async (req, res, next) => {
    try {
      console.log("Controller: listDCs - Started");
      const dcs = await this.domainService.listDCs();
      console.log("Controller: listDCs - Completed");
      res.status(200).json(dcs);
    } catch (error) {
      console.log("Controller: listDCs - Error", error);
      next(error);
    }
  };
}

export default DomainController;
