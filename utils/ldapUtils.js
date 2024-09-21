import ldap from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.LDAP_SERVER_URL,
});

//Function to bind/connect to LDAP directory
const bind = (dn, password) => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to bind to DN: ${dn}`);
    ldapClient.bind(dn, password, (err) => {
      if (err) {
        console.error(`LDAP bind error: ${err.message}`);
        reject(new Error("LDAP bind failed: " + err.message));
      } else {
        console.log(`Successfully bound to ${dn}`);
        resolve();
      }
    });
  });
};

// Function to search attributes in LDAP directory
const search = (baseDN, filter, scope = "sub") => {
  return new Promise((resolve, reject) => {
    ldapClient.search(baseDN, { filter, scope }, (err, res) => {
      if (err) {
        reject(new Error("LDAP search failed: " + err.message));
        return;
      }

      const entries = [];
      res.on("searchEntry", (entry) => {
        entries.push(entry.object);
      });

      res.on("end", () => {
        console.log(`Search completed with ${entries.length} entries found.`);
        resolve(entries);
      });
    });
  });
};

// Function to add new entry to LDAP directory
const add = (dn, attributes) => {
  return new Promise((resolve, reject) => {
    ldapClient.add(dn, attributes, (err) => {
      if (err) {
        reject(new Error("LDAP add failed: " + err.message));
      } else {
        console.log(`Successfully added entry: ${dn}`);
        resolve();
      }
    });
  });
};

// Function to modify existing entry in LDAP directory
const modify = (dn, changes) => {
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
        reject(new Error("LDAP modify failed: " + err.message));
      } else {
        console.log(`Successfully modified entry: ${dn}`);
        resolve();
      }
    });
  });
};

// Function to delete entry from LDAP directory
const deleteEntry = (dn) => {
  return new Promise((resolve, reject) => {
    ldapClient.del(dn, (err) => {
      if (err) {
        reject(new Error("LDAP delete operation failed: " + err.message));
      } else {
        console.log(`Successfully deleted entry: ${dn}`);
        resolve();
      }
    });
  });
};

export { ldapClient, bind, search, add, modify, deleteEntry };
