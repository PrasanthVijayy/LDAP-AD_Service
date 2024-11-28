"use strict"; // Using strict mode

// ldapConfig.js
import ldap from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

const client = ldap.createClient({
  url: process.env.LDAP_SERVER_URL,
  reconnect: true,
});

const connectToLDAP = () => {
  return new Promise((resolve, reject) => {
    client.on("connect", () => {
      console.log("LDAP client connected successfully.");

      client.bind(
        process.env.LDAP_ADMIN_DN,
        process.env.LDAP_ADMIN_PASSWORD,
        (err) => {
          if (err) {
            console.error("LDAP bind failed:", err);
            reject(err);
          } else {
            console.log("LDAP bind successful.");
            resolve();
          }
        }
      );
    });

    client.on("error", (err) => {
      console.error("LDAP connection error:", err);
      reject(err);
    });

    client.on("disconnect", () => {
      console.warn("LDAP client disconnected.");
    });
  });
};

export { client, connectToLDAP };
