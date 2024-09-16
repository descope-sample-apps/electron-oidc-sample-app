const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("node:path");
const { createAuthWindow, createLogoutWindow, goAuthUrl} = require("./auth-process");
const createAppWindow = require("./app-process");
const authService = require("../services/auth-service");

if (process.defaultApp) {
  // Setup the custom protocol
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("electron", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("electron");
}

async function showWindow() {
  // Which window to show based on wether valid refresh token exists
  try {
    await authService.refreshTokens();
    createAppWindow();
  } catch (err) {
    createAuthWindow();
  }
}

app.on("ready", () => {
  // Handle IPC messages from the renderer process.
  ipcMain.handle("auth:get-profile", authService.getProfile);
  ipcMain.on("auth:go-auth-url", async (event, flowParam) => {
    await goAuthUrl(flowParam);
  });
  ipcMain.handle("auth:validate", async () => {
    const valid = await authService.validateSession();
    if (!valid) {
      BrowserWindow.getAllWindows().forEach((window) => window.close());
      createLogoutWindow();
      createAuthWindow();
      return false;
    } else {
      return true;
    }
  });
  ipcMain.on("auth:log-out", () => {
    BrowserWindow.getAllWindows().forEach((window) => window.close());
    createLogoutWindow();
  });
  // Show window after all listeners have been set and app is ready
  showWindow();
});

app.on("open-url", (event, url) => {
  // Listens for app protocol link to be opened and gets custom protocol URL
  authService.loadTokens(url)
    .then(() => {
      BrowserWindow.getAllWindows().forEach((window) => window.close());
      createAppWindow();
    })
    .catch((error) => {
      console.error("Error loading tokens:", error);
    });
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  app.quit();
});
