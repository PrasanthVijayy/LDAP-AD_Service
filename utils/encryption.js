"use strict"; // Using strict mode
import dotenv from "dotenv";
import crypto from "crypto";
import CryptoJS from "crypto-js";

dotenv.config();

function createSSHAHash(password) {
  // Generate a 4-byte salt
  const salt = crypto.randomBytes(4);

  // Create SHA1 hash
  const hash = crypto.createHash("sha1");
  hash.update(password);
  hash.update(salt);
  const digest = hash.digest();

  // Concatenate the hash and salt
  const sshaHash = Buffer.concat([digest, salt]);

  // Encode in base64 and format with SSHA prefix
  return `{SSHA}${sshaHash.toString("base64")}`;
}

const SECRET_KEY = process.env.SECRET_KEY || "my-secret-key";

function encryptPayload(data) {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECRET_KEY
  ).toString();
  console.warn("Encryption from server involved...");
  return encryptedData;
}

function decryptPayload(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  console.log("decryptedData", decryptedData);
  console.warn("Decryption from server involved...");
  return JSON.parse(decryptedData);
}

export { createSSHAHash, encryptPayload, decryptPayload };
