"use strict";
import passport from "passport";
import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import { samlUtils } from "../utils/samlUtils.js";
import { findData } from "../utils/adUtils.js";
import logger from "./logger.js";

/* --------- SAML SSO SETUP  STARTS ---------- */

export const setupPassport = () => {
  passport.use(
    "saml",
    new SamlStrategy(
      {
        entryPoint: samlUtils?.entryPoint,
        issuer: samlUtils?.issuer,
        callbackUrl: samlUtils?.callbackUrl,
        idpCert: samlUtils?.idpCert,
        identifierFormat: samlUtils?.identifierFormat,
        algorithm: "sha256",
        debug: true,
        acceptedClockSkewMs: 0,
        wantAuthnResponseSigned: false,
        wantAssertionsSigned: true, // Ensure assertions are signed
      },
      async (profile, done) => {
        try {
          const empId =
            profile.attributes[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"
            ] || "Unknown";

          profile.empID = empId;

          const filter = `(sn=${empId})`;
          const userData = await findData(filter);
          const adminGroups = [
            "Administrators",
            "Domain Admins",
            "Enterprise Admins",
            "Group Policy Creator Owners",
            "Schema Admins",
          ];

          const users = userData?.users || [];

          const userDN = users[0]?.dn; // Get userDN
          // Extract CN (Container) and OU (Organizational Unit) from userDN
          const ouMatch = userDN?.match(/OU=([^,]+)/);
          const cnMatches = userDN?.match(/CN=([^,]+)/g);
          const username = userDN?.match(/CN=([^,]+)/);

          // Use OU if it exists, otherwise fallback to CN (Container)
          const userOU = ouMatch ? ouMatch[1]?.replace("OU=", "") : null;
          const userCN = cnMatches ? cnMatches[1]?.replace("CN=", "") : null;

          // Assign userIdent as 'OU' if OU exists, otherwise 'CN'
          const userIdent = userOU ? "OU" : userCN ? "CN" : ""; // Set to 'OU' or 'CN' based on presence

          let role = "user"; // Default role is user

          users.forEach((user) => {
            if (user.memberOf) {
              // Ensure memberOf is always an array (even if there's only one group)
              const memberOfArray = Array.isArray(user.memberOf)
                ? user.memberOf
                : [user.memberOf];

              // Debugging: Print memberOf to check if it's correctly parsed as an array
              console.log("user.memberOf (normalized):", memberOfArray);

              const matchedGroups = memberOfArray.filter((group) => {
                const groupName = group.split(",")[0].replace("CN=", "").trim();
                console.log("groupName:", groupName); // Log the group name extracted from memberOf
                return adminGroups.includes(groupName);
              });
              // If matched, set role to 'admin'
              if (matchedGroups.length > 0) {
                role = "admin"; // Set to admin if matched groups are found
              } else {
                logger.warn(
                  "Authenticated is not an admin, since not part of any admin groups."
                );
              }
            } else {
              logger.warn(
                "INFO: Authenticated user is not a member in any admin groups."
              );
            }
          });

          // Assign additional profile properties
          profile.role = role;
          profile.userIdent = userIdent; // Correctly assign userIdent ('OU' or 'CN')
          profile.userCN = userCN;
          profile.userOU = userOU;
          profile.userDN = userDN;
          profile.username = username?.[1] || "";
          profile.sAMAccountName = users?.[0]?.sAMAccountName || "";
          profile.email = users?.[0]?.userPrincipalName || "";

          return done(null, profile);
        } catch (error) {
          logger.error(`Error processing SAML profile: ${error}`);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((id, done) => {
    done(null, id);
  });
};

/* --------- SAML SSO SETUP  ENDS ---------- */
