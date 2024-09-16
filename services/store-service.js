const { safeStorage } = require("electron");
const settings = require("electron-settings");

async function storeToken(token_name, token) {
    const encrypted_token = safeStorage.encryptString(token);
    await settings.set(token_name, encrypted_token);
}

async function retrieveToken(token_name) {
    const token = await settings.get(token_name);
    const decrypted_token = safeStorage.decryptString(Buffer.from(token.data));
    return decrypted_token;
}

module.exports = {
    storeToken,
    retrieveToken
}