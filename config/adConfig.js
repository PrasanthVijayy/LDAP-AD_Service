"use strict"; // Using strict mode

import ldap from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

// AD-specific configurations
const client = ldap.createClient({
  url: process.env.AD_SERVER_URL, // Example: ldap://domainController.example.com
  reconnect: true,
});

// Connect to Active Directory
const connectToAD = () => {
  return new Promise((resolve, reject) => {
    client.on("connect", () => {
      console.log("AD client connected successfully.");

      // Bind to Active Directory using an appropriate admin DN or service account
      client.bind(
        process.env.AD_ADMIN_DN,
        process.env.AD_ADMIN_PASSWORD,
        (err) => {
          if (err) {
            console.error("AD bind failed:", err);
            reject(err);
          } else {
            console.log("AD bind successful.");
            resolve();
          }
        }
      );
    });

    client.on("error", (err) => {
      console.error("AD connection error:", err);
      reject(err);
    });

    client.on("disconnect", () => {
      console.warn("AD client disconnected.");
    });
  });
};

// Search for users in AD (example filter)
const searchUser = (username) => {
  const searchOptions = {
    filter: `(sAMAccountName=${username})`, // Use sAMAccountName for AD user login
    scope: "sub", // Search sub-tree of the base DN
    attributes: ["dn", "sAMAccountName", "cn", "mail"], // AD-specific attributes
  };

  return new Promise((resolve, reject) => {
    client.search(process.env.AD_BASE_DN, searchOptions, (err, res) => {
      if (err) {
        reject(err);
      }

      res.on("searchEntry", (entry) => {
        console.log("Found entry:", entry.object);
        resolve(entry.object); // Return the first match (user entry)
      });

      res.on("error", (err) => {
        reject(err);
      });

      res.on("end", (result) => {
        if (result.status !== 0) {
          reject("Search failed with status " + result.status);
        }
      });
    });
  });
};

export { client, connectToAD, searchUser };
