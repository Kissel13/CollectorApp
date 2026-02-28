const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

// Initialize creation of items table and categories table
function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'collection.db');
    db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT null,
            category TEXT,
            purchase_date TEXT,
            purchase_price REAL,
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    return db;
}

function getAllItems() {
    const statement = db.prepare('SELECT * FROM items ORDER BY created_at DESC');
    return statement.all();
}

function getItem(id) {
    const statement = db.prepare('SELECT * FROM items WHERE id = ?');
    return statement.get(id);
}

function addItem(item) {
    const statement = db.prepare(`
        INSERT INTO items (name, category, purchase_date, purchase_price, image_path)
        VALUES (?, ?, ?, ?, ?)`);

    const result = statement.run(
        item.name,
        item.category,
        item.purchase_date,
        item.purchase_price,
        item.image_path
    );

    return { id: result.lastInsertRowid };
}

function updateItem(id, item) {
    const statement = db.prepare(`
        UPDATE items
        SET name = ?, category = ?, purchase_date = ?, purchase_price = ?, image_path = ?
        WHERE id = ?`);

    statement.run(
        item.name,
        item.category,
        item.purchase_date,
        item.purchase_price,
        item.image_path,
        id
    );

    return { success: true };
}

function deleteItem(id) {
    const statement = db.prepare('DELETE FROM items WHERE id = ?');
    statement.run(id);

    return { success: true };
}

function searchItems(searchTerm) {
    const statement = db.prepare(`
        SELECT * FROM items
        WHERE name LIKE ? OR category LIKE ?
        ORDER BY created_at DESC`);
    
    const term = `%${searchTerm}%`;

    return statement.all(term, term);
}

function getAllCategories() {
    const statement = db.prepare('SELECT * FROM categories ORDER BY created_at ASC');
    return statement.all();
}

function addCategory(category) {
    const statement = db.prepare(`
        INSERT INTO categories (name, image_path)
        VALUES (?, ?)
        `);
    const result = statement.run(
        category.name,
        category.image_path
    );

    return { id: result.lastInsertRowid };
}

function deleteCategory(id) {
    const statement = db.prepare('DELETE FROM categories WHERE id = ?');
    statement.run(id);
    
    return { success: true };
}

function closeDatabase() {
    if (db) {
        db.close();
    }
}

module.exports = {
    initDatabase,
    getAllItems,
    getItem,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    getAllCategories,
    addCategory,
    deleteCategory,
    closeDatabase
};