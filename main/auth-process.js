const { BrowserWindow, shell, app, dialog } = require('electron');
const authService = require('../services/auth-service');
const path = require("path");

let win = null;

function createAuthWindow() {
  destroyAuthWin();

  win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false
    }
  });
  
  win.loadFile('./renderers/login.html');
  
  win.on('authenticated', () => {
    destroyAuthWin();
  });

  win.on('closed', () => {
    win = null;
  });
}

async function goAuthUrl(flowParam) {
  try {
    const auth_url = await authService.getAuthenticationURL(flowParam);
    shell.openExternal(auth_url) // Open OIDC Authorize URL in External Browser
  } catch (error) {
        console.error("Could not open Auth URL:", error)
  }
}

function destroyAuthWin() {
  if (!win) return;
  win.close();
  win = null;
}

function createLogoutWindow() {
    createAuthWindow();
    authService.logout()
    .then()
}

module.exports = {
  createAuthWindow,
  createLogoutWindow,
  goAuthUrl
};