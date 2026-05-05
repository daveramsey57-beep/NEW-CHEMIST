// ===== State & Data =====
let allDrugs = [];
let allSales = [];
let allServices = [];
let allReceipts = [];
let allExpenses = [];
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

async function loadExpensesFromFirebase() {
    try {
        if (!window.db) throw new Error('Firebase not ready');
        const expensesRef = window.collection('expenses');
        const snapshot = await window.getDocs(expensesRef);
        allExpenses = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allExpenses.push({
                id: doc.id,
                description: data.description,
                category: data.category,
                amount: data.amount,
                date: data.date,
                timestamp: data.timestamp
            });
        });
    } catch (e) {
        console.log('No expenses found');
        allExpenses = [];
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

async function saveExpenseToFirebase(expense) {
    try {
        if (expense.id) {
            const expenseRef = window.doc('expenses', expense.id);
            await window.updateDoc(expenseRef, expense);
        } else {
            const expensesRef = window.collection('expenses');
            const docRef = await window.addDoc(expensesRef, expense);
            expense.id = docRef.id;
        }
    } catch (e) {
        console.error('Firebase error saving expense: ' + e.message);
    }
}

async function deleteExpenseFromFirebase(id) {
    try {
        const expenseRef = window.doc('expenses', id);
        await window.deleteDoc(expenseRef);
    } catch (e) {
        console.error('Firebase error deleting expense: ' + e.message);
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
    await loadExpensesFromFirebase();
    loadDrugs();
    loadSalesData();
    updateSalesTotals();
    updateInventoryStats();
    renderRecentSales();
    renderStock();
    renderServices();
    renderReceipts();
    renderExpenses();
    updateExpensesStats();
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
        option.textContent = drug.name + " (" + drug.category + ") - " + (drug.quantity ?? 0) + " left" + stockWarning;
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

    alert("Sold " + qty + " x " + drug.name + " for " + formatKsh(totalPrice));
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
        headerCell.innerHTML = '<i class="fa-solid fa-calendar"></i> ' + date;
        headerRow.appendChild(headerCell);
        salesBody.appendChild(headerRow);

        grouped[date].sort((a, b) => b.dateObj - a.dateObj);

        grouped[date].forEach(sale => {
            const row = document.createElement("tr");
            row.innerHTML = 
                '<td>' + (sale.drugName || "N/A") + '</td>' +
                '<td>' + (sale.category || "N/A") + '</td>' +
                '<td>' + (sale.quantity ?? 0) + '</td>' +
                '<td>' + formatKsh(sale.totalPrice ?? 0) + '</td>' +
                '<td>' + date + '</td>' +
                '<td><div class="action-btns">' +
                    '<button class="action-btn delete" onclick="deleteSale(\'' + sale.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
                '</div></td>';
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
        row.innerHTML = 
            '<td>' + sale.drugName + '</td>' +
            '<td>' + sale.category + '</td>' +
            '<td>' + sale.quantity + '</td>' +
            '<td>' + formatKsh(sale.totalPrice) + '</td>' +
            '<td>' + date + '</td>';
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

// Summary tabs
const summaryTabs = document.querySelectorAll('.summary-tabs .filter-btn');
const summaryContent = document.getElementById('summaryContent');

summaryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        summaryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderSummary(tab.dataset.period);
    });
});

function renderSummary(period) {
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }
    
    const filtered = allSales.filter(s => {
        const saleDate = new Date(s.timestamp);
        return saleDate >= startDate && saleDate <= endDate;
    });
    
    const totalAmount = filtered.reduce((sum, s) => sum + (s.totalPrice ?? 0), 0);
    const totalQuantity = filtered.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
    const transactionCount = filtered.length;
    
    summaryContent.innerHTML = '<div class="summary-grid">' +
        '<div class="summary-card"><h3>Total Sales</h3><p>' + formatKsh(totalAmount) + '</p></div>' +
        '<div class="summary-card"><h3>Items Sold</h3><p>' + totalQuantity + '</p></div>' +
        '<div class="summary-card"><h3>Transactions</h3><p>' + transactionCount + '</p></div>' +
    '</div>';
}

// Initialize summary on page load
if (summaryContent) {
    renderSummary('weekly');
}

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
        
        row.innerHTML = 
            '<td><strong>' + drug.name + '</strong></td>' +
            '<td>' + drug.category + '</td>' +
            '<td>' + formatKsh(drug.price) + '</td>' +
            '<td><span class="stock-status ' + stockClass + '">' + qty + '</span></td>' +
            '<td>' + (drug.expiry || "N/A") + '</td>' +
            '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="openEditDrug(\'' + drug.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="action-btn delete" onclick="deleteDrug(\'' + drug.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
            '</div></td>';
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
        
        row.innerHTML = 
            '<td><strong>' + drug.name + '</strong></td>' +
            '<td>' + drug.category + '</td>' +
            '<td>' + qty + '</td>' +
            '<td>' + formatKsh(drug.price) + '</td>' +
            '<td><span class="stock-status ' + stockClass + '">' + (qty === 0 ? 'Out of Stock' : qty <= MIN_STOCK ? 'Low Stock' : 'In Stock') + '</span></td>';
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
        
        row.innerHTML = 
            '<td><strong>' + drug.name + '</strong></td>' +
            '<td>' + drug.category + '</td>' +
            '<td>' + qty + '</td>' +
            '<td>' + formatKsh(drug.price) + '</td>' +
            '<td><span class="stock-status ' + stockClass + '">' + (qty === 0 ? 'Out of Stock' : qty <= MIN_STOCK ? 'Low Stock' : 'In Stock') + '</span></td>';
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
        option.textContent = drug.name + " (" + drug.category + ") - Current: " + (drug.quantity ?? 0);
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
                li.textContent = d.name + " - Only " + (d.quantity ?? 0) + " left";
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
            option.textContent = drug.name + " (" + drug.category + ") - Current: " + (drug.quantity ?? 0);
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
        
        alert("Successfully restocked " + drug.name + " with " + quantityToAdd + " units. New stock: " + drug.quantity);
        
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
        row.innerHTML = 
            '<td><strong>' + service.name + '</strong></td>' +
            '<td>' + formatKsh(service.price) + '</td>' +
            '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="openEditService(\'' + service.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="action-btn delete" onclick="deleteService(\'' + service.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
            '</div></td>';
        servicesBody.appendChild(row);
    });

    if (allServices.length === 0) {
        servicesBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:40px;">No services added yet</td></tr>';
    }
    
    // Also load services for the sell dropdown
    loadServicesForSell();
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

// Sell a Service (generates a receipt and adds to sales)
async function sellService() {
    const serviceSelect = document.getElementById("serviceSellSelect");
    if (!serviceSelect) {
        alert("Service select not found!");
        return;
    }
    const serviceId = serviceSelect.value;
    
    if (!serviceId) {
        alert("Please select a service to sell");
        return;
    }
    
    const service = allServices.find(s => s.id === serviceId);
    if (!service) {
        alert("Service not found!");
        return;
    }
    
    // Add to sales history
    const sale = {
        drugId: service.id,
        drugName: service.name,
        category: 'Service',
        quantity: 1,
        price: service.price,
        totalPrice: service.price,
        timestamp: new Date().toISOString()
    };
    
    await saveSaleToFirebase(sale);
    
    // Also generate a receipt
    const receipt = {
        itemName: service.name,
        type: 'Service',
        quantity: 1,
        unitPrice: service.price,
        totalPrice: service.price,
        timestamp: new Date().toISOString()
    };
    
    await saveReceiptToFirebase(receipt);
    alert("Service \"" + service.name + "\" sold for " + formatKsh(service.price));
    await loadAll();
}

// Load services into the sell dropdown
function loadServicesForSell() {
    const serviceSelect = document.getElementById("serviceSellSelect");
    const servicePriceInput = document.getElementById("serviceSellPrice");
    
    if (!serviceSelect) return;
    
    serviceSelect.innerHTML = '<option value="">Select a service...</option>';
    
    allServices.forEach(service => {
        const option = document.createElement("option");
        option.value = service.id;
        option.textContent = service.name + " - " + formatKsh(service.price);
        serviceSelect.appendChild(option);
    });
    
    // Update price when service is selected
    serviceSelect.addEventListener("change", () => {
        const selected = allServices.find(s => s.id === serviceSelect.value);
        if (selected && servicePriceInput) {
            servicePriceInput.value = selected.price;
        } else if (servicePriceInput) {
            servicePriceInput.value = '';
        }
    });
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
        row.innerHTML = 
            '<td><strong>' + receipt.id + '</strong></td>' +
            '<td>' + receipt.itemName + '</td>' +
            '<td>' + formatKsh(receipt.totalPrice) + '</td>' +
            '<td>' + date + '</td>' +
            '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="viewReceipt(\'' + receipt.id + '\')"><i class="fa-solid fa-eye"></i></button>' +
            '</div></td>';
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

    receiptContent.innerHTML = 
        '<div style="text-align: center; margin-bottom: 16px;">' +
            '<h3 style="margin: 0;">New Chemist</h3>' +
            '<p style="color: #666; font-size: 0.85rem;">Your Health, Our Priority</p>' +
        '</div>' +
        '<hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">' +
        '<p><strong>Receipt ID:</strong> ' + receipt.id + '</p>' +
        '<p><strong>Date:</strong> ' + date + '</p>' +
        '<hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">' +
        '<p><strong>Item:</strong> ' + receipt.itemName + '</p>' +
        '<p><strong>Type:</strong> ' + (receipt.type || 'Sale') + '</p>' +
        '<p><strong>Quantity:</strong> ' + (receipt.quantity || 1) + '</p>' +
        '<p><strong>Unit Price:</strong> ' + formatKsh(receipt.unitPrice || receipt.totalPrice) + '</p>' +
        '<hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">' +
        '<p style="font-size: 1.1rem;"><strong>Total: ' + formatKsh(receipt.totalPrice) + '</strong></p>' +
        '<hr style="border: none; border-top: 1px dashed #ccc; margin: 12px 0;">' +
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">Thank you for your business!</p>';

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

// ===== Expenses =====
function renderExpenses(filteredExpenses = null) {
    const expensesBody = document.getElementById("expensesBody");
    if (!expensesBody) return;

    expensesBody.innerHTML = "";
    const expensesToShow = filteredExpenses || allExpenses;
    const sortedExpenses = [...expensesToShow].sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

    sortedExpenses.forEach(expense => {
        const row = document.createElement("tr");
        const date = expense.date ? new Date(expense.date).toLocaleDateString() : new Date(expense.timestamp).toLocaleDateString();
        row.innerHTML =
            '<td>' + date + '</td>' +
            '<td>' + expense.description + '</td>' +
            '<td><span class="status-badge status-soon">' + expense.category + '</span></td>' +
            '<td>' + formatKsh(expense.amount) + '</td>' +
            '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="editExpense(\'' + expense.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="action-btn delete" onclick="deleteExpense(\'' + expense.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
            '</div></td>';
        expensesBody.appendChild(row);
    });

    if (sortedExpenses.length === 0) {
        expensesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No expenses recorded yet</td></tr>';
    }
}

function updateExpensesStats(filteredExpenses = null) {
    const expensesToCount = filteredExpenses || allExpenses;
    const total = expensesToCount.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const totalExpensesEl = document.getElementById("totalExpenses");
    const filteredExpensesEl = document.getElementById("filteredExpenses");
    const expensesCountEl = document.getElementById("expensesCount");

    if (totalExpensesEl) {
        const allTotal = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        totalExpensesEl.textContent = formatKsh(allTotal);
    }
    if (filteredExpensesEl) {
        filteredExpensesEl.textContent = formatKsh(total);
    }
    if (expensesCountEl) {
        expensesCountEl.textContent = expensesToCount.length;
    }
}

function showAddExpenseModal() {
    const expenseModal = document.getElementById("expenseModal");
    const expenseForm = document.getElementById("expenseForm");
    const expenseModalTitle = document.getElementById("expenseModalTitle");
    const editExpenseId = document.getElementById("editExpenseId");

    if (expenseForm) expenseForm.reset();
    if (editExpenseId) editExpenseId.value = '';
    if (expenseModalTitle) expenseModalTitle.textContent = 'Add New Expense';

    const expenseDate = document.getElementById("expenseDate");
    if (expenseDate) expenseDate.value = new Date().toISOString().split('T')[0];

    if (expenseModal) expenseModal.classList.add("active");
}

function editExpense(id) {
    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;

    const expenseModal = document.getElementById("expenseModal");
    const expenseModalTitle = document.getElementById("expenseModalTitle");
    const editExpenseId = document.getElementById("editExpenseId");
    const expenseDescription = document.getElementById("expenseDescription");
    const expenseCategory = document.getElementById("expenseCategory");
    const expenseAmount = document.getElementById("expenseAmount");
    const expenseDate = document.getElementById("expenseDate");

    if (expenseModalTitle) expenseModalTitle.textContent = 'Edit Expense';
    if (editExpenseId) editExpenseId.value = id;
    if (expenseDescription) expenseDescription.value = expense.description;
    if (expenseCategory) expenseCategory.value = expense.category;
    if (expenseAmount) expenseAmount.value = expense.amount;
    if (expenseDate) expenseDate.value = expense.date || new Date().toISOString().split('T')[0];

    if (expenseModal) expenseModal.classList.add("active");
}

async function saveExpense(e) {
    e.preventDefault();

    const editExpenseId = document.getElementById("editExpenseId");
    const expenseDescription = document.getElementById("expenseDescription");
    const expenseCategory = document.getElementById("expenseCategory");
    const expenseAmount = document.getElementById("expenseAmount");
    const expenseDate = document.getElementById("expenseDate");

    const expense = {
        description: expenseDescription?.value || '',
        category: expenseCategory?.value || 'Other',
        amount: parseFloat(expenseAmount?.value) || 0,
        date: expenseDate?.value || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };

    if (editExpenseId?.value) {
        expense.id = editExpenseId.value;
    }

    await saveExpenseToFirebase(expense);

    await loadExpensesFromFirebase();
    renderExpenses();
    updateExpensesStats();

    closeExpenseModal();
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    await deleteExpenseFromFirebase(id);
    await loadExpensesFromFirebase();
    renderExpenses();
    updateExpensesStats();
}

function closeExpenseModal() {
    const expenseModal = document.getElementById("expenseModal");
    if (expenseModal) expenseModal.classList.remove("active");
}

// Filter expenses by date
function filterExpenses() {
    const startDateInput = document.getElementById("expensesStartDate");
    const endDateInput = document.getElementById("expensesEndDate");

    const startDate = startDateInput?.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput?.value ? new Date(endDateInput.value) : null;

    if (!startDate && !endDate) {
        renderExpenses();
        updateExpensesStats();
        return;
    }

    const filtered = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date || expense.timestamp);
        if (startDate && expenseDate < startDate) return false;
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (expenseDate > endOfDay) return false;
        }
        return true;
    });

    renderExpenses(filtered);
    updateExpensesStats(filtered);
}

function clearExpensesFilter() {
    const startDateInput = document.getElementById("expensesStartDate");
    const endDateInput = document.getElementById("expensesEndDate");

    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    renderExpenses();
    updateExpensesStats();
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

    const expensesAddBtn = document.getElementById('expensesAddBtn');
    if (expensesAddBtn) {
        expensesAddBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
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
window.sellService = sellService;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;
window.showAddExpenseModal = showAddExpenseModal;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.closeExpenseModal = closeExpenseModal;
window.saveExpense = saveExpense;
window.filterExpenses = filterExpenses;
window.clearExpensesFilter = clearExpensesFilter;

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

// ===== Futuristic Effects =====

// Animated counter for stat values
function animateCounter(element, target, prefix = '', duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    const isFloat = target % 1 !== 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        if (isFloat) {
            element.textContent = prefix + current.toFixed(2);
        } else {
            element.textContent = prefix + Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Override update stats to use animated counters
const originalUpdateStats = window.updateStats || function() {};
window.updateStats = function() {
    originalUpdateStats.apply(this, arguments);

    setTimeout(() => {
        const totalSales = parseFloat(document.getElementById('totalSales')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        const dailyTotal = parseFloat(document.getElementById('dailyTotal')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        const monthlyTotal = parseFloat(document.getElementById('monthlyTotal')?.textContent?.replace(/[^0-9.]/g, '') || 0);
        const yearlyTotal = parseFloat(document.getElementById('yearlyTotal')?.textContent?.replace(/[^0-9.]/g, '') || 0);

        if (document.getElementById('totalSales')) {
            animateCounter(document.getElementById('totalSales'), totalSales, 'KSh ');
        }
        if (document.getElementById('dailyTotal')) {
            animateCounter(document.getElementById('dailyTotal'), dailyTotal, 'KSh ');
        }
        if (document.getElementById('monthlyTotal')) {
            animateCounter(document.getElementById('monthlyTotal'), monthlyTotal, 'KSh ');
        }
        if (document.getElementById('yearlyTotal')) {
            animateCounter(document.getElementById('yearlyTotal'), yearlyTotal, 'KSh ');
        }
    }, 100);
};

// Particle background effect
function createParticleCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particleCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;opacity:0.3;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(2, 132, 199, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(2, 132, 199, ${0.1 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Glitch effect on logo
function addGlitchEffect() {
    const logo = document.querySelector('.logo i');
    if (!logo) return;

    setInterval(() => {
        if (Math.random() > 0.7) {
            logo.style.transform = `translate(${(Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 4}px)`;
            logo.style.color = Math.random() > 0.5 ? '#0284c7' : '#10b981';
            setTimeout(() => {
                logo.style.transform = '';
                logo.style.color = '';
            }, 100);
        }
    }, 3000);
}

// Hover sound effect (subtle)
function addHoverSounds() {
    const buttons = document.querySelectorAll('.btn-primary, .nav-item, .stat-card');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        });
    });
}

// Initialize futuristic effects
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        createParticleCanvas();
        addGlitchEffect();
    }, 500);
});

// Data stream effect for table rows
function addDataStreamEffect() {
    const tables = document.querySelectorAll('.data-table tbody');
    tables.forEach(tbody => {
        tbody.addEventListener('click', (e) => {
            if (e.target.closest('tr')) {
                const row = e.target.closest('tr');
                row.style.background = 'linear-gradient(90deg, rgba(2,132,199,0.2), rgba(16,185,129,0.2))';
                setTimeout(() => {
                    row.style.background = '';
                }, 500);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', addDataStreamEffect);

// ===== Dark Mode Toggle =====
function toggleDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Load dark mode preference on page load
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';

    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
});
