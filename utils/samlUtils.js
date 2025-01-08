"use strict";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

export const samlUtils = {
  entryPoint: `${process.env.SAML_ENTRY}`,
  issuer: `${process.env.APP_LOGIN_URL}`,
  callbackUrl: `${process.env.SAML_CALLBACK}`,
  idpCert: fs.readFileSync("Certificates/adCert_ip144.pem", "utf-8"),
  identifierFormat: null,
  logoutURL: `${process.env.SAML_LOGOUT}`,
};

/*  ---------- SAML CONFIG - TESTING START ---------- */
// export const samlUtils = {
//   entryPoint: "https://sso.cybernexa.com/adfs/ls",
//   issuer: "https://remote.cybernexa.com/",
//   callbackUrl: "https://remote.cybernexa.com/login/callback",
//   idpCert: fs.readFileSync("Certificates/adCert_AWS.pem", "utf-8"),
//   identifierFormat: null,
//   logoutURL: "https://sso.cybernexa.com/adfs/ls/?wa=wsignout1.0",
// };
/*  ---------- SAML CONFIG - TESTING END ---------- */

// Checking the signature algorithm ⚠️
// openssl x509 -in idp-certificate.pem -text -noout

// Convert file format from crt to pem ⚠️
// openssl x509 -in cybernexa.crt -out cybernexa1.pem -outform PEM
// openssl x509 -inform DER -in certificate.crt -outform PEM -out certificate.pem
