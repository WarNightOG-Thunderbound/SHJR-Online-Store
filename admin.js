import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmTmPgLYBiPXMTqyTAsw5vIrs-11h7-9A", // KEEP YOUR ACTUAL KEY
    authDomain: "shjr-online-store.firebaseapp.com",
    databaseURL: "https://shjr-online-store-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shjr-online-store",
    storageBucket: "shjr-online-store.appspot.com",
    messagingSenderId: "118385940927",
    appId: "1:118385940927:web:9c34612d688ef0be93a90a",
    measurementId: "G-BX30KRVHRY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Admin UI Elements
const authSection = document.getElementById('auth-section');
const adminDashboard = document.getElementById('admin-dashboard');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// Dashboard Summary Counts
const totalProductsCountEl = document.getElementById('total-products-count');
const pendingOrdersCountEl = document.getElementById('pending-orders-count');
const completedOrdersCountEl = document.getElementById('completed-orders-count');

// Product Form Elements
const productIdInput = document.getElementById('product-id');
const productTitleInput = document.getElementById('product-title');
const productBrandInput = document.getElementById('product-brand');
const productDescriptionInput = document.getElementById('product-description');
const productCategorySelect = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productStockInput = document.getElementById('product-stock');
const productFeaturedCheckbox = document.getElementById('product-featured');
const productVideoInput = document.getElementById('product-video');
const addEditProductBtn = document.getElementById('add-edit-product-btn');
const clearFormBtn = document.getElementById('clear-form-btn');
const productListContainer = document.getElementById('product-list-container');
const adminProductSearchInput = document.getElementById('admin-product-search');
const adminProductSearchBtn = document.getElementById('admin-product-search-btn');

// Image Input Elements
const productImageInputs = [
    document.getElementById('product-image-1'),
    document.getElementById('product-image-2'),
    document.getElementById('product-image-3'),
    document.getElementById('product-image-4'),
    document.getElementById('product-image-5'),
];
const productImagePreviews = [
    document.getElementById('product-image-preview-1'),
    document.getElementById('product-image-preview-2'),
    document.getElementById('product-image-preview-3'),
    document.getElementById('product-image-preview-4'),
    document.getElementById('product-image-preview-5'),
];
const productImagePlaceholders = [
    document.getElementById('product-image-placeholder-1'),
    document.getElementById('product-image-placeholder-2'),
    document.getElementById('product-image-placeholder-3'),
    document.getElementById('product-image-placeholder-4'),
    document.getElementById('product-image-placeholder-5'),
];

// Order Management Elements
const orderListContainer = document.getElementById('order-list-container');
const completedOrderListContainer = document.getElementById('completed-order-list-container');

// Tab Navigation Elements
const navTabs = document.querySelectorAll('.admin-nav-tab');
const tabContents = document.querySelectorAll('.admin-tab-content');

let currentAdminUID = null;
let allAdminProducts = {}; // To store all products for admin search

// --- Tab Navigation Logic ---
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});


// --- Image Preview Logic ---
productImageInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        const url = input.value.trim();
        if (url) {
            productImagePreviews[index].src = url;
            productImagePreviews[index].style.display = 'block';
            productImagePlaceholders[index].style.display = 'none';
            productImagePreviews[index].onerror = () => { // Fallback if image fails to load
                productImagePreviews[index].style.display = 'none';
                productImagePlaceholders[index].style.display = 'flex';
            };
        } else {
            productImagePreviews[index].style.display = 'none';
            productImagePlaceholders[index].style.display = 'flex';
            productImagePreviews[index].src = ''; // Clear src to prevent old image flashing
        }
    });
});

function resetImagePreviews() {
    productImagePreviews.forEach(preview => {
        preview.src = '';
        preview.style.display = 'none';
    });
    productImagePlaceholders.forEach(placeholder => {
        placeholder.style.display = 'flex';
    });
}

// --- Authentication Logic ---
adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Admin logged in:', userCredential.user.email);
    } catch (error) {
        alert('Login failed: ' + error.message);
        console.error('Login error:', error);
    }
});

adminLogoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('Admin logged out');
    } catch (error) {
        console.error('Logout error:', error);
    }
});

onAuthStateChanged(auth, (user) => {
    const adminEmail = "warnightog.thunderbound@gmail.com"; // Centralize admin email
    if (user && user.email === adminEmail) {
        currentAdminUID = user.uid;
        authSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProducts();
        loadPendingOrders();
        loadCompletedOrders();
        // Set default active tab (e.g., product management)
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        document.querySelector('.admin-nav-tab[data-tab="product-management-tab"]').classList.add('active');
        document.getElementById("product-management-tab").classList.add('active');

    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        adminEmailInput.value = adminEmail;
        adminPasswordInput.value = '';
        productListContainer.innerHTML = '<p class="no-items-message">Login to manage products.</p>';
        orderListContainer.innerHTML = '<p class="no-items-message">Login to manage orders.</p>';
        completedOrderListContainer.innerHTML = '<p class="no-items-message">Login to view completed orders.</p>';
        updateDashboardCounts(0,0,0); // Reset counts
    }
});

// --- Product Management Logic ---
function clearProductForm() {
    productIdInput.value = '';
    productTitleInput.value = '';
    productBrandInput.value = '';
    productDescriptionInput.value = '';
    productCategorySelect.value = 'Fabric'; // Default category
    productPriceInput.value = '';
    productStockInput.value = '1';
    productImageInputs.forEach(input => input.value = '');
    resetImagePreviews();
    productVideoInput.value = '';
    productFeaturedCheckbox.checked = false;
    addEditProductBtn.textContent = 'Add Product';
    addEditProductBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product';
}

clearFormBtn.addEventListener('click', clearProductForm);

addEditProductBtn.addEventListener('click', async () => {
    const id = productIdInput.value;
    const title = productTitleInput.value.trim();
    const brand = productBrandInput.value.trim();
    const description = productDescriptionInput.value.trim();
    const category = productCategorySelect.value;
    const price = parseFloat(productPriceInput.value);
    const stock = parseInt(productStockInput.value, 10);
    const featured = productFeaturedCheckbox.checked;
    const videoUrl = productVideoInput.value.trim();
    const images = productImageInputs.map(input => input.value.trim()).filter(url => url);

    if (!title || !description || !category || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || images.length === 0) {
        alert('Please fill in all required fields (Title, Description, Category, Price, Stock >= 0, at least one Image URL).');
        return;
    }

    const productData = {
        title,
        brand: brand || '', // Store empty string if not provided
        description,
        category,
        price,
        stock,
        images,
        videoUrl: videoUrl || '',
        featured,
        updatedAt: serverTimestamp() // Keep track of updates
    };

    try {
        if (id) { // Edit existing product
            productData.id = id; // Ensure ID is part of the data being set
            await set(ref(database, 'products/' + id), productData);
            alert('Product updated successfully!');
        } else { // Add new product
            const newProductRef = push(ref(database, 'products'));
            productData.id = newProductRef.key;
            productData.createdAt = serverTimestamp();
            await set(newProductRef, productData);
            alert('Product added successfully!');
        }
        clearProductForm();
    } catch (error) {
        alert('Error saving product: ' + error.message);
        console.error('Product save error:', error);
    }
});

function displayAdminProducts(productsToDisplay) {
    productListContainer.innerHTML = '';
    if (Object.keys(productsToDisplay).length === 0) {
        productListContainer.innerHTML = '<p class="no-items-message">No products match your search or none available.</p>';
        return;
    }
    const sortedProducts = Object.values(productsToDisplay).sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    sortedProducts.forEach(product => {
        const productItem = document.createElement('div');
        productItem.classList.add('admin-product-item');
        productItem.innerHTML = `
            <img src="${(product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/60x60.png?text=N/A'}" alt="${product.title}">
            <div class="admin-product-details">
                <h4>${product.title} (ID: ${product.id.substring(0,6)}...)</h4>
                <p><strong>Brand:</strong> ${product.brand || 'N/A'} | <strong>Category:</strong> ${product.category} | <strong>Price:</strong> PKR ${product.price.toLocaleString()}</p>
                <p class="product-stock-info"><strong>Stock:</strong> ${product.stock} | <strong>Featured:</strong> ${product.featured ? 'Yes' : 'No'}</p>
            </div>
            <div class="admin-actions">
                <button class="edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="delete-btn" data-id="${product.id}"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        `;
        productListContainer.appendChild(productItem);
    });

    productListContainer.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => editProduct(e.currentTarget.dataset.id));
    });
    productListContainer.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => deleteProduct(e.currentTarget.dataset.id));
    });
}


function loadProducts() {
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
        const products = snapshot.val();
        allAdminProducts = products || {}; // Store for searching
        displayAdminProducts(allAdminProducts); // Display all initially
        updateDashboardCounts(Object.keys(allAdminProducts).length, pendingOrdersCountEl.textContent, completedOrdersCountEl.textContent);
    }, (error) => {
        console.error("Error loading products:", error);
        productListContainer.innerHTML = '<p class="no-items-message">Error loading products.</p>';
    });
}

// Admin Product Search
adminProductSearchBtn.addEventListener('click', () => {
    const searchTerm = adminProductSearchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        displayAdminProducts(allAdminProducts);
        return;
    }
    const filteredProducts = Object.values(allAdminProducts).filter(product =>
        product.title.toLowerCase().includes(searchTerm) ||
        product.id.toLowerCase().includes(searchTerm) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm))
    );
    displayAdminProducts(filteredProducts);
});
adminProductSearchInput.addEventListener('keyup', (event) => { // Allow search on enter
    if (event.key === "Enter") {
        adminProductSearchBtn.click();
    }
});


function editProduct(id) {
    const product = allAdminProducts[id]; // Use cached products for faster edit form population
    if (product) {
        productIdInput.value = product.id;
        productTitleInput.value = product.title;
        productBrandInput.value = product.brand || '';
        productDescriptionInput.value = product.description;
        productCategorySelect.value = product.category;
        productPriceInput.value = product.price;
        productStockInput.value = product.stock;
        productFeaturedCheckbox.checked = product.featured || false;
        productVideoInput.value = product.videoUrl || '';

        // Populate image inputs and previews
        resetImagePreviews();
        if (product.images && product.images.length > 0) {
            product.images.forEach((url, index) => {
                if (index < productImageInputs.length) {
                    productImageInputs[index].value = url;
                    // Trigger input event to update preview
                    productImageInputs[index].dispatchEvent(new Event('input'));
                }
            });
        }
        addEditProductBtn.textContent = 'Update Product';
        addEditProductBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
        // Switch to product management tab and scroll to form
        document.querySelector('.admin-nav-tab[data-tab="product-management-tab"]').click();
        productTitleInput.focus(); // Focus on the title for quick editing
        productIdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });


    } else {
        alert('Product not found. It might have been deleted.');
        clearProductForm();
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
            await remove(ref(database, 'products/' + id));
            alert('Product deleted successfully!');
            // No need to call loadProducts() here, onValue will update automatically
        } catch (error) {
            alert('Error deleting product: ' + error.message);
            console.error('Product delete error:', error);
        }
    }
}

// --- Order Management Logic ---
function renderOrders(orders, container, isPendingList) {
    container.innerHTML = '';
    if (Object.keys(orders).length === 0) {
        const message = isPendingList ? "No pending orders." : "No completed orders yet.";
        container.innerHTML = `<p class="no-items-message">${message}</p>`;
        return;
    }

    const sortedOrders = Object.values(orders).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    sortedOrders.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.classList.add('order-item');
        const jazzCashTxnDisplay = (order.jazzCashTransactionId && order.jazzCashTransactionId !== 'N/A')
            ? `<p><strong>JazzCash Txn ID:</strong> ${order.jazzCashTransactionId}</p>` : '';

        let actionsHtml = '';
        if (isPendingList) {
            actionsHtml = `
                <div class="order-actions">
                    <button class="mark-completed" data-order-id="${order.id}"><i class="fas fa-check"></i> Mark Completed</button>
                    <button class="mark-cancelled" data-order-id="${order.id}"><i class="fas fa-times"></i> Cancel Order</button>
                </div>`;
        } else { // For completed orders, maybe a view details or delete history button in future
             actionsHtml = `<p><em>Order processed on: ${order.completedDate ? new Date(order.completedDate).toLocaleString() : 'N/A'}</em></p>`;
        }


        orderItem.innerHTML = `
            <h4>Order for: ${order.productTitle} (PKR ${order.productPrice.toLocaleString()})</h4>
            <p><strong>Order ID:</strong> ${order.id.substring(0,8)}...</p>
            <p><strong>Customer:</strong> ${order.customerName} | <strong>Phone:</strong> ${order.customerPhone}</p>
            <p><strong>Address:</strong> ${order.customerAddress}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            ${jazzCashTxnDisplay}
            <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="status ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></p>
            ${actionsHtml}
        `;
        container.appendChild(orderItem);
    });

    if (isPendingList) {
        container.querySelectorAll('.mark-completed').forEach(button => {
            button.addEventListener('click', (e) => completeOrder(e.currentTarget.dataset.orderId));
        });
        container.querySelectorAll('.mark-cancelled').forEach(button => {
            button.addEventListener('click', (e) => cancelOrder(e.currentTarget.dataset.orderId));
        });
    }
}

function loadPendingOrders() {
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        const orders = snapshot.val() || {};
        renderOrders(orders, orderListContainer, true);
        updateDashboardCounts(totalProductsCountEl.textContent, Object.keys(orders).length, completedOrdersCountEl.textContent);

    }, (error) => {
        console.error("Error loading pending orders:", error);
        orderListContainer.innerHTML = '<p class="no-items-message">Error loading pending orders.</p>';
    });
}

function loadCompletedOrders() {
    const completedOrdersRef = ref(database, 'completedOrders');
    onValue(completedOrdersRef, (snapshot) => {
        const orders = snapshot.val() || {};
        renderOrders(orders, completedOrderListContainer, false);
        updateDashboardCounts(totalProductsCountEl.textContent, pendingOrdersCountEl.textContent, Object.keys(orders).length);
    }, (error) => {
        console.error("Error loading completed orders:", error);
        completedOrderListContainer.innerHTML = '<p class="no-items-message">Error loading completed orders.</p>';
    });
}

async function completeOrder(orderId) {
    if (!confirm(`Are you sure you want to mark order ${orderId.substring(0,8)}... as completed?`)) return;

    const orderRef = ref(database, 'orders/' + orderId);
    onValue(orderRef, async (snapshot) => {
        const orderData = snapshot.val();
        if (orderData) {
            try {
                const completedOrderData = {
                    ...orderData,
                    status: 'Completed',
                    completedDate: serverTimestamp()
                };
                await set(ref(database, 'completedOrders/' + orderId), completedOrderData);
                await remove(orderRef); // Remove from pending orders
                alert(`Order ${orderId.substring(0,8)}... marked as completed and moved to history.`);
            } catch (error) {
                alert('Error completing order: ' + error.message);
                console.error('Order completion error:', error);
            }
        } else {
            alert('Order not found in pending list. It might have been processed already.');
        }
    }, { onlyOnce: true }); // Fetch only once to avoid issues if data changes mid-operation
}


async function cancelOrder(orderId) {
     if (!confirm(`Are you sure you want to cancel and delete order ${orderId.substring(0,8)}...? This action cannot be undone.`)) return;
    try {
        await remove(ref(database, 'orders/' + orderId));
        alert(`Order ${orderId.substring(0,8)}... has been cancelled and removed.`);
    } catch (error) {
        alert('Error cancelling order: ' + error.message);
        console.error('Order cancellation error:', error);
    }
}

// --- Dashboard Summary Updates ---
function updateDashboardCounts(products, pending, completed) {
    totalProductsCountEl.textContent = products;
    pendingOrdersCountEl.textContent = pending;
    completedOrdersCountEl.textContent = completed;
}

// Initialize the page by setting default tab (if not handled by auth state change)
document.addEventListener('DOMContentLoaded', () => {
    if (!auth.currentUser) { // If not logged in, ensure login form is visible
         authSection.style.display = 'block';
         adminDashboard.style.display = 'none';
    } else {
        // If somehow user is logged in but UI didn't update, trigger tab setup
        // This is mostly a fallback, onAuthStateChanged should handle it
        if(adminDashboard.style.display === 'block') {
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            document.querySelector('.admin-nav-tab[data-tab="product-management-tab"]').classList.add('active');
            document.getElementById("product-management-tab").classList.add('active');
        }
    }
});
