// State
let currentItems = []; // items in collection
let editingItemId = null; // item currently being edited
let currentCategories = []; // categories in collection
let currentCategory = 'all'; 
let imageHandlerSetup = false; // prevent duplicate listeners (item img ver)
let categoryImageHandlersSetup = false; // prevent duplicate listeners (cat img ver)
const catColors = ['#c7522a', '#476fb3', '#e0b460', '#c67d96', '#dede3e', '#7d96c6', '#77bf77', '#d1b7d4'];

// helper method for matching category colors
function getCatColor(categoryName) {
    if (!categoryName) return '#e3f2fd';

    const index = currentCategories.findIndex(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (index === -1) return '#e3f2fd';

    return catColors[index % catColors.length];
}

// App Initialization
document.addEventListener('DOMContentLoaded', async() => {
    await loadCategories();
    await loadItems();
    setupEventListeners();
});

// Stats Dashboard
function updateStats(items) {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
    const categories = new Set(items.map(item => item.category).filter(Boolean));

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('totalCategories').textContent = categories.size;

    drawCategoryCircles(items);
}

function drawCategoryCircles(items) {
    const itemsSegments = document.getElementById('itemsCircleSegments');
    const valueSegments = document.getElementById('valueCircleSegments');

    itemsSegments.innerHTML = '';
    valueSegments.innerHTML = '';

    if (items.length === 0) return;

    const categoryData = {};
    items.forEach(item => {
        const cat = item.category || 'uncategorized';
        if (!categoryData[cat]) {
            categoryData[cat] = { count: 0, value: 0};
        }
        categoryData[cat].count++;
        categoryData[cat].value += parseFloat(item.purchase_price) || 0;
    });

    const colors = ['#c7522a', '#476fb3', '#e0b460', '#c67d96', '#dede3e', '#7d96c6', '#77bf77', '#d1b7d4'];
    const categoryNames = currentCategories.map(cat => cat.name).filter(name => categoryData[name.toLowerCase()] || categoryData[name]);
    
    let itemsOffset = 0;
    const totalItems = items.length;
    const circumference = 2 * Math.PI * 80;

    categoryNames.forEach((cat, index) => {
        const percentage = categoryData[cat].count / totalItems;
        const segmentLength = circumference * percentage;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '90');
        circle.setAttribute('cy', '90');
        circle.setAttribute('r', '80');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', colors[index % colors.length]);
        circle.setAttribute('stroke-width', '8');
        circle.setAttribute('stroke-linecap', 'butt');
        circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference - segmentLength}`);
        circle.setAttribute('stroke-dashoffset', -itemsOffset);

        itemsSegments.appendChild(circle);
        itemsOffset += segmentLength;
    });

    let valueOffset = 0;
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);

    if (totalValue > 0) {
        categoryNames.forEach((cat, index) => {
            const percentage = categoryData[cat].value / totalValue;
            const segmentLength = circumference * percentage;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '90');
            circle.setAttribute('cy', '90');
            circle.setAttribute('r', '80');
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', colors[index % colors.length]);
            circle.setAttribute('stroke-width', '8');
            circle.setAttribute('stroke-linecap', 'butt');
            circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference - segmentLength}`);
            circle.setAttribute('stroke-dashoffset', -valueOffset);

            valueSegments.appendChild(circle);
            valueOffset += segmentLength;
        });
    }

    const categoriesSegments = document.getElementById('categoriesCircleSegments');
    categoriesSegments.innerHTML = '';

    const numCategories = categoryNames.length;
    if (numCategories > 0) {
        const segmentLength = circumference / numCategories;
        currentOffset = 0;

        categoryNames.forEach((cat, index) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
             circle.setAttribute('cx', '90');
            circle.setAttribute('cy', '90');
            circle.setAttribute('r', '80');
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', colors[index % colors.length]);
            circle.setAttribute('stroke-width', '8');
            circle.setAttribute('stroke-linecap', 'butt');
            circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference - segmentLength}`);
            circle.setAttribute('stroke-dashoffset', currentOffset);

            categoriesSegments.appendChild(circle);
            currentOffset -= segmentLength;
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // ADD CATEGORY MODAL //
    // adding a category
    document.getElementById('addTab').addEventListener('click', showCategoryModal);
    // closing the modal
    document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
    // submitting the form
    document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);

    document.querySelector('[data-category="all"]').addEventListener('click', () => switchTab('all'));

    // ADD ITEM MODAL //
    // adding an item
    document.getElementById('addItemCard').addEventListener('click', showAddModal);
    // closing the modal
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    // submitting the form
    document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);
    // searching
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // item modal closing with click outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('itemModal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // category modal closing with click outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('categoryModal');
        if (e.target === modal) {
            closeCategoryModal();
        }
    });
}

// Category Functions
async function loadCategories() {
    try {
        currentCategories = await window.api.getAllCategories();
        renderTabs(currentCategories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderTabs(categories) {
    const tabsContainer = document.getElementById('categoryTabs'); // container to hold tabs
    const allTab = tabsContainer.querySelector('[data-category="all"]'); // reference to main tab (all items)
    const addTab = tabsContainer.querySelector('#addTab'); // reference to add tab option

    // reset tab container and add main tab first
    tabsContainer.innerHTML = ''; 
    tabsContainer.appendChild(allTab);

    // look through category db and create tab for each
    categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.category = category.name.toLowerCase();
        tab.innerHTML = `
            ${category.image_path
                ? `<img src="${escapeHtml(category.image_path)}" alt="${escapeHtml(category.name)}" class="tab-icon-img">`
                : `<span class="tab-icon">🗂️</span>`
            }
            <span class="tab-label">${escapeHtml(category.name)}</span>
        `;
        
        // allow for long press on tab to delete
        let pressTimer;
        tab.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                confirmDeleteCategory(category);
            }, 1000);
        });

        // stop delete process is mouse released before 1s or mouse leaves tab
        tab.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
        });
        tab.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        // switch to tab clicked
        tab.addEventListener('click', () => switchTab(category.name.toLowerCase()));
        tabsContainer.appendChild(tab);
    });

    // ensure that the addTab is always at the end
    tabsContainer.appendChild(addTab);
    updateActiveTab();
}

async function confirmDeleteCategory(category) {
    const confirmed = confirm(`Delete category: "${category.name}"? Items in this category will not be deleted.`);

    if (!confirmed) return;

    try {
        await window.api.deleteCategory(category.id);

        if (currentCategory === category.name.toLowerCase()) {
            switchTab('all');
        }

        await loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category. Please try again.');
    }
}

function switchTab(category) {
    currentCategory = category;
    updateActiveTab();

    if (category === 'all') {
        displayItems(currentItems);
    } else {
        const filtered = currentItems.filter(item =>
            item.category && item.category.toLowerCase() === category
        );
        displayItems(filtered);
    }
}

function updateActiveTab() {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === currentCategory) {
            tab.classList.add('active');
        }
    });
}

function showCategoryModal() {
    // clear the form from previous 
    document.getElementById('categoryForm').reset(); 
    document.getElementById('categoryImagePreview').innerHTML = '<div class="image-placeholder">No Image Selected</div>';
    document.getElementById('categoryImagePath').value = '';
    document.getElementById('categoryModal').style.display = 'block';
    setupCategoryImageHandlers();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

async function handleCategoryFormSubmit(e) {
    e.preventDefault();

    // create category with data from form
    const category = {
        name: document.getElementById('categoryName').value,
        image_path: document.getElementById('categoryImagePath').value || null
    };

    try {
        // add category to db, close modal, rebuild category bar, load items
        await window.api.addCategory(category);
        closeCategoryModal();
        await loadCategories();
        await loadItems();
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Failed to save category. Please try again.');
    }
}

function setupCategoryImageHandlers() {
    // ensure old listeners have been closed
    if (categoryImageHandlersSetup) return;
    categoryImageHandlersSetup = true;

    // establish references to elements
    const uploadBtn = document.getElementById('uploadCategoryImageBtn');
    const fileInput = document.getElementById('categoryImageFileInput');
    const urlInput = document.getElementById('categoryImageUrlInput');

    // allow for file to be uploaded as image
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                showImagePreview(event.target.result);
                document.getElementById('categoryImagePreview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                document.getElementById('categoryImagePath').value = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // allow for image url to be pasted
    urlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url) {
            showImagePreview(url);
            document.getElementById('categoryImagePreview').innerHTML = `<img src="${url}" alt="Preview">`;
            document.getElementById('categoryImagePath').value = url;
        }
    });
}

function setupImageHandlers() {
    // ensure old listeners have been closed
    if (imageHandlerSetup) return;
    imageHandlerSetup = true;

    const uploadBtn = document.getElementById('uploadImageBtn');
    const fileInput = document.getElementById('imageFileInput');
    const urlInput = document.getElementById('imageUrlInput');

    // allow for file to be uploaded as image
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                showImagePreview(event.target.result);
                document.getElementById('imagePath').value = event.target.result;
                document.getElementById('imageType').value = 'base64';
            };
            reader.readAsDataURL(file);
        }
    });

    // allow for image url to be pasted
    urlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url) {
            showImagePreview(url);
            document.getElementById('imagePath').value = url;
            document.getElementById('imageType').value = 'url';
        }
    });
}

function showImagePreview(src) {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `<img src="${src}" alt="Preview">`; 
}

function clearImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `<div class="image-placeholder">No Image Selected</div>`;
    document.getElementById('imagePath').value = '';
    document.getElementById('imageType').value = '';
    document.getElementById('imageUrlInput').value = '';
    document.getElementById('imageFileInput').value = '';
}

// Item List Functions
async function loadItems() {
    try {
        currentItems = await window.api.getAllItems();
        displayItems(currentItems);
        updateStats(currentItems);
    } catch (error) {
        console.error('Error loading items:', error);
        alert('Failed to load items. Please try again');
    }
}

function displayItems(items) {
    const itemsList = document.getElementById('itemsList'); // container to hold items
    const addCard = document.getElementById('addItemCard'); // reference to the add item card
    
    // reset item list container and add add item card to first slot
    itemsList.innerHTML = '';
    itemsList.appendChild(addCard);

    if (items.length === 0) {
        return;
    }

    items.forEach(item => {
        const itemCard = createItemCard(item);
        itemsList.appendChild(itemCard);
    });
}

function populateCatDropdown() {
    const select = document.getElementById('itemCategory');

    select.innerHTML = '<option value="">Select a category...</option>';

    currentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <div class="item-image">
            ${item.image_path
                ? `<img src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.name)}">`
                : `<div class="no-image">No Image Provided</div>`
            }
        </div>

        <h3>${escapeHtml(item.name)}</h3>
        ${item.category ? `<div class="item-category" style="background-color: ${getCatColor(item.category)}; color: white;">${escapeHtml(item.category)}</div>` : ''}

        <div class="item-details">
            ${item.purchase_price ? `
                <div class="item-detail">
                    <div class="item-detail-label">Price</div>
                    <div class="item-detail-value">$${parseFloat(item.purchase_price).toFixed(2)}</div>
                </div>
            ` : ''}
            ${item.purchase_date ? `
                <div class="item-detail">
                    <div class="item-detail-label"> Purchase Date</div>
                    <div class="item-detail-value">${item.purchase_date}</div>
                </div>
            ` : ''}
        </div>

        <div class="item-menu">
            <button class="menu-btn" onclick="event.stopPropagation(); window.toggleMenu(${item.id})">⋮</button>
            <div class="menu-dropdown" id="menu-${item.id}" style="display: none;">
                <button onclick="event.stopPropagation(); window.editItem(${item.id})">Edit</button>
                <button onclick="event.stopPropagation(); window.deleteItem(${item.id})">Delete</button>
            </div>
        </div>
    `;
    return card;
}

function toggleMenu(itemId) {
    const menu = document.getElementById(`menu-${itemId}`); // reference to item specific dropdown
    const allMenus = document.querySelectorAll(`.menu-dropdown`); 
    // ensure other dropdowns are closed
    allMenus.forEach(m => {
        if (m.id !== `menu-${itemId}`) {
            m.style.display = 'none';
        }
    });

    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// if any clicks are made outside the menu, close it
document.addEventListener('click', (e) => {
    if (!e.target.closest('.item-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => {
            m.style.display = 'none';
        });
    }
});


function showAddModal() {
    editingItemId = null;
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    clearImagePreview();
    populateCatDropdown();
    //image handling
    setupImageHandlers();
    document.getElementById('itemModal').style.display = 'block';
}

async function editItem(id) {
    try {
        const item = await window.api.getItem(id);
        if (!item) {
            alert('Item not found');
            return;
        }

        editingItemId = id;
        document.getElementById('modalTitle').textContent = 'Edit Item';
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemPurchaseDate').value = item.purchase_date || '';
        document.getElementById('itemPurchasePrice').value = item.purchase_price || '';

        if (item.image_path) {
            showImagePreview(item.image_path);
            document.getElementById('imagePath').value = item.image_path;
        } else {
            clearImagePreview();
        }

        populateCatDropdown();
        //image handling
        setupImageHandlers();
        document.getElementById('itemModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading item:', error);
        alert('Failed to load item details. Please try again.');
    }
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    editingItemId = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const item = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        purchase_date: document.getElementById('itemPurchaseDate').value,
        purchase_price: parseFloat(document.getElementById('itemPurchasePrice').value) || null,
        image_path: document.getElementById('imagePath').value || null
    };

    try {
        if (editingItemId) {
            await window.api.updateItem(editingItemId, item);
        } else {
            await window.api.addItem(item);
        }

        closeModal();
        await loadItems();
    } catch (error) {
        console.error('Error saving item: ', error);
        alert('Failed to save item. Please try again.');
    }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        await window.api.deleteItem(id);
        await loadItems();
    } catch (error) {
        console.error('Error deleting item: ', error);
        alert('Failed to delete item. Please try again');
    }
}

async function handleSearch(e) {
    const searchTerm = e.target.value.trim();

    if (!searchTerm) {
        displayItems(currentItems);
        return;
    }

    try {
        const results = await window.api.searchItems(searchTerm);
        displayItems(results);
    } catch (error) {
        console.error('Error searching: ', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.editItem = editItem;
window.deleteItem = deleteItem;
window.toggleMenu = toggleMenu;
window.switchTab = switchTab;
