// Import requirements
const { contextBridge, ipcRenderer } = require('electron');

// Bridge creation linking renderer.js(frontend) to Electron API with controlled access
contextBridge.exposeInMainWorld('api', {
    // Frontend calls function: "getAllItems()", this sends invoked message to main, main calls database
    getAllItems: () => ipcRenderer.invoke('get-all-items'),
    getItem: (id) => ipcRenderer.invoke('get-item', id),
    addItem: (item) => ipcRenderer.invoke('add-item', item),
    updateItem: (id, item) => ipcRenderer.invoke('update-item', id, item),
    deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
    searchItems: (searchTerm) => ipcRenderer.invoke('search-items', searchTerm),
    getAllCategories: () => ipcRenderer.invoke('get-all-categories'),
    addCategory: (category) => ipcRenderer.invoke('add-category', category),
    deleteCategory: (id) => ipcRenderer.invoke('delete-category', id)
});