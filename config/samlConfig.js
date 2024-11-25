import fs from "fs";

export const samlConfig = {
  entryPoint: "https://sso.cybernexa.com/adfs/ls/idpinitiatedsignonpage.aspx",
  issuer: "https://192.168.0.145/",
  callbackUrl: "https://192.168.0.145/login/callback",
  idpCert: fs.readFileSync("Certificates/idp-certificate.pem", "utf-8"),
  identifierFormat: null,
};
// https://sso.cybernexa.com/adfs/ls/idpinitiatedsignonpage.aspx
//   callbackUrl: "https://remote.cybernexa.com/login/callback",

// const cert = fs.readFileSync("./certificate/cert3.pem", "utf-8");
// console.log(cert); // Ensure the certificate is correctly loaded

// Checking the signature algorithm ⚠️
// openssl x509 -in idp-certificate.pem -text -noout

// Convert file format from crt to pem ⚠️
// openssl x509 -inform DER -in certificate.crt -outform PEM -out certificate.pem
