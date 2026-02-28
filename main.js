// Import app requirements
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

let mainWindow;

// Create main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, 
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html'); // load UI provided from index.html
}

// Listen/handle messages from renderer.js(frontend) for given database function calls
ipcMain.handle('get-all-items', () => db.getAllItems());
ipcMain.handle('get-item', (event, id) => db.getItem(id));
ipcMain.handle('add-item',  (event, item) => db.addItem(item));
ipcMain.handle('update-item', (event, id, item) => db.updateItem(id, item));
ipcMain.handle('delete-item', (event, id) => db.deleteItem(id));
ipcMain.handle('search-items', (event, searchTerm) => db.searchItems(searchTerm));
ipcMain.handle('get-all-categories', () => db.getAllCategories());
ipcMain.handle('add-category', (event, category) => db.addCategory(category));
ipcMain.handle('delete-category', (event, id) => db.deleteCategory(id));

// Window open process order
app.whenReady().then(() => {
    db.initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Window close process order
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.closeDatabase();
        app.quit();
    }
});

app.on('will-quit', () => {
    db.closeDatabase();
});