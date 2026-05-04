// ===== State & Data =====
let allDrugs = [];
let allSales = [];
let allServices = [];
let allReceipts = [];
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

// Service modal elements
const serviceModal = document.getElementById("serviceModal");
const serviceForm = document.getElementById("serviceForm");
const editServiceId = document.getElementById("editServiceId");
const serviceModalTitle = document.getElementById("serviceModalTitle");

// Receipt modal
const receiptModal = document.getElementById("receiptModal");

// ===== Firebase Functions =====
async function loadDrugsFromFirebase() {
    try {
        if (!window.db) throw new Error('Firebase not ready');
        const drugsRef = window.collection('drugs');
        const snapshot = await window.getDocs(drugsRef);
        allDrugs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allDrugs.push({
                id: doc.id,
                name: data.name,
                category: data.category,
                quantity: data.quantity,
                price: data.price,
                expiry: data.expiry
            });
        });
    } catch (e) {
        console.log('Loading default drugs (Firebase error)');
        allDrugs = getDefaultDrugs();
    }
}

async function loadServicesFromFirebase() {
    try {
        if (!window.db) throw new Error('Firebase not ready');
        const servicesRef = window.collection('services');
        const snapshot = await window.getDocs(servicesRef);
        allServices = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allServices.push({
                id: doc.id,
                name: data.name,
                price: data.price
            });
        });
    } catch (e) {
        console.log('No services found, using defaults');
        allServices = getDefaultServices();
    }
}

async function loadReceiptsFromFirebase() {
    try {
        if (!window.db) throw new Error('Firebase not ready');
        const receiptsRef = window.collection('receipts');
        const snapshot = await window.getDocs(receiptsRef);
        allReceipts = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allReceipts.push({
                id: doc.id,
                itemName: data.itemName,
                type: data.type,
                quantity: data.quantity,
                unitPrice: data.unitPrice,
                totalPrice: data.totalPrice,
                timestamp: data.timestamp
            });
        });
    } catch (e) {
        console.log('No receipts found');
        allReceipts = [];
    }
}

async function loadSalesFromFirebase() {
    try {
        const salesRef = window.collection('sales');
        const snapshot = await window.getDocs(salesRef);
        allSales = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allSales.push({
                id: doc.id,
                drugId: data.drugId,
                drugName: data.drugName,
                category: data.category,
                quantity: data.quantity,
                price: data.price,
                totalPrice: data.totalPrice,
                timestamp: data.timestamp
            });
        });
    } catch (e) {
        console.log('No sales yet');
        allSales = [];
    }
}

async function saveDrugToFirebase(drug) {
    try {
        if (drug.id) {
            const drugRef = window.doc('drugs', drug.id);
            await window.updateDoc(drugRef, drug);
        } else {
            const drugsRef = window.collection('drugs');
            const docRef = await window.addDoc(drugsRef, drug);
            drug.id = docRef.id;
        }
    } catch (e) {
        console.error('Firebase error: ' + e.message);
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
    try {
        const drugRef = window.doc('drugs', id);
        await window.deleteDoc(drugRef);
    } catch (e) {
        console.error('Firebase error: ' + e.message);
    }
}

async function deleteSaleFromFirebase(id) {
    try {
        const saleRef = window.doc('sales', id);
        await window.deleteDoc(saleRef);
    } catch (e) {
        console.error('Firebase error: ' + e.message);
    }
}

async function saveServiceToFirebase(service) {
    try {
        if (service.id) {
            const serviceRef = window.doc('services', service.id);
            await window.updateDoc(serviceRef, service);
        } else {
            const servicesRef = window.collection('services');
            const docRef = await window.addDoc(servicesRef, service);
            service.id = docRef.id;
        }
    } catch (e) {
        console.error('Firebase error saving service: ' + e.message);
    }
}

async function deleteServiceFromFirebase(id) {
    try {
        const serviceRef = window.doc('services', id);
        await window.deleteDoc(serviceRef);
    } catch (e) {
        console.error('Firebase error deleting service: ' + e.message);
    }
}

async function saveReceiptToFirebase(receipt) {
    try {
        const receiptsRef = window.collection('receipts');
        const docRef = await window.addDoc(receiptsRef, receipt);
        receipt.id = docRef.id;
    } catch (e) {
        console.error('Firebase error saving receipt: ' + e.message);
    }
}

// ===== Init =====
async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 30;
    while ((!window.db || !window.collection) && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }
    return !!(window.db && window.collection);
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkLoginStatus()) return;
    await showMainApp();
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
    loginPage.style.display = "none";
    mainApp.style.display = "flex";
    mainApp.style.width = "100%";
    setupRoleBasedUI();
    
    const fbReady = await waitForFirebase();
    if (!fbReady) {
        console.warn('Using default data - Firebase not available');
    }
    
    await initData();
    setupNavigation();
    setCurrentDate();
    await loadAll();
    loadAdminPages();
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
    if (!e.persisted) {
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("lastActivity");
        sessionStorage.removeItem("username");
    }
});

async function initData() {
    await loadDrugsFromFirebase();
    await loadSalesFromFirebase();
    await loadServicesFromFirebase();
    await loadReceiptsFromFirebase();
}

function getDefaultDrugs() {
    return [
        { id: "1", name: "Paracetamol 500mg", category: "Pain Relief", quantity: 500, price: 20, expiry: "2026-12-31" },
        { id: "2", name: "Amoxicillin 250mg", category: "Antibiotic", quantity: 200, price: 150, expiry: "2026-06-30" },
        { id: "3", name: "Aspirin 300mg", category: "Pain Relief", quantity: 300, price: 15, expiry: "2027-01-31" },
        { id: "4", name: "Ibuprofen 400mg", category: "Pain Relief", quantity: 250, price: 35, expiry: "2026-09-30" },
        { id: "5", name: "Cetirizine 10mg", category: "Allergy", quantity: 150, price: 25, expiry: "2026-08-31" },
        { id: "6", name: "Vitamin C 1000mg", category: "Vitamins", quantity: 400, price: 50, expiry: "2027-06-30" },
        { id: "7", name: "Metronidazole 200mg", category: "Antibiotic", quantity: 100, price: 120, expiry: "2026-05-31" },
        { id: "8", name: "Panadol Extra", category: "Pain Relief", quantity: 350, price: 30, expiry: "2026-11-30" },
        { id: "9", name: "Omeprazole 20mg", category: "Anti-ulcer", quantity: 180, price: 80, expiry: "2026-10-31" },
        { id: "10", name: "Azithromycin 250mg", category: "Antibiotic", quantity: 120, price: 250, expiry: "2026-07-31" },
        { id: "11", name: "ORS Powder", category: "Oral Rehydration", quantity: 600, price: 10, expiry: "2027-03-31" },
        { id: "12", name: "Hydrocortisone Cream", category: "Skin", quantity: 80, price: 150, expiry: "2026-08-31" }
    ];
}

function getDefaultServices() {
    return [
        { id: "s1", name: "Blood Pressure Check", price: 200 },
        { id: "s2", name: "Blood Sugar Test", price: 300 },
        { id: "s3", name: "Body Temperature Check", price: 100 },
        { id: "s4", name: "Prescription Consultation", price: 500 }
    ];
}

async function loadAll() {
    await loadDrugsFromFirebase();
    await loadSalesFromFirebase();
    await loadServicesFromFirebase();
    await loadReceiptsFromFirebase();
    loadDrugs();
    loadSalesData();
    updateSalesTotals();
    updateInventoryStats();
    renderRecentSales();
    renderStock();
    renderServices();
    renderReceipts();
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
        const userAllowedPages = ['dashboard', 'sell', 'sales', 'receipts', 'admin-panel'];
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
    const targetPage = document.getElementById(page + '-page');
    if (targetPage) targetPage.classList.add("active");
    
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
    } else if (page === "services") {
        renderServices();
    } else if (page === "receipts") {
        renderReceipts();
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

    await saveSaleToFirebase(sale);
    
    drug.quantity = (drug.quantity ?? 0) - qty;
    await saveDrugToFirebase(drug);

    // Generate receipt
    const receipt = {
        itemName: drug.name,
        type: 'Drug Sale',
        quantity: qty,
        unitPrice: drug.price,
        totalPrice,
        timestamp: new Date().toISOString()
    };
    await saveReceiptToFirebase(receipt);

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
    if (!confirm("Delete this sale? Stock will be restored to inventory.")) {
        return;
    }
    
    const sale = allSales.find(s => s.id === id);
    if (!sale) {
        alert("Sale not found!");
        return;
    }
    
    const drug = allDrugs.find(d => d.id === sale.drugId);
    if (drug) {
        drug.quantity = (drug.quantity ?? 0) + sale.quantity;
        await saveDrugToFirebase(drug);
    }
    
    await deleteSaleFromFirebase(id);
    await loadAll();
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
    if (!stockBody) return;
    
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
        
        drug.quantity = (drug.quantity ?? 0) + quantityToAdd;
        await saveDrugToFirebase(drug);
        
        alert(`Successfully restocked ${drug.name} with ${quantityToAdd} units. New stock: ${drug.quantity}`);
        
        restockForm.reset();
        document.getElementById("restockCurrentStock").value = '';
        
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
    
    const id = editDrugId.value;
    const name = document.getElementById("drugName").value;
    const category = document.getElementById("drugCategory").value;
    const price = Number(document.getElementById("drugPrice").value);
    const quantity = Number(document.getElementById("drugQuantity").value);
    const expiry = document.getElementById("drugExpiry").value;
    
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
        const newDrug = { name, category, price, quantity, expiry: expiry || null };
        await saveDrugToFirebase(newDrug);
    }

    closeModal();
    await loadDrugsFromFirebase();
    loadDrugs();
    updateInventoryStats();
}

async function deleteDrug(id) {
    if (!confirm("Delete this drug from inventory?")) return;
    await deleteDrugFromFirebase(id);
    await loadDrugsFromFirebase();
    loadDrugs();
    updateInventoryStats();
}

// ===== Services =====
function renderServices() {
    const servicesBody = document.getElementById("servicesBody");
    if (!servicesBody) return;

    servicesBody.innerHTML = "";
    allServices.forEach(service => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${service.name}</strong></td>
            <td>${formatKsh(service.price)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="openEditService('${service.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteService('${service.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        servicesBody.appendChild(row);
    });

    if (allServices.length === 0) {
        servicesBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:40px;">No services added yet</td></tr>';
    }
}

function showAddServiceModal() {
    serviceModalTitle.textContent = "Add New Service";
    editServiceId.value = "";
    serviceForm.reset();
    serviceModal.classList.add("active");
}

function openEditService(id) {
    const service = allServices.find(s => s.id === id);
    if (!service) return;

    serviceModalTitle.textContent = "Edit Service";
    editServiceId.value = service.id;
    document.getElementById("serviceName").value = service.name;
    document.getElementById("servicePrice").value = service.price;
    serviceModal.classList.add("active");
}

function closeServiceModal() {
    serviceModal.classList.remove("active");
}

async function saveService(e) {
    e.preventDefault();
    const id = editServiceId.value;
    const name = document.getElementById("serviceName").value;
    const price = Number(document.getElementById("servicePrice").value);

    if (id) {
        const service = allServices.find(s => s.id === id);
        if (service) {
            service.name = name;
            service.price = price;
            await saveServiceToFirebase(service);
        }
    } else {
        const newService = { name, price };
        allServices.push(newService);
        await saveServiceToFirebase(newService);
    }

    closeServiceModal();
    await loadServicesFromFirebase();
    renderServices();
}

async function deleteService(id) {
    if (!confirm("Delete this service?")) return;
    await deleteServiceFromFirebase(id);
    await loadServicesFromFirebase();
    renderServices();
}

// ===== Receipts =====
function renderReceipts() {
    const receiptsBody = document.getElementById("receiptsBody");
    if (!receiptsBody) return;

    receiptsBody.innerHTML = "";
    const sortedReceipts = [...allReceipts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedReceipts.forEach(receipt => {
        const row = document.createElement("tr");
        const date = new Date(receipt.timestamp).toLocaleDateString();
        row.innerHTML = `
            <td><strong>${receipt.id}</strong></td>
            <td>${receipt.itemName}</td>
            <td>${formatKsh(receipt.totalPrice)}</td>
            <td>${date}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="viewReceipt('${receipt.id}')"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        receiptsBody.appendChild(row);
    });

    if (sortedReceipts.length === 0) {
        receiptsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No receipts generated yet</td></tr>';
    }
}

function viewReceipt(id) {
    const receipt = allReceipts.find(r => r.id === id);
    if (!receipt) return;

    const receiptContent = document.getElementById("receiptContent");
    const date = new Date(receipt.timestamp).toLocaleString();

    receiptContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
            <h3 style="margin: 0;">New Chemist</h3>
            <p style="color: #666; font-size: 0.85rem;">Your Health, Our Priority</p>
        </div>
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">
        <p><strong>Receipt ID:</strong> ${receipt.id}</p>
        <p><strong>Date:</strong> ${date}</p>
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">
        <p><strong>Item:</strong> ${receipt.itemName}</p>
        <p><strong>Type:</strong> ${receipt.type || 'Sale'}</p>
        <p><strong>Quantity:</strong> ${receipt.quantity || 1}</p>
        <p><strong>Unit Price:</strong> ${formatKsh(receipt.unitPrice || receipt.totalPrice)}</p>
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">
        <p style="font-size: 1.1rem;"><strong>Total: ${formatKsh(receipt.totalPrice)}</strong></p>
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">
        <p style="text-align: center; color: #666; font-size: 0.8rem;">Thank you for your business!</p>
    `;

    receiptModal.classList.add("active");
}

function closeReceiptModal() {
    receiptModal.classList.remove("active");
}

function printReceipt() {
    const receiptContent = document.getElementById("receiptContent").innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Receipt</title>');
    printWindow.document.write('<style>body{font-family:monospace;padding:20px;} p{margin:4px 0;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(receiptContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// ===== Utilities =====
function formatKsh(amount) {
    return "KSh " + (amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });
}

// ===== Role-Based Access Control =====
function updateNavByRole() {
    const isUserAdmin = isAdmin();
    
    const userNav = document.getElementById('userNavItems');
    const adminNav = document.getElementById('adminNavItems');
    if (userNav) userNav.style.display = isUserAdmin ? 'none' : 'flex';
    if (adminNav) adminNav.style.display = isUserAdmin ? 'flex' : 'none';
    
    document.getElementById('userInfoName').textContent = isUserAdmin ? 'Admin User' : 'Chemist User';
    
    const addDrugBtn = document.getElementById('addDrugNavBtn');
    if (addDrugBtn) {
        addDrugBtn.style.display = isUserAdmin ? 'flex' : 'none';
    }
    
    const inventoryAddBtn = document.getElementById('inventoryAddBtn');
    if (inventoryAddBtn) {
        inventoryAddBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
    }
    
    const servicesNavBtn = document.getElementById('servicesNavBtn');
    if (servicesNavBtn) {
        servicesNavBtn.style.display = isUserAdmin ? 'flex' : 'none';
    }
    
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
    }
}

// ===== Make functions global =====
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
window.showAddServiceModal = showAddServiceModal;
window.openEditService = openEditService;
window.closeServiceModal = closeServiceModal;
window.saveService = saveService;
window.deleteService = deleteService;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;

// ===== Mobile menu handler =====
function handleMobileMenu() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (window.innerWidth <= 768) {
        if (menuBtn) menuBtn.style.display = 'block';
    } else {
        if (menuBtn) menuBtn.style.display = 'none';
        if (sidebar) {
            sidebar.classList.remove('show-sidebar');
        }
    }
}

function toggleMobileMenu() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show-sidebar');
    }
}

window.addEventListener('resize', handleMobileMenu);
window.addEventListener('DOMContentLoaded', handleMobileMenu);

function populateAdminPanel() {
    const adminUsername = document.getElementById('adminUsername');
    const adminRole = document.getElementById('adminRole');
    if (adminUsername) adminUsername.value = localStorage.getItem('username') || 'Admin User';
    if (adminRole) adminRole.value = getRole();
}
