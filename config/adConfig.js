"use strict";
import ActiveDirectory from "activedirectory2";
import dotenv from "dotenv";


dotenv.config();

// AD-specific configurations
const AD_Config = {
  url: process.env.AD_SERVER_URL, // Example: ldap://domainController.example.com
  baseDN: process.env.AD_BASE_DN, // Base DN for search
  username: process.env.AD_ADMIN_DN, // Admin DN or service account username
  password: process.env.AD_ADMIN_PASSWORD, // Admin password or service account password
};

// Initialize ActiveDirectory instance
const ad = new ActiveDirectory(AD_Config);

// Connect to Active Directory
const connectToAD = () => {
  return new Promise((resolve, reject) => {
    ad.findUser(AD_Config.username, (err, user) => {
      if (err) {
        console.error("AD connection failed:", err);
        reject(err);
      } else {
        console.log("AD bind successful with user:", user);
        resolve(user);
      }
    });
  });
};

// Search for users in AD (example filter)
const searchUser = (username) => {
  return new Promise((resolve, reject) => {
    // Using findUser or findUsers method to search for a user based on username (sAMAccountName)
    ad.findUser(username, (err, user) => {
      if (err) {
        reject(err);
      } else if (user) {
        console.log("Found user:", user);
        resolve(user); // Return the found user object
      } else {
        reject("User not found");
      }
    });
  });
};

export { ad, connectToAD, searchUser };
