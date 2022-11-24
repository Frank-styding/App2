const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("electron-reload")(__dirname + "template/index.html", {
  electron: path.join(__dirname, "../node_modules", ".bin", "electron"),
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    //frame: false,
    //  transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ipcMain.handle("ping", () => "pong");

  win.loadFile("template/index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
