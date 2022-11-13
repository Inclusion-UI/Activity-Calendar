const { app, BrowserWindow, ipcMain, dialog } = require("electron");

// Load DB helpers
const {
  readImages,
  setImageCopy,
  getImageCopies,
  getFolderLocation,
  updateFolderLocation,
  deleteImageCopy,
  ActivityCalendar,
} = require("./src/activity-calendar");

const seed = require("./src/seed");

const { sequelize } = require("./src/sequelize");

const calendar = new ActivityCalendar();

function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    width: 2000,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile("./public/index.html");
}

app.whenReady().then(async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await seed(calendar);
  createWindow();
});

app.on("window-all-closed", async function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/* IPC */
// request to load images
ipcMain.handle("load-images", async (event, category) => {
  return readImages(category);
});

ipcMain.handle("select-folder", (event) => {
  return dialog.showOpenDialog({ properties: ["openDirectory"] });
});

// get folder path
ipcMain.handle("get-folder", async (event, category) => {
  return getFolderLocation(category);
});

// folder location changes
ipcMain.handle("change-folder", async (event, category, path) => {
  try {
    await updateFolderLocation(category, path);
    await writeImages(category);
    return true;
  } catch (e) {
    return false;
  }
});

// set an image copy
ipcMain.handle(
  "set-image-copy",
  async (event, copyID, baseID, posX, posY, weekTagID) => {
    try {
      await setImageCopy(copyID, baseID, posX, posY, weekTagID);
      return true;
    } catch (e) {
      return false;
    }
  }
);

// delete an image copy
ipcMain.handle("delete-image-copy", async (event, copyID) => {
  try {
    await deleteImageCopy(copyID);
    return true;
  } catch (e) {
    return false;
  }
});

// load all image copies for current week
ipcMain.handle("load-image-copies", async (event, weekTagID) => {
  return getImageCopies(weekTagID);
});

ipcMain.handle("get-hold-value", async (event) => {
  return calendar.getSettings();
});

ipcMain.handle("set-hold-value", async (event, newHoldValue) => {
  try {
    await calendar.setSettings(newHoldValue);
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle("get-symbols", async () => {
  return calendar.getSymbols();
});

ipcMain.handle(
  "create-symbol",
  async (event, imagePath, name, type, posX, posY, zoom, categoryId) => {
    return calendar.createSymbol(
      imagePath,
      name,
      type,
      posX,
      posY,
      zoom,
      categoryId
    );
  }
);
