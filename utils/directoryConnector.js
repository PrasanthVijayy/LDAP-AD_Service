"use strict";

import { connectToAD } from "../config/adConfig.js";
import { connectToLDAP } from "../config/ldapconfig.js";
import logger from "../config/logger.js";
import { BadRequestError } from "./error.js";

export const connectDirectory = async (authType) => {
  try {
    logger.success(`Connecting to ${authType.toUpperCase()} directory...`);

    if (authType === "ldap") {
      const ldapClient = await connectToLDAP(); // Establish LDAP connection
      logger.success("Connected to LDAP successfully.");
      return ldapClient; // Return connected client for further use
    } else if (authType === "ad") {
      const adClient = await connectToAD(); // Establish AD connection
      logger.success("Connected to AD successfully.");
      return adClient; // Return connected client for further use
    } else {
      throw new Error("Unsupported authentication type.");
    }
  } catch (error) {
    logger.error(`Error connecting to ${authType.toUpperCase()}:`, error);
    throw new BadRequestError(
      `Failed to connect to ${authType.toUpperCase()}.`
    );
  }
};
