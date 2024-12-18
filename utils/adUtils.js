"use strict"; // Use strict mode

import ldap from "ldapjs";
import logger from "../config/logger.js";
import { connectToAD } from "../config/adConfig.js";
import { BadRequestError, UnauthorizedError } from "./error.js";
import dotenv from "dotenv";
dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.AD_SERVER_URL,
  tlsOptions: {
    rejectUnauthorized: false, // Disable certificate temporarily
  },
});

// General Error Handler for LDAP Client
ldapClient.on("error", (err) => {
  if (ldapClient.connected) {
    console.error("AD Client Error:", err); // To track client-level issues
  }
});

// Function to authenticate a user in Active Directory
const authenticate = async (username, password) => {
  try {
    const adInstance = await connectToAD(); // Ensure AD connection is established

    // Fetch user details first to check account status
    const user = await findUser(username);

    const accountControl = user?.userAccountControl; // Gets user account control
    logger.info(`Account Control Flags for ${username}: ${accountControl}`);

    // Check if the account is disabled (bit 1 indicates disabled account)
    if (accountControl == 514) {
      logger.error(`User account disabled.`);
      throw new UnauthorizedError("Account is disabled, please contact admin.");
    }

    // Proceed with authentication if the account is not disabled
    await new Promise((resolve, reject) => {
      adInstance.authenticate(username, password, (err, auth) => {
        if (err) {
          if (
            err.message.includes(
              "80090308: LdapErr: DSID-0C090449, comment: AcceptSecurityContext error, data 775"
            )
          ) {
            logger.error(`[AD] Authentication failed: ${err.message}`);
            reject(
              new BadRequestError(
                "Your account has been locked, Contact Admin!"
              )
            );
          } else {
            logger.error(`[AD] Authentication failed: ${err.message}`);
            reject(new BadRequestError("Invalid credentials."));
          }
        } else if (!auth) {
          logger.error("[AD] Authentication failed: Invalid credentials.");
          reject(new BadRequestError("Invalid credentials."));
        } else {
          logger.success("[AD] Authentication successful.");
          resolve(auth); // Resolve on successful authentication
        }
      });
    });

    return user; // Return user details after successful authentication
  } catch (error) {
    logger.error(
      "Error during authentication and user fetch: " + error.message
    );
    throw error; // Reject if there is an error during authentication or user fetching
  }
};

const findUser = async (username) => {
  try {
    const adInstance = await connectToAD();
    return new Promise((resolve, reject) => {
      adInstance.findUser(username, (err, user) => {
        if (err) {
          logger.error(`[AD] Failed to fetch user details: ${err.message}`);
          reject(new Error("User not found"));
        } else if (!user) {
          logger.warn("[AD] No user details returned");
          reject(new BadRequestError("User not found"));
        } else {
          logger.info(
            `[AD] User details fetched successfully: ${JSON.stringify(user)}`
          );
          resolve(user);
        }
      });
    });
  } catch (error) {
    logger.error(`Error finding user in AD: ${error.message}`);
    throw error;
  }
};

// Function to search Active Directory for entries
const search = async (baseDN, filter, scope = "sub") => {
  try {
    await connectToAD();

    return new Promise((resolve, reject) => {
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
  } catch (error) {
    console.error("Error connecting to Active Directory:", error.message);
    throw error; // Re-throw the error after logging
  }
};

// Function to bind user to Active Directoryq
const bind = async (dn, password) => {
  try {
    logger.info(`Attempting to bind to DN: ${dn}`);
    await connectToAD();

    return new Promise((resolve, reject) => {
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
  } catch (error) {
    logger.error("Error connecting to Active Directory: " + error.message);
    throw error;
  }
};

// Function to add a new user/entry to Active Directory
const add = async (dn, attributes) => {
  try {
    await connectToAD(); // Ensure AD connection is established

    return new Promise((resolve, reject) => {
      ldapClient.add(dn, attributes, (err) => {
        if (err) {
          logger.error(`Failed to add entry to AD: ${err.message}`);
          reject(new Error("AD add failed: " + err.message));
        } else {
          logger.success(`Successfully added entry: ${dn}`);
          resolve(); // Successfully added entry
        }
      });
    });
  } catch (error) {
    logger.error("Error connecting to Active Directory: " + error.message);
    throw error;
  }
};

// Function to modify an existing AD entry
const modify = async (dn, changes) => {
  logger.info(`Attempting to modify entry: ${dn}`);

  const ldapChanges = changes.map((change) => {
    if (change.operation && change.modification) {
      return {
        operation: change.operation,
        modification: change.modification,
      };
    } else {
      throw new Error(
        "Invalid change object: operation and modification required"
      );
    }
  });

  try {
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
  } catch (error) {
    console.error("Error modifying entry:", error.message);
    throw error;
  }
};

// Function to delete an entry from Active Directory
const deleteEntry = async (dn) => {
  logger.info(`Attempting to delete entry: ${dn}`);
  try {
    await connectToAD(); // Ensure AD connection is established

    return new Promise((resolve, reject) => {
      ldapClient.del(dn, (err) => {
        if (err) {
          console.error(`LDAP delete error: ${err.message}`);
          reject(new Error("LDAP delete operation failed: " + err.message));
        } else {
          logger.info(`Successfully deleted entry: ${dn}`);
          resolve(); // Successfully deleted entry
        }
      });
    });
  } catch (error) {
    logger.error("Error connecting to Active Directory: " + error.message);
    throw error;
  }
};

const groupList = async (username) => {
  logger.success(`Fetching group list for user ${username}`);
  try {
    const adInstance = await connectToAD();

    return new Promise((resolve, reject) => {
      let resolved = false; // Guard flag to prevent multiple invocations

      adInstance.getGroupMembershipForUser(username, (err, groups) => {
        if (resolved) return; // If already resolved/rejected, ignore
        resolved = true;

        if (err) {
          logger.error(
            `Error fetching groups for user ${username}: ${err.message}`
          );
          reject(new Error("Failed to fetch group membership."));
        } else if (!groups || groups.length === 0) {
          logger.warn(`No groups found for user: ${username}`);
          resolve([]); // Return an empty array if no groups
        } else {
          logger.info(
            `Groups fetched for user ${username}: ${JSON.stringify(groups)}`
          );
          resolve(groups); // Return the fetched groups
        }
      });
    });
  } catch (error) {
    logger.error(`Error in groupList: ${error.message}`);
    throw error;
  }
};

export {
  authenticate,
  findUser,
  bind,
  search,
  add,
  modify,
  deleteEntry,
  groupList,
};
