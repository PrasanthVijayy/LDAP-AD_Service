import ldap from "ldapjs";
import dotenv from "dotenv";

dotenv.config();

const ldapClient = ldap.createClient({
  url: process.env.LDAP_SERVER_URL,
});

const bind = (dn, password) => {
  return new Promise((resolve, reject) => {
    ldapClient.bind(dn, password, (err) => {
      if (err) {
        reject(new Error("LDAP bind failed: " + err.message));
      } else {
        resolve();
      }
    });
  });
};

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
        resolve(entries);
      });
    });
  });
};

const add = (dn, attributes) => {
  return new Promise((resolve, reject) => {
    ldapClient.add(dn, attributes, (err) => {
      if (err) {
        reject(new Error("LDAP add failed: " + err.message));
      } else {
        resolve();
      }
    });
  });
};

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
        resolve();
      }
    });
  });
};

const deleteEntry = (dn) => {
  return new Promise((resolve, reject) => {
    ldapClient.del(dn, (err) => {
      if (err) {
        reject(new Error("LDAP delete operation failed: " + err.message));
      } else {
        resolve();
      }
    });
  });
};

export { ldapClient, bind, search, add, modify, deleteEntry };
