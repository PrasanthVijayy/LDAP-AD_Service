"use strict";
import passport from "passport";
import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import { samlUtils } from "../utils/samlUtils.js";

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
      },
      (profile, done) => {
        const surname =
          profile.attributes[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
          ] || "Unknown";

        /* ------- SAML CLAIM TESTING - START ------- */
        // const surname =
        // profile.attributes[
        //   "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"
        // ] || "Unknown";
        /* ------- SAML CLAIM TESTING - END ------- */

        let userRole = "user";
        if (surname === "EMP001") {
          userRole = "admin";
        }

        profile.role = userRole;
        profile.empID = surname;
        return done(null, profile);
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((id, done) => {
    done(null, id);
  });
};

/* --------- SAML SSO SETUP  ENDS ---------- */
