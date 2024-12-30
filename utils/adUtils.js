"use strict"; // Use strict mode

import ldap from "ldapjs";
import logger from "../config/logger.js";
import { connectToAD } from "../config/adConfig.js";
import { BadRequestError, UnauthorizedError } from "./error.js";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.AD_SERVER_URL,
  reconnect: true, // Enable reconnect when fails
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
  logger.info(`[AD] Starting authenticating for user: ${username}`);
  try {
    const adInstance = await connectToAD(); // Always use a fresh instance

    // Fetch user details first to check account status
    const user = await findUser(username);

    const accountControl = user?.userAccountControl; // Gets user account control
    logger.info(`Account Control Flags for ${username}: ${accountControl}`);

    // Check if the account is disabled (bit 1 indicates disabled account)
    if (accountControl == 514) {
      logger.error("User account disabled.");
      throw new UnauthorizedError("Account is disabled, please contact admin.");
    }

    return new Promise((resolve, reject) => {
      let isHandled = false; // Guard flag

      adInstance.authenticate(username, password, (err, auth) => {
        if (isHandled) return; // Ignore subsequent invocations
        isHandled = true; // Mark as handled

        if (err) {
          logger.error(`[AD] Authentication failed: ${err.message}`);
          if (
            err.message.includes(
              "80090308: LdapErr: DSID-0C09042A, comment: AcceptSecurityContext error, data 775, v3839"
            )
          ) {
            return reject(
              new BadRequestError(
                "Your account has been locked, Contact Admin!"
              )
            );
          } else if (
            err.message.includes(
              "80090308: LdapErr: DSID-0C09044B, comment: AcceptSecurityContext error, data 52e, v3839"
            )
          ) {
            return reject(new BadRequestError("Invalid credentials."));
          }
        }

        if (!auth) {
          logger.error("[AD] Authentication failed: Invalid credentials.");
          return reject(new BadRequestError("Invalid credentials."));
        }

        logger.success("[AD] Authentication successful.");
        resolve({
          user,
          // memberOfGroups,
        });
      });
    });
  } catch (error) {
    logger.error("Error during authentication: " + error.message);
    throw error;
  }
};

const findUser = async (username) => {
  logger.info(`[AD] Starting to fetch user details for: ${username}`);
  try {
    const adInstance = await connectToAD();
    return new Promise((resolve, reject) => {
      adInstance.findUser(username, (err, user) => {
        if (err) {
          logger.error(`[AD] Failed to fetch user details: ${err.message}`);
          reject(new Error("User not found"));
        } else if (!user) {
          logger.error("[AD] No user details returned");
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
  logger.info(`[AD] Starting search for baseDN: ${baseDN}`);
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
  logger.info(`[AD] Starting bind for user: ${dn}`);
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

// Function to unbind from Active Directory
const unBind = async () => {
  logger.info("[AD] Starting unbind");
  try {
    return new Promise((resolve, reject) => {
      ldapClient.unbind((err) => {
        if (err) {
          logger.error(`Failed to unbind from AD: ${err.message}`);
          return reject(new Error("AD unbind failed: " + err.message));
        }
        logger.success("Successfully unbound from AD.");
        resolve();
      });
    });
  } catch (error) {
    logger.error("Error unbinding from Active Directory: " + error.message);
    throw error;
  }
};

// Function to add a new user/entry to Active Directory
const add = async (dn, attributes) => {
  logger.info(`Attempting to add entry: ${dn}`);
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

const findData = async (filter) => {
  logger.info(`Fetching details with filter: ${filter}`);
  try {
    const adInstance = await connectToAD();

    return new Promise((resolve, reject) => {
      // Use the provided filter or default to filtering by group membership`;

      if (!filter) throw new BadRequestError("No filter provided"); // Ensure a filter is provided

      adInstance.find(
        {
          filter,
          attributes: [
            "dn",
            "memberOf",
            "cn",
            "sAMAccountName",
            "userPrincipalName",
          ], // Mention only required attributes
        },
        (err, result) => {
          if (err) {
            logger.error(`Error fetching LDAP data: ${err.message}`);
            return reject(new Error("Failed to fetch LDAP data."));
          }
          resolve(result); // Resolve with the result
        }
      );
    });
  } catch (error) {
    logger.error(`Error in fetchLDAPData: ${error.message}`);
    throw error;
  }
};

// Function to fetch group list for a user (using ldaps -> getting CB error with ad2 package)
const groupList = async (userDN, password, email) => {
  logger.success(`Fetching group list for user with email: ${userDN}`);

  try {
    await bind(userDN, password); // Bind to AD using email and password
    // Use the ldapClient instance created earlier
    return new Promise((resolve, reject) => {
      const groups = [];

      // Search filter to match email (mail attribute)
      const opts = {
        filter: `(userPrincipalName=${email})`, // Search for email
        scope: "sub", // Search in the entire subtree
        attributes: ["cn", "mail", "memberOf"], // Attributes to retrieve
      };

      // Perform the search using ldapClient
      ldapClient.search(process.env.AD_BASE_DN, opts, (err, res) => {
        if (err) {
          ldapClient.unbind(); // Ensure connection is closed
          logger.error(`LDAP Search Error: ${err.message}`);
          return reject(new Error("Failed to fetch group membership."));
        }

        res.on("searchEntry", (entry) => {
          const user = entry.object;
          if (user.memberOf) {
            const userGroups = Array.isArray(user.memberOf)
              ? user.memberOf
              : [user.memberOf]; // Ensure memberOf is an array
            userGroups.forEach((group) => {
              groups.push({ cn: group });
            });
          }
        });

        res.on("error", (err) => {
          ldapClient.unbind(); // Ensure connection is closed
          logger.error(`LDAP Search Stream Error: ${err.message}`);
          reject(new Error("Failed to fetch group membership."));
        });

        res.on("end", () => {
          ldapClient.unbind(); // Ensure connection is closed
          logger.success(
            `Group membership fetched successfully for email: ${email}`
          );
          resolve(groups); // Resolve with the user's group list
        });
      });
    });
  } catch (error) {
    logger.error(`Error in groupList: ${error.message}`);
    throw error;
  }
};

const findGroup = async (groupName) => {
  logger.success(`Fetching group details for ${groupName}`);
  try {
    const adInstance = await connectToAD();

    return new Promise((resolve, reject) => {
      adInstance.findGroup(groupName, (err, group) => {
        if (err) {
          logger.error(
            `Error fetching group details for ${groupName}: ${err.message}`
          );
          return reject(new Error("Failed to fetch group details."));
        } else {
          logger.info(
            `Group details fetched successfully: ${JSON.stringify(group)}`
          );
          resolve(group);
        }
      });
    });
  } catch (error) {
    logger.error(`Error finding group in AD: ${error.message}`);
    throw error;
  }
};

// const deletedObjects = async (opts = {}) => {
//   try {
//     const adInstance = await connectToAD();

//     // Log baseDN and filter values for debugging
//     console.log("Querying Deleted Objects with baseDN:", opts.baseDN);
//     console.log("Using filter:", opts.filter);

//     const queryOpts = {
//       baseDN:
//         opts.baseDN ||
//         "CN=Recycle Bin Feature,CN=Optional Features,CN=Directory Service,CN=Windows NT,CN=Services,CN=Configuration,DC=cylock,DC=com",
//       filter: opts.filter || "(isDeleted=TRUE)", // Filter for deleted objects
//       scope: opts.scope || "sub", // Ensure subtree search
//     };

//     console.log("Query Options:", JSON.stringify(queryOpts));

//     return new Promise((resolve, reject) => {
//       adInstance.findDeletedObjects(queryOpts, (err, result) => {
//         if (err) {
//           // Handle error based on the specific LDAP error
//           console.error("LDAP error fetching deleted objects:", err.message);

//           if (err.message.includes("0000208D")) {
//             logger.error(
//               `Recycle Bin not enabled or 'Deleted Objects' container not found: ${err.message}`
//             );
//             return reject(
//               new BadRequestError(
//                 "Recycle Bin is not enabled or 'Deleted Objects' container does not exist."
//               )
//             );
//           }

//           logger.error(`Error fetching deleted objects: ${err.message}`);
//           return reject(new Error("Failed to fetch deleted objects."));
//         }

//         if (!result || result.length === 0) {
//           logger.warn("No deleted objects found.");
//           return resolve([]); // Return empty array if no deleted objects
//         }

//         logger.info("Fetched deleted objects:", JSON.stringify(result));
//         resolve(result);
//       });
//     });
//   } catch (error) {
//     logger.error(`Error in findDeletedObjects: ${error.message}`);
//     throw error;
//   }
// };

export {
  authenticate,
  findUser,
  bind,
  unBind,
  search,
  add,
  modify,
  deleteEntry,
  groupList,
  findGroup,
  findData,
  // deletedObjects,
};
