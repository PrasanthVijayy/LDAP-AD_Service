"use strict"; // Use strict mode

import logger from "../config/logger.js";
import { connectToAD } from "../config/adConfig.js";

const bind = (dn, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Get AD instance
      adInstance.bind(dn, password, (err) => {
        if (err) {
          logger.error(`Failed to bind to AD: ${err.message}`);
          reject(new Error("AD bind failed: " + err.message));
        } else {
          logger.success(`Successfully bound to AD with DN: ${dn}`);
          resolve(); // Binding succeeded
        }
      });
    } catch (error) {
      logger.error("Error connecting to Active Directory: " + error.message);
      reject(error); // Reject if the connection fails
    }
  });
};

// Function to search Active Directory for entries
const search = (baseDN, filter, scope = "sub") => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Ensure AD connection is established
      adInstance.find(baseDN, filter, { scope }, (err, result) => {
        if (err) {
          logger.error(`Active Directory search failed: ${err.message}`);
          reject(new Error("AD search failed: " + err.message));
        } else {
          logger.info(
            `Search completed. Found entries: ${JSON.stringify(result)}`
          );
          resolve(result); // Return search result
        }
      });
    } catch (error) {
      logger.error("Error connecting to Active Directory: " + error.message);
      reject(error); // Reject if the connection fails
    }
  });
};

// Function to add a new user/entry to Active Directory
const add = (dn, attributes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Ensure AD connection is established
      adInstance.add(dn, attributes, (err) => {
        if (err) {
          logger.error(`Failed to add entry to AD: ${err.message}`);
          reject(new Error("AD add failed: " + err.message));
        } else {
          logger.success(`Successfully added entry: ${dn}`);
          resolve(); // Successfully added entry
        }
      });
    } catch (error) {
      logger.error("Error connecting to Active Directory: " + error.message);
      reject(error); // Reject if the connection fails
    }
  });
};

// Function to modify an existing AD entry
const modify = (dn, changes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Ensure AD connection is established
      adInstance.modify(dn, changes, (err) => {
        if (err) {
          logger.error(`Failed to modify entry in AD: ${err.message}`);
          reject(new Error("AD modify failed: " + err.message));
        } else {
          logger.success(`Successfully modified entry: ${dn}`);
          resolve(); // Successfully modified entry
        }
      });
    } catch (error) {
      logger.error("Error connecting to Active Directory: " + error.message);
      reject(error); // Reject if the connection fails
    }
  });
};

// Function to delete an entry from Active Directory
const deleteEntry = (dn) => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Ensure AD connection is established
      adInstance.delete(dn, (err) => {
        if (err) {
          logger.error(`Failed to delete entry from AD: ${err.message}`);
          reject(new Error("AD delete failed: " + err.message));
        } else {
          logger.success(`Successfully deleted entry: ${dn}`);
          resolve(); // Successfully deleted entry
        }
      });
    } catch (error) {
      logger.error("Error connecting to Active Directory: " + error.message);
      reject(error); // Reject if the connection fails
    }
  });
};

export { bind, search, add, modify, deleteEntry };
