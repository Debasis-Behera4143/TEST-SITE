// Client-side symmetric E2EE helper for EduTrack AI submissions
const SECRET_SALT = 'edutrack-proctor-salt-2026';

/**
 * Encrypts a string client-side using a simple XOR/Base64 cipher.
 * @param {string} text - The raw text payload (e.g. file URL).
 * @param {string} key - The symmetric encryption key.
 * @returns {string} - The Base64 encrypted cipher.
 */
export const encryptPayload = (text, key = SECRET_SALT) => {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

/**
 * Decrypts a Base64 XOR cipher back to its original raw string.
 * @param {string} cipherText - The Base64 encoded cipher text.
 * @param {string} key - The symmetric key used to encrypt.
 * @returns {string} - The decrypted plain text.
 */
export const decryptPayload = (cipherText, key = SECRET_SALT) => {
  if (!cipherText) return '';
  try {
    const decoded = atob(cipherText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    console.error('[E2EE Decrypt Failure]:', e);
    return cipherText; // Fallback to raw cipher if decoding fails
  }
};
