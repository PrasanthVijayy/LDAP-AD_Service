"use strict";

import ldap from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

const connectToLDAP = async () => {
  return new Promise((resolve, reject) => {
    console.log("Initializing LDAP connection...");

    // Create a new client for each connection attempt
    const client = ldap.createClient({
      url: process.env.LDAP_SERVER_URL,
      reconnect: true, // Enable reconnect when fails
    });

    client.on("connect", () => {
      console.log("LDAP connected, attempting bind...");

      client.bind(
        process.env.LDAP_ADMIN_DN,
        process.env.LDAP_ADMIN_PASSWORD,
        (err) => {
          if (err) {
            console.error("LDAP bind failed:", err);
            reject(err);
          } else {
            console.log("LDAP bind successful.");
            resolve(client); // Resolve with the connected client
          }
        }
      );
    });

    client.on("error", (err) => {
      console.error("LDAP connection error:", err);
      reject(err);
    });

    client.on("timeout", () => {
      console.error("LDAP connection timeout.");
      reject(new Error("LDAP connection timeout."));
    });

    client.on("disconnect", () => {
      console.warn("LDAP client disconnected.");
    });

    // Add a manual timeout in case no event is triggered
    setTimeout(() => {
      reject(new Error("LDAP connection attempt timed out."));
    }, 10000); // 10 seconds timeout
  });
};

export { connectToLDAP };
