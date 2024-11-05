"use strict"; // Using strict mode

import crypto from "crypto";

function createSSHAHash(password) {
  // Generate a 4-byte salt
  const salt = crypto.randomBytes(4);
  
  // Create SHA1 hash
  const hash = crypto.createHash('sha1');
  hash.update(password);
  hash.update(salt);
  const digest = hash.digest();
  
  // Concatenate the hash and salt
  const sshaHash = Buffer.concat([digest, salt]);
  
  // Encode in base64 and format with SSHA prefix
  return `{SSHA}${sshaHash.toString('base64')}`;
}


export { createSSHAHash };
