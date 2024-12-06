"use strict";
import logger from "./logger.js";
import ActiveDirectory from "activedirectory2";
import dotenv from "dotenv";

dotenv.config();

// AD-specific configurations
const AD_Config = {
  url: process.env.AD_SERVER_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_ADMIN_DN,
  password: process.env.AD_ADMIN_PASSWORD,
};

let adInstance = null; // Holds the AD instance

// Connect to Active Directory
const connectToAD = async () => {
  return new Promise((resolve, reject) => {
    if (adInstance) {
      // If already connected, return the instance
      logger.info("Reusing existing Active Directory connection...");
      return resolve(adInstance);
    }

    logger.info("Initializing Active Directory connection...");

    try {
      // Create the AD instance
      adInstance = new ActiveDirectory(AD_Config);

      // Attempt to authenticate and bind with the admin credentials
      adInstance.findUser(AD_Config.username, (err, user) => {
        if (err) {
          logger.error("Active Directory bind failed:", err);
          reject(err);
        } else {
          logger.success(
            `Active Directory bind successful for user: ${user.sAMAccountName}`
          );
          resolve(adInstance); // Return the connected instance
        }
      });
    } catch (error) {
      logger.error("Error initializing Active Directory connection:", error);
      reject(error);
    }
  });
};

// Disconnect from Active Directory (cleanup)
const disconnectAD = () => {
  if (adInstance) {
    logger.info("Clearing Active Directory client instance...");
    adInstance = null; // Clear the instance, as AD client does not have a built-in disconnect method
    logger.success("Active Directory client instance cleared.");
  } else {
    logger.info("No Active Directory client instance to clear.");
  }
};

export { connectToAD, disconnectAD };
