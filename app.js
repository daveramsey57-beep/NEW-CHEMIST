// ===== State & Data =====
let allDrugs = [];
let allSales = [];
const MIN_STOCK = 5;
let currentRole = 'user';
const SESSION_TIMEOUT = 30 * 60 * 1000;
let lastActivity = Date.now();

// Role check
function getRole() {
    return localStorage.getItem('role') || 'user';
}

function isAdmin() {
    return getRole() === 'admin';
}

// ===== DOM Elements =====
const loginPage = document.getElementById("loginPage");
const mainApp = document.getElementById("mainApp");

const drugSelect = document.getElementById("drugSelect");
const qtyInput = document.getElementById("qty");
const drugSearchInput = document.getElementById("drugSearch");
const salesBody = document.getElementById("salesBody");
const recentSalesBody = document.getElementById("recentSalesBody");
const inventoryBody = document.getElementById("inventoryBody");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const filterSalesBtn = document.getElementById("filterSalesBtn");
const clearSalesFilterBtn = document.getElementById("clearSalesFilterBtn");

// Stats elements
const totalSalesEl = document.getElementById("totalSales");
const dailyEl = document.getElementById("dailyTotal");
const monthlyEl = document.getElementById("monthlyTotal");
const yearlyEl = document.getElementById("yearlyTotal");
const currentDateEl = document.getElementById("currentDate");

// Inventory stats
const totalDrugsEl = document.getElementById("totalDrugs");
const lowStockCountEl = document.getElementById("lowStockCount");
const totalValueEl = document.getElementById("totalValue");

// Modal elements
const drugModal = document.getElementById("drugModal");
const drugForm = document.getElementById("drugForm");
const editDrugId = document.getElementById("editDrugId");
const modalTitle = document.getElementById("modalTitle");

// ===== Firebase Functions =====
async function loadDrugsFromFirebase() {
    try {
        console.log('Loading drugs from Firebase (new-chemist project), db:', window.db);
        if (!window.db) {
            console.error('loadDrugsFromFirebase: window.db is null/undefined');
            throw new Error('Firebase not ready');
        }
        const drugsRef = window.collection('drugs');
        const snapshot = await window.getDocs(drugsRef);
        allDrugs = [];
        snapshot.forEach(doc => {
            allDrugs.push({ id: doc.id, ...doc.data() });
        });
        console.log('Loaded drugs from Firebase, count:', allDrugs.length);
    } catch (e) {
        console.error('Error loading drugs from Firebase:', e);
        console.log('Firebase not available - starting with empty inventory');
        allDrugs = getDefaultDrugs(); // Returns empty array
    }
}

async function loadSalesFromFirebase() {
    try {
        const salesRef = window.collection('sales');
        const snapshot = await window.getDocs(salesRef);
        allSales = [];
        snapshot.forEach(doc => {
            allSales.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        console.log('No sales yet');
        allSales = [];
    }
}

async function saveDrugToFirebase(drug) {
    console.log('saveDrugToFirebase called with:', drug);
    try {
        if (drug.id) {
            console.log('Updating existing drug:', drug.id);
            const drugRef = window.doc('drugs', drug.id);
            await window.updateDoc(drugRef, drug);
            console.log('Drug updated successfully');
        } else {
            console.log('Adding new drug...');
            const drugsRef = window.collection('drugs');
            const docRef = await window.addDoc(drugsRef, drug);
            console.log('Drug added successfully, docRef:', docRef.id);
        }
    } catch (e) {
        console.error('Firebase error: ' + e.message);
        console.error(e);
    }
}

async function saveSaleToFirebase(sale) {
    try {
        const salesRef = window.collection('sales');
        if (sale.id) {
            const saleRef = window.doc('sales', sale.id);
            await window.updateDoc(saleRef, sale);
        } else {
            await window.addDoc(salesRef, sale);
        }
    } catch (e) {
        console.log('Firebase error: ' + e.message);
    }
}

async function deleteDrugFromFirebase(id) {
    console.log('deleteDrugFromFirebase called with id:', id);
    try {
        const drugRef = window.doc('drugs', id);
        await window.deleteDoc(drugRef);
        console.log('Drug deleted successfully');
    } catch (e) {
        console.error('Firebase error: ' + e.message);
    }
}

async function deleteSaleFromFirebase(id) {
    console.log('deleteSaleFromFirebase called with id:', id);
    try {
        const saleRef = window.doc('sales', id);
        await window.deleteDoc(saleRef);
        console.log('Sale deleted successfully');
    } catch (e) {
        console.error('Firebase error: ' + e.message);
    }
}

// ===== Init =====
async function waitForFirebase() {
    console.log('Waiting for Firebase...');
    let attempts = 0;
    const maxAttempts = 30;
    while ((!window.db || !window.collection) && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
        console.log('Attempt:', attempts, '| db:', typeof window.db, '| collection:', typeof window.collection, '| firebaseReady:', window.firebaseReady);
    }
    if (!window.db || !window.collection) {
        console.error('FIREBASE NOT READY');
        console.error('window.db:', typeof window.db);
        console.error('window.collection:', typeof window.collection);
        return false;
    } else {
        console.log('Firebase ready!');
    }
    return true;
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log('DOM loaded, checking login status...');
        if (!checkLoginStatus()) return;
        
        console.log('Login verified, showing main app...');
        await showMainApp();
    } catch(e) {
        console.error('Initialization error:', e);
        alert('Error loading app: ' + e.message);
    }
});

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("role");
    const lastActive = localStorage.getItem("lastActivity");
    
    if (lastActive && Date.now() - parseInt(lastActive) > SESSION_TIMEOUT) {
        logout();
        return false;
    }
    
    if (!isLoggedIn || !role) {
        window.location.href = "login.html";
        return false;
    }
    
    localStorage.setItem("lastActivity", Date.now());
    return true;
}

function showLoginPage() {
    window.location.href = "login.html";
}

async function showMainApp() {
    console.log('showMainApp called');
    loginPage.style.display = "none";
    mainApp.style.display = "flex";
    mainApp.style.width = "100%";
    setupRoleBasedUI();
    
    // Wait for Firebase with timeout
    const fbReady = await waitForFirebase();
    if (!fbReady) {
        console.warn('Firebase not available - continuing with empty data');
    }
    
    try {
        await initData();
        setupNavigation();
        setCurrentDate();
        await loadAll();
        loadAdminPages();
        console.log('App initialized successfully');
    } catch(e) {
        console.error('Error during app initialization:', e);
    }
}

function setupRoleBasedUI() {
    const role = localStorage.getItem('role') || 'user';
    const adminNav = document.getElementById('adminNavItems');
    const userNav = document.getElementById('userNavItems');
    const addDrugNavBtn = document.getElementById('addDrugNavBtn');
    
    if (role === 'admin') {
        if (adminNav) adminNav.style.display = 'block';
        if (userNav) userNav.style.display = 'none';
        if (addDrugNavBtn) addDrugNavBtn.style.display = 'flex';
    } else {
        if (adminNav) adminNav.style.display = 'none';
        if (userNav) userNav.style.display = 'block';
        if (addDrugNavBtn) addDrugNavBtn.style.display = 'none';
    }
    
    currentRole = role;
}

function loadAdminPages() {
    // Admin pages initialized in showMainApp if needed
}

function setupLogin() {
    // Login handled in login.html
}

function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("username");
    window.location.href = "login.html?t=" + new Date().getTime();
}

function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
    lastActivity = Date.now();
}

document.addEventListener("click", updateActivity);
document.addEventListener("keypress", updateActivity);
document.addEventListener("scroll", updateActivity);
document.addEventListener("mousemove", updateActivity);

setInterval(() => {
    const lastActive = localStorage.getItem("lastActivity");
    if (lastActive && Date.now() - parseInt(lastActive) > SESSION_TIMEOUT) {
        logout();
    }
}, 60000);

window.addEventListener("beforeunload", function() {
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("lastActivity");
    sessionStorage.removeItem("username");
});

window.addEventListener("pagehide", function(e) {
    if (e.persisted) {
        // Page is being cached (back/forward cache)
    } else {
        // Page is truly being discarded (tab close)
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("lastActivity");
        sessionStorage.removeItem("username");
    }
});

async function initData() {
    await loadDrugsFromFirebase();
    await loadSalesFromFirebase();
}

function getDefaultDrugs() {
    // Return empty array - new project starts with no drugs
    // Drugs should be added via Firebase or Add Drug feature
    return [];
}

async function loadAll() {
    await loadDrugsFromFirebase();
    await loadSalesFromFirebase();
    loadDrugs();
    loadSalesData();
    updateSalesTotals();
    updateInventoryStats();
    renderRecentSales();
    renderStock();
    console.log('loadAll complete, allDrugs length:', allDrugs.length);
    if (allDrugs.length > 0) {
        console.log('First drug:', allDrugs[0].name);
    }
}

function setCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-KE", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
    });
    currentDateEl.textContent = dateStr;
}

// ===== Navigation =====
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    if (!isAdmin()) {
        const userAllowedPages = ['dashboard', 'sell', 'sales', 'admin-panel'];
        if (!userAllowedPages.includes(page)) {
            page = 'dashboard';
        }
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });

    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });
    document.getElementById(`${page}-page`).classList.add("active");
    
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
    }

    if (page === "inventory") {
        renderInventory();
    } else if (page === "stock") {
        if (typeof renderStock === 'function') renderStock();
    } else if (page === "restock") {
        if (typeof renderRestockPage === 'function') renderRestockPage();
    } else if (page === "expiry") {
        if (typeof renderExpiryPage === 'function') renderExpiryPage();
    } else if (page === "admin-panel") {
        populateAdminPanel();
    }
}

// ===== Drugs =====
function loadDrugs() {
    renderDrugOptions(allDrugs);
}

function renderDrugOptions(drugs) {
    drugSelect.innerHTML = "";
    if (drugs.length === 0) {
        drugSelect.innerHTML = "<option>No drugs available</option>";
        return;
    }
    drugs.forEach(drug => {
        const option = document.createElement("option");
        option.value = drug.id;
        const stockWarning = (drug.quantity ?? 0) <= MIN_STOCK ? " (Low Stock!)" : "";
        option.textContent = `${drug.name} (${drug.category}) - ${drug.quantity ?? 0} left${stockWarning}`;
        if ((drug.quantity ?? 0) <= MIN_STOCK) option.style.color = "red";
        drugSelect.appendChild(option);
    });
}

drugSearchInput.addEventListener("input", () => {
    const query = drugSearchInput.value.trim().toLowerCase();
    if (!query) return renderDrugOptions(allDrugs);
    const filtered = allDrugs.filter(d => 
        (d.name?.toLowerCase().includes(query)) ||
        (d.category?.toLowerCase().includes(query))
    );
    renderDrugOptions(filtered);
});

// ===== Sell Drug =====
async function sellDrug() {
    const id = drugSelect.value;
    const qty = Number(qtyInput.value);
    
    if (!id || qty <= 0) {
        alert("Select drug and enter valid quantity");
        return;
    }

    const drug = allDrugs.find(d => d.id === id);
    if (!drug) {
        alert("Drug not found!");
        return;
    }

    if (drug.expiry && new Date(drug.expiry) < new Date()) {
        alert("Cannot sell expired drugs!");
        return;
    }
    if ((drug.quantity ?? 0) < qty) {
        alert("Not enough stock!");
        return;
    }

    const totalPrice = qty * (drug.price ?? 0);

    const sale = {
        drugId: id,
        drugName: drug.name,
        category: drug.category,
        quantity: qty,
        price: drug.price,
        totalPrice,
        timestamp: new Date().toISOString()
    };

    // Save to Firebase
    await saveSaleToFirebase(sale);
    
    // Update drug quantity
    drug.quantity = (drug.quantity ?? 0) - qty;
    await saveDrugToFirebase(drug);

    alert(`Sold ${qty} x ${drug.name} for ${formatKsh(totalPrice)}`);
    qtyInput.value = "";
    drugSearchInput.value = "";
    
    await loadAll();
}

// ===== Sales =====
function loadSalesData() {
    renderSales(allSales);
}

function renderSales(salesArray) {
    salesBody.innerHTML = "";
    const grouped = {};

    salesArray.forEach(sale => {
        const dateObj = sale.timestamp ? new Date(sale.timestamp) : new Date();
        const dateKey = dateObj.toLocaleDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({ ...sale, dateObj });
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        const headerRow = document.createElement("tr");
        headerRow.className = "date-group-header";
        const headerCell = document.createElement("td");
        headerCell.colSpan = 6;
        headerCell.innerHTML = `<i class="fa-solid fa-calendar"></i> ${date}`;
        headerRow.appendChild(headerCell);
        salesBody.appendChild(headerRow);

        grouped[date].sort((a, b) => b.dateObj - a.dateObj);

        grouped[date].forEach(sale => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${sale.drugName || "N/A"}</td>
                <td>${sale.category || "N/A"}</td>
                <td>${sale.quantity ?? 0}</td>
                <td>${formatKsh(sale.totalPrice ?? 0)}</td>
                <td>${date}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn delete" onclick="deleteSale('${sale.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            salesBody.appendChild(row);
        });
    });

    if (salesArray.length === 0) {
        salesBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:40px;">No sales found</td></tr>';
    }
}

function renderRecentSales() {
    recentSalesBody.innerHTML = "";
    const recent = allSales.slice(-5).reverse();
    
    recent.forEach(sale => {
        const date = new Date(sale.timestamp).toLocaleDateString();
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${sale.drugName}</td>
            <td>${sale.category}</td>
            <td>${sale.quantity}</td>
            <td>${formatKsh(sale.totalPrice)}</td>
            <td>${date}</td>
        `;
        recentSalesBody.appendChild(row);
    });

    if (recent.length === 0) {
        recentSalesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No recent sales</td></tr>';
    }
}

async function deleteSale(id) {
    console.log('=== deleteSale START ===');
    console.log('id:', id, 'type:', typeof id);
    if (!confirm("Delete this sale? Stock will be restored to inventory.")) {
        console.log('User cancelled');
        return;
    }
    console.log('User confirmed, deleting...');
    
    // Find the sale to get drugId and quantity
    const sale = allSales.find(s => s.id === id);
    if (!sale) {
        alert("Sale not found!");
        return;
    }
    
    // Restore quantity to drug inventory
    const drug = allDrugs.find(d => d.id === sale.drugId);
    if (drug) {
        drug.quantity = (drug.quantity ?? 0) + sale.quantity;
        await saveDrugToFirebase(drug);
        console.log('Restored', sale.quantity, 'units to', drug.name);
    }
    
    // Delete the sale
    await deleteSaleFromFirebase(id);
    console.log('After deleteSaleFromFirebase');
    await loadAll();
    console.log('=== deleteSale COMPLETE ===');
}

// Sales filtering
filterSalesBtn.addEventListener("click", () => {
    const startVal = startDateInput.value;
    const endVal = endDateInput.value;
    if (!startVal || !endVal) { alert("Select both start and end dates."); return; }
    const start = new Date(startVal);
    const end = new Date(endVal); end.setHours(23,59,59,999);
    const filtered = allSales.filter(s => {
        const saleDate = new Date(s.timestamp);
        return saleDate >= start && saleDate <= end;
    });
    renderSales(filtered);
});

clearSalesFilterBtn.addEventListener("click", () => {
    startDateInput.value = "";
    endDateInput.value = "";
    loadSalesData();
});

// ===== Stats =====
function updateSalesTotals() {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startYear = new Date(now.getFullYear(), 0, 1);
    const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    let totalAll = 0, daily = 0, monthly = 0, yearly = 0;

    allSales.forEach(sale => {
        const saleDate = new Date(sale.timestamp);
        totalAll += sale.totalPrice ?? 0;
        if (saleDate >= startDay && saleDate <= endDay) daily += sale.totalPrice ?? 0;
        if (saleDate >= startMonth && saleDate <= endMonth) monthly += sale.totalPrice ?? 0;
        if (saleDate >= startYear && saleDate <= endYear) yearly += sale.totalPrice ?? 0;
    });

    totalSalesEl.textContent = formatKsh(totalAll);
    dailyEl.textContent = formatKsh(daily);
    monthlyEl.textContent = formatKsh(monthly);
    yearlyEl.textContent = formatKsh(yearly);
}

// ===== Inventory =====
function renderInventory() {
    inventoryBody.innerHTML = "";
    
    allDrugs.forEach(drug => {
        const row = document.createElement("tr");
        const qty = drug.quantity ?? 0;
        let stockClass = "in-stock";
        if (qty === 0) stockClass = "out-of-stock";
        else if (qty <= MIN_STOCK) stockClass = "low-stock";
        
        row.innerHTML = `
            <td><strong>${drug.name}</strong></td>
            <td>${drug.category}</td>
            <td>${formatKsh(drug.price)}</td>
            <td><span class="stock-status ${stockClass}">${qty}</span></td>
            <td>${drug.expiry || "N/A"}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openEditDrug('${drug.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteDrug('${drug.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        inventoryBody.appendChild(row);
    });

    if (allDrugs.length === 0) {
        inventoryBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:40px;">No drugs in inventory</td></tr>';
    }
}

function updateInventoryStats() {
    totalDrugsEl.textContent = allDrugs.length;
    const lowStock = allDrugs.filter(d => d.quantity <= MIN_STOCK).length;
    lowStockCountEl.textContent = lowStock;
    const totalValue = allDrugs.reduce((sum, d) => sum + (d.price * d.quantity), 0);
    totalValueEl.textContent = formatKsh(totalValue);
    renderInventory();
}

// ===== Stock Available Page =====
function renderStock() {
    const stockBody = document.getElementById("stockBody");
    if (!stockBody) {
        console.error('stockBody element not found');
        return;
    }
    
    console.log('renderStock called, allDrugs length:', allDrugs.length);
    stockBody.innerHTML = "";
    
    if (allDrugs.length === 0) {
        stockBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No drugs in stock. Add drugs first.</td></tr>';
        return;
    }
    
    allDrugs.forEach(drug => {
        const row = document.createElement("tr");
        const qty = drug.quantity ?? 0;
        let stockClass = "in-stock";
        if (qty === 0) stockClass = "out-of-stock";
        else if (qty <= MIN_STOCK) stockClass = "low-stock";
        
        row.innerHTML = `
            <td><strong>${drug.name}</strong></td>
            <td>${drug.category}</td>
            <td>${qty}</td>
            <td>${formatKsh(drug.price)}</td>
            <td><span class="stock-status ${stockClass}">${qty === 0 ? 'Out of Stock' : qty <= MIN_STOCK ? 'Low Stock' : 'In Stock'}</span></td>
        `;
        stockBody.appendChild(row);
    });
}

// Stock search functionality
const stockSearchInput = document.getElementById("stockSearch");
const stockSearchBtn = document.getElementById("stockSearchBtn");

function performStockSearch() {
    if (!stockSearchInput) return;
    const query = stockSearchInput.value.trim().toLowerCase();
    const stockBody = document.getElementById("stockBody");
    if (!stockBody) return;
    
    stockBody.innerHTML = "";
    
    if (!query) {
        renderStock();
        return;
    }
    
    const filtered = allDrugs.filter(d => 
        (d.name?.toLowerCase().includes(query)) ||
        (d.category?.toLowerCase().includes(query))
    );
    
    filtered.forEach(drug => {
        const row = document.createElement("tr");
        const qty = drug.quantity ?? 0;
        let stockClass = "in-stock";
        if (qty === 0) stockClass = "out-of-stock";
        else if (qty <= MIN_STOCK) stockClass = "low-stock";
        
        row.innerHTML = `
            <td><strong>${drug.name}</strong></td>
            <td>${drug.category}</td>
            <td>${qty}</td>
            <td>${formatKsh(drug.price)}</td>
            <td><span class="stock-status ${stockClass}">${qty === 0 ? 'Out of Stock' : qty <= MIN_STOCK ? 'Low Stock' : 'In Stock'}</span></td>
        `;
        stockBody.appendChild(row);
    });
    
    if (filtered.length === 0) {
        stockBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No matching drugs found</td></tr>';
    }
}

if (stockSearchInput) {
    stockSearchInput.addEventListener("input", performStockSearch);
}

if (stockSearchBtn) {
    stockSearchBtn.addEventListener("click", performStockSearch);
}

// ===== Restock Page =====
function renderRestockPage() {
    const restockDrugSelect = document.getElementById("restockDrugSelect");
    const restockSearch = document.getElementById("restockSearch");
    if (!restockDrugSelect) return;
    
    restockDrugSelect.innerHTML = '<option value="">Select a drug to restock</option>';
    
    const sortedDrugs = [...allDrugs].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '')
    );
    
    sortedDrugs.forEach(drug => {
        const option = document.createElement("option");
        option.value = drug.id;
        option.textContent = `${drug.name} (${drug.category}) - Current: ${drug.quantity ?? 0}`;
        restockDrugSelect.appendChild(option);
    });
    
    // Show low stock notice
    const lowStockList = document.getElementById("lowStockList");
    const lowStockNotice = document.getElementById("lowStockNotice");
    if (lowStockList && lowStockNotice) {
        const lowStockDrugs = allDrugs.filter(d => (d.quantity ?? 0) <= MIN_STOCK);
        if (lowStockDrugs.length > 0) {
            lowStockNotice.style.display = 'block';
            lowStockList.innerHTML = '';
            lowStockDrugs.forEach(d => {
                const li = document.createElement("li");
                li.textContent = `${d.name} - Only ${d.quantity ?? 0} left`;
                lowStockList.appendChild(li);
            });
        } else {
            lowStockNotice.style.display = 'none';
        }
    }
}

// Restock search functionality
const restockSearchInput = document.getElementById("restockSearch");
if (restockSearchInput) {
    restockSearchInput.addEventListener("input", () => {
        const query = restockSearchInput.value.trim().toLowerCase();
        const restockDrugSelect = document.getElementById("restockDrugSelect");
        if (!restockDrugSelect) return;
        
        restockDrugSelect.innerHTML = '<option value="">Select a drug to restock</option>';
        
        const sortedDrugs = [...allDrugs].sort((a, b) => 
            (a.name || '').localeCompare(b.name || '')
        );
        
        const filtered = query 
            ? sortedDrugs.filter(d => 
                (d.name?.toLowerCase().includes(query)) ||
                (d.category?.toLowerCase().includes(query))
              )
            : sortedDrugs;
        
        filtered.forEach(drug => {
            const option = document.createElement("option");
            option.value = drug.id;
            option.textContent = `${drug.name} (${drug.category}) - Current: ${drug.quantity ?? 0}`;
            restockDrugSelect.appendChild(option);
        });
    });
}

// Handle drug selection change to show current stock
const restockDrugSelect = document.getElementById("restockDrugSelect");
if (restockDrugSelect) {
    restockDrugSelect.addEventListener("change", () => {
        const drugId = restockDrugSelect.value;
        const restockCurrentStock = document.getElementById("restockCurrentStock");
        if (drugId && restockCurrentStock) {
            const drug = allDrugs.find(d => d.id === drugId);
            if (drug) {
                restockCurrentStock.value = drug.quantity ?? 0;
            }
        } else if (restockCurrentStock) {
            restockCurrentStock.value = '';
        }
    });
}

// Handle restock form submission
const restockForm = document.getElementById("restockForm");
if (restockForm) {
    restockForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const drugId = document.getElementById("restockDrugSelect").value;
        const quantityToAdd = Number(document.getElementById("restockQuantity").value);
        const supplier = document.getElementById("restockSupplier").value;
        
        if (!drugId || quantityToAdd <= 0) {
            alert("Please select a drug and enter a valid quantity");
            return;
        }
        
        const drug = allDrugs.find(d => d.id === drugId);
        if (!drug) {
            alert("Drug not found!");
            return;
        }
        
        // Update drug quantity
        drug.quantity = (drug.quantity ?? 0) + quantityToAdd;
        await saveDrugToFirebase(drug);
        
        alert(`Successfully restocked ${drug.name} with ${quantityToAdd} units. New stock: ${drug.quantity}`);
        
        // Reset form
        restockForm.reset();
        document.getElementById("restockCurrentStock").value = '';
        
        // Refresh the page
        renderRestockPage();
    });
}

// ===== Modal Functions =====
function showAddDrugModal() {
    modalTitle.textContent = "Add New Drug";
    editDrugId.value = "";
    drugForm.reset();
    drugModal.classList.add("active");
}

function openEditDrug(id) {
    const drug = allDrugs.find(d => d.id === id);
    if (!drug) return;
    
    modalTitle.textContent = "Edit Drug";
    editDrugId.value = drug.id;
    document.getElementById("drugName").value = drug.name;
    document.getElementById("drugCategory").value = drug.category;
    document.getElementById("drugPrice").value = drug.price;
    document.getElementById("drugQuantity").value = drug.quantity;
    document.getElementById("drugExpiry").value = drug.expiry || "";
    drugModal.classList.add("active");
}

function closeModal() {
    drugModal.classList.remove("active");
}

async function saveDrug(e) {
    e.preventDefault();
    console.log('saveDrug function triggered');
    
    const id = editDrugId.value;
    const name = document.getElementById("drugName").value;
    const category = document.getElementById("drugCategory").value;
    const price = Number(document.getElementById("drugPrice").value);
    const quantity = Number(document.getElementById("drugQuantity").value);
    const expiry = document.getElementById("drugExpiry").value;
    
    console.log('Form values - id:', id, 'name:', name, 'category:', category, 'price:', price, 'quantity:', quantity, 'expiry:', expiry);

    if (id) {
        const drug = allDrugs.find(d => d.id === id);
        if (drug) {
            drug.name = name;
            drug.category = category;
            drug.price = price;
            drug.quantity = quantity;
            drug.expiry = expiry || null;
            await saveDrugToFirebase(drug);
        }
    } else {
        const newDrug = {
            name,
            category,
            price,
            quantity,
            expiry: expiry || null
        };
        console.log('Creating new drug with data:', newDrug);
        await saveDrugToFirebase(newDrug);
    }

    closeModal();
    await loadDrugsFromFirebase();
    loadDrugs();
    updateInventoryStats();
}

async function deleteDrug(id) {
    console.log('=== deleteDrug START ===');
    console.log('id:', id, 'type:', typeof id);
    if (!confirm("Delete this drug from inventory?")) {
        console.log('User cancelled');
        return;
    }
    console.log('User confirmed, deleting...');
    await deleteDrugFromFirebase(id);
    console.log('After deleteDrugFromFirebase');
    await loadDrugsFromFirebase();
    console.log('After loadDrugsFromFirebase');
    loadDrugs();
    updateInventoryStats();
    console.log('=== deleteDrug COMPLETE ===');
}

// ===== Utilities =====
function formatKsh(amount) {
    return "KSh " + (amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });
}

// ===== Role-Based Access Control =====
function updateNavByRole() {
    const isUserAdmin = isAdmin();
    
    document.getElementById('userNavItems').style.display = isUserAdmin ? 'none' : 'flex';
    document.getElementById('adminNavItems').style.display = isUserAdmin ? 'flex' : 'none';
    document.getElementById('userInfoName').textContent = isUserAdmin ? 'Admin' : 'New Chemist User';
    
    const addDrugBtn = document.getElementById('addDrugNavBtn');
    if (addDrugBtn) {
        addDrugBtn.style.display = isUserAdmin ? 'flex' : 'none';
    }
    
    const inventoryAddBtn = document.getElementById('inventoryAddBtn');
    if (inventoryAddBtn) {
        inventoryAddBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
    }
}

function setupRoleBasedUI() {
    setTimeout(() => {
        const role = getRole();
        window.currentRole = role;
        updateNavByRole();
        
        if (role !== 'admin') {
            navigateTo('sell');
        }
    }, 100);
}

// Make functions global
window.sellDrug = sellDrug;
window.deleteSale = deleteSale;
window.showAddDrugModal = showAddDrugModal;
window.openEditDrug = openEditDrug;
window.closeModal = closeModal;
window.saveDrug = saveDrug;
window.deleteDrug = deleteDrug;
window.navigateTo = navigateTo;
window.logout = logout;
window.getRole = getRole;
window.isAdmin = isAdmin;
window.updateNavByRole = updateNavByRole;
window.setupRoleBasedUI = setupRoleBasedUI;
window.toggleMobileMenu = toggleMobileMenu;

// Mobile menu handler
function handleMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (window.innerWidth <= 768) {
        if (menuBtn) menuBtn.style.display = 'flex';
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
    } else {
        if (menuBtn) menuBtn.style.display = 'none';
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
            sidebar.style.left = '';
        }
    }
}

function toggleMobileMenu() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
        var overlay = sidebar.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.toggle('active');
    }
}

window.addEventListener('resize', handleMobileMenu);
window.addEventListener('
