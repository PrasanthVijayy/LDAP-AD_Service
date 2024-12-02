"use strict";
import { connectToAD } from "../config/adConfig.js";
import { connectToLDAP } from "../config/ldapconfig.js";
import logger from "../config/logger.js";
import { BadRequestError } from "../utils/error.js";

// Factory Pattern - decoupling the directory access
export async function connectDirectory(authType) {
  if (authType === "ldap") {
    logger.info("Connecting to LDAP...");
    return connectToLDAP();
  } else if (authType === "ad") {
    logger.info("Connecting to AD...");
    return connectToAD();
  } else {
    throw new BadRequestError("Invalid authentication type.");
  }
}
