import fs from "fs";
"use strict";

export const samlUtils = {
  entryPoint: "https://sso.cybernexa.com/adfs/ls/idpinitiatedsignonpage.aspx",
  issuer: "https://192.168.0.145/",
  callbackUrl: "https://192.168.0.145/login/callback",
  idpCert: fs.readFileSync("Certificates/adCert_ip144.pem", "utf-8"),
  identifierFormat: null,
  logoutURL: "https://sso.cybernexa.com/adfs/ls/?wa=wsignout1.0",
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

// https://sso.cybernexa.com/adfs/ls/idpinitiatedsignonpage.aspx
//   callbackUrl: "https://remote.cybernexa.com/login/callback",

// const cert = fs.readFileSync("./certificate/cert3.pem", "utf-8");
// console.log(cert); // Ensure the certificate is correctly loaded

// Checking the signature algorithm ⚠️
// openssl x509 -in idp-certificate.pem -text -noout

// Convert file format from crt to pem ⚠️
// openssl x509 -in cybernexa.crt -out cybernexa1.pem -outform PEM
// openssl x509 -inform DER -in certificate.crt -outform PEM -out certificate.pem 
