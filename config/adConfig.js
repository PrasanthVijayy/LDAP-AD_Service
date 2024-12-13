"use strict";
import logger from "./logger.js";
import ActiveDirectory from "activedirectory2";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// AD-specific configurations
const AD_Config = {
  url: process.env.AD_SERVER_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_ADMIN_DN,
  password: process.env.AD_ADMIN_PASSWORD,
  tlsOptions: {
    rejectUnauthorized: false,
  },
};

let adInstance = null; // Holds the AD instance

// Connect to Active Directory
const connectToAD = async () => {
  return new Promise((resolve, reject) => {
    if (adInstance) {
      // If already connected, reuse the instance
      logger.info("Reusing existing Active Directory connection...");
      return resolve(adInstance);
    }

    // Initialize the Active Directory connection
    logger.info("Initializing Active Directory connection...");
    try {
      // Create the AD instance (no binding or authentication here)
      adInstance = new ActiveDirectory(AD_Config);
      resolve(adInstance); // Resolve with the created AD instance without binding
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
