const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const HOME_URL = "https://kost-in-three.vercel.app/";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "KostIn",
    backgroundColor: "#101a2d",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.loadURL(HOME_URL).catch(() => {
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(
      '<html><body style="font-family:Arial;background:#101a2d;color:#f5e6bd;display:grid;place-items:center;height:100vh"><div><h2>KostIn tidak dapat dibuka</h2><p>Periksa koneksi internet, lalu buka kembali aplikasi.</p><a style="color:#f5e6bd" href="' + HOME_URL + '">Coba lagi</a></div></body></html>'
    ));
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
