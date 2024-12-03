"use strict";

import { connectToAD } from "../config/adConfig.js";
import { connectToLDAP } from "../config/ldapconfig.js";
import logger from "../config/logger.js";

export const connectDirectory = async (authType) => {
  try {
    logger.info(`Connecting to ${authType.toUpperCase()} directory...`);

    if (authType === "ldap") {
      const ldapClient = await connectToLDAP(); // Establish LDAP connection
      logger.info("Connected to LDAP successfully.");
      return ldapClient; // Return connected client for further use
    } else if (authType === "ad") {
      const adClient = await connectToAD(); // Establish AD connection
      logger.info("Connected to AD successfully.");
      return adClient; // Return connected client for further use
    } else {
      throw new Error("Unsupported authentication type.");
    }
  } catch (error) {
    logger.error(`Error connecting to ${authType.toUpperCase()}:`, error);
    throw new Error(`Failed to connect to ${authType.toUpperCase()}.`);
  }
};
