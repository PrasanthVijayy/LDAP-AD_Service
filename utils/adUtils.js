"use strict"; // Use strict mode

import ldap from "ldapjs";
import logger from "../config/logger.js";
import { connectToAD } from "../config/adConfig.js";
import { BadRequestError } from "./error.js";
import dotenv from "dotenv";

dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.AD_SERVER_URL,
});

// General Error Handler for LDAP Client
ldapClient.on("error", (err) => {
  console.error("LDAP Client Error:", err); // To track client-level issues
});

// Function to authenticate a user in Active Directory
const authenticate = (username, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const adInstance = await connectToAD(); // Ensure AD connection is established

      // Authenticate using the provided username and password
      adInstance.authenticate(username, password, (err, auth) => {
        if (err) {
          logger.error(`[AD] Authentication failed: ${err.message}`);
          reject(new BadRequestError("Invalid credentials."));
        } else if (!auth) {
          logger.error("[AD] Authentication failed: Invalid credentials.");
          reject(new BadRequestError("Invalid credentials."));
        } else {
          logger.success("[AD] Authentication successful.");
          resolve(auth); // Resolve on successful authentication
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
      await connectToAD();
      ldapClient.search(baseDN, { filter, scope }, (err, res) => {
        if (err) {
          console.error(`LDAP search error: ${err.message}`);
          reject(new Error("LDAP search failed: " + err.message));
          return;
        }

        const entries = [];
        res.on("searchEntry", (entry) => {
          logger.info(`Found entry: ${entry.objectName}`);
          entries.push(entry.object);
        });

        res.on("end", () => {
          logger.info(`Search completed with ${entries.length} entries found.`);
          resolve(entries);
        });

        res.on("error", (err) => {
          console.error(`Search operation error: ${err.message}`);
          reject(new Error("Search operation failed: " + err.message));
        });
      });
    } catch (error) {
      console.error("Error connecting to Active Directory:", error.message);
      reject(error);
    }
  });
};

// Function to bind user to Active Directoryq
const bind = (dn, password) => {
  return new Promise(async (resolve, reject) => {
    logger.info(`Attempting to bind to DN: ${dn}`);
    try {
      await connectToAD();
      ldapClient.bind(dn, password, (err) => {
        if (err) {
          console.error(`LDAP bind error: ${err.message}`);
          reject(new Error("LDAP bind failed: " + err.message));
        } else {
          logger.info(`Successfully bound to ${dn}`);
          resolve();
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
      await connectToAD(); // Ensure AD connection is established
      ldapClient.add(dn, attributes, (err) => {
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

export { authenticate, bind, search, add, modify, deleteEntry };
