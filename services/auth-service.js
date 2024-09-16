const axios = require("axios");
const url = require("url");
const {storeToken, retrieveToken} = require("./store-service")
const env = require("../env");

const { DESCOPE_PROJECT_ID } = env;

const redirectUri = "electron://auth/"; // Uses protocol after authenticating

let accessToken = null;
let refreshToken = null;
let codeVerifier = null;

const getAuthenticationURL = async (flowParam) => {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  let baseURL = "api.descope.com";
  if (DESCOPE_PROJECT_ID && DESCOPE_PROJECT_ID.length >= 32) {
    const localURL = DESCOPE_PROJECT_ID.substring(1, 5);
    baseURL = [baseURL.slice(0, 4), localURL, ".", baseURL.slice(4)].join("");
  }
  const authUrl = `https://${baseURL}/oauth2/v1/authorize?response_type=code&client_id=${DESCOPE_PROJECT_ID}&redirect_uri=${redirectUri}&scope=openid&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${codeVerifier}&login_hint=${flowParam}`;
  return authUrl;
};

function generateCodeVerifier() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const charactersLength = characters.length;

  for (let i = 0; i < 128; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function generateCodeChallenge(verifier) {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(verifier))
    .then((arrayBuffer) => {
      const base64Url = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      return base64Url;
    });
}

async function loadTokens(callbackURL) {
  const urlParts = url.parse(callbackURL, true);
  const query = urlParts.query;
  const state = urlParts.state;

  let baseURL = "api.descope.com";

  const exchangeOptions = {
    grant_type: "authorization_code",
    client_id: DESCOPE_PROJECT_ID,
    redirect_uri: redirectUri,
    code: query.code,
    code_verifier: codeVerifier,
  };

  const options = {
    method: "POST",
    url: `https://${baseURL}/oauth2/v1/token`,
    headers: {
      "content-type": "application/json",
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    accessToken = response.data.access_token;
    id_token = response.data.id_token;
    refreshToken = response.data.refresh_token;

    await storeToken("refresh", refreshToken);
    await storeToken("access", accessToken);
  } catch (error) {
    console.error(
      "Error during token exchange:",
      error.response.data,
      "\n",
      error.config
    );
    await logout();
    throw error;
  }
}

async function refreshTokens() {
  const refreshToken = await retrieveToken("refresh");

  if (refreshToken) {
    const refreshOptions = {
      method: "POST",
      url: `https://api.descope.com/v1/auth/refresh`,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
      data: {},
    };

    try {
      const response = await axios(refreshOptions);
      accessToken = response.data.sessionJwt;
      await storeToken("access", accessToken);
    } catch (error) {
      console.error(
        "Error during token refresh:",
        error.data.response,
        error.config
      );
      await logout();
      throw error;
    }
  } else {
    console.error("No available refresh token for refreshing session token.");
    throw new Error("No available refresh token.");
  }
}

async function validateSession() {
  let baseURL = "api.descope.com";
  const exchangeOptions = {};

  const options = {
    method: "POST",
    url: `https://${baseURL}/v1/auth/validate`,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${accessToken}`,
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    if (response.status === 200) {
      return true;
    }
  } catch (error) {
    console.warn("Session validation failed. Attempting to refresh tokens...");
    try {
      await refreshTokens();
      return true;
    } catch (refreshError) {
      console.error(
        "Token refresh failed during session validation:",
        error.response.data,
        error.config
      );
      return false;
    }
  }

  return false;
}

async function getProfile() {
  refreshToken = await retrieveToken("refresh");

  if (refreshToken) {
    const options = {
      method: "GET",
      url: `https://api.descope.com/v1/auth/me`,
      headers: {
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
    };

    try {
      const response = await axios(options);
      const name = response.data.name;
      const picture = response.data.picture;
      const profileInfo = { name: name, picture: picture };
      return profileInfo;
    } catch (error) {
      console.error(
        "Error during get profile axios:",
        error.response.data,
        error.config
      );
      return null;
    }
  } else {
    console.error("No available refresh token in getProfile.");
  }
}

async function logout() {
  refreshToken = await retrieveToken("refresh");

  if (refreshToken) {
    let baseURL = "api.descope.com";
    const exchangeOptions = {};

    const options = {
      method: "POST",
      url: `https://${baseURL}/v1/auth/logoutall`,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
      data: JSON.stringify(exchangeOptions),
    };

    try {
      await axios(options);
    } catch (error) {
      console.error(
        "Logout failed, possibly due to invalid or missing refresh token:",
        error.response.data,
        error.config
      );
    }
  }

  await storeToken("access", "");
  await storeToken("refresh", "");

  accessToken = null;
  refreshToken = null;
}

module.exports = {
  getAuthenticationURL,
  loadTokens,
  refreshTokens,
  validateSession,
  getProfile,
  logout,
};
