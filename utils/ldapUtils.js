"use strict"; // Using strict mode

import ldap from "ldapjs";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.LDAP_SERVER_URL,
});

// General Error Handler for LDAP Client
ldapClient.on("error", (err) => {
  if (ldapClient.connected) {
    console.error("LDAP Client Error:", err); // To track client-level issues
  }
});
// Function to bind/connect to LDAP directory
const bind = (dn, password) => {
  return new Promise((resolve, reject) => {
    logger.info(`Attempting to bind to DN: ${dn}`);
    ldapClient.bind(dn, password, (err) => {
      if (err) {
        console.error(`LDAP bind error: ${err.message}`);
        reject(new Error("LDAP bind failed: " + err.message));
      } else {
        logger.info(`Successfully bound to ${dn}`);
        resolve();
      }
    });
  });
};

// Function to search attributes in LDAP directory
const search = (baseDN, filter, scope = "sub") => {
  return new Promise((resolve, reject) => {
    logger.info(`Starting search in baseDN: ${baseDN} with filter: ${filter}`);
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
  });
};

// Function to add a new entry to LDAP directory
const add = (dn, attributes) => {
  logger.info(`Attempting to add entry: ${dn}`);
  return new Promise((resolve, reject) => {
    ldapClient.add(dn, attributes, (err) => {
      if (err) {
        console.error(`LDAP add error: ${err.message}`);
        reject(new Error("LDAP add failed: " + err.message));
      } else {
        logger.info(`Successfully added entry: ${dn}`);
        resolve();
      }
    });
  });
};

// Function to modify existing entry in LDAP directory
const modify = (dn, changes) => {
  logger.info(`Attempting to modify entry: ${dn}`);

  const ldapChanges = [];

  for (const change of changes) {
    if (change.operation && change.modification) {
      ldapChanges.push({
        operation: change.operation,
        modification: change.modification,
      });
    } else {
      throw new Error(
        "Invalid change object: operation and modification required"
      );
    }
  }

  return new Promise((resolve, reject) => {
    ldapClient.modify(dn, ldapChanges, (err) => {
      if (err) {
        console.error(`LDAP modify error: ${err.message}`);
        reject(new Error("LDAP modify failed: " + err.message));
      } else {
        logger.info(`Successfully modified entry: ${dn}`);
        resolve();
      }
    });
  });
};

// Function to delete an entry from LDAP directory
const deleteEntry = (dn) => {
  logger.info(`Attempting to delete entry: ${dn}`);
  return new Promise((resolve, reject) => {
    ldapClient.del(dn, (err) => {
      if (err) {
        console.error(`LDAP delete error: ${err.message}`);
        reject(new Error("LDAP delete operation failed: " + err.message));
      } else {
        logger.info(`Successfully deleted entry: ${dn}`);
        resolve();
      }
    });
  });
};

export { ldapClient, bind, search, add, modify, deleteEntry };
