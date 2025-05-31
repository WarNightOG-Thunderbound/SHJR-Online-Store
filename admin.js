import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";


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
const storage = getStorage(app); // Initialize Firebase Storage

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
const productImageUploadInputs = [ // New: File inputs for upload
    document.getElementById('product-image-upload-1'),
    document.getElementById('product-image-upload-2'),
    document.getElementById('product-image-upload-3'),
    document.getElementById('product-image-upload-4'),
    document.getElementById('product-image-upload-5'),
];
const productImageURLInputs = [ // Existing: Text inputs for URL
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
const uploadImageButtons = document.querySelectorAll('.upload-image-btn'); // New: Upload buttons


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


// --- Image Preview Logic (updated for URL inputs) ---
productImageURLInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        const url = input.value.trim();
        const previewEl = productImagePreviews[index];
        const placeholderEl = productImagePlaceholders[index];
        if (url) {
            previewEl.src = url;
            previewEl.style.display = 'block';
            placeholderEl.style.display = 'none';
            previewEl.onerror = () => { // Fallback if image fails to load
                previewEl.style.display = 'none';
                placeholderEl.style.display = 'flex';
                previewEl.src = ''; // Clear src to prevent broken image icon on retry
            };
        } else {
            previewEl.style.display = 'none';
            placeholderEl.style.display = 'flex';
            previewEl.src = ''; // Clear src
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
    productImageURLInputs.forEach(input => input.value = ''); // Clear URL inputs
    productImageUploadInputs.forEach(input => input.value = ''); // Clear file inputs
}

// --- Image Upload Logic ---
uploadImageButtons.forEach((button, index) => {
    button.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent form submission
        const fileInput = productImageUploadInputs[index];
        const urlInput = productImageURLInputs[index];
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an image file to upload.');
            return;
        }

        const originalButtonHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const storagePath = `product_images/${Date.now()}_${file.name}`;
        const imageRef = storageRef(storage, storagePath);

        try {
            const snapshot = await uploadBytes(imageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            urlInput.value = downloadURL;
            urlInput.dispatchEvent(new Event('input')); // Trigger preview update
            alert('Image uploaded successfully!');
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image: ' + error.message);
        } finally {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    });
});


// --- Authentication Logic ---
adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    adminLoginBtn.disabled = true;
    adminLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // UI update will be handled by onAuthStateChanged
    } catch (error) {
        alert('Login failed: ' + error.message);
        console.error('Login error:', error);
    } finally {
        adminLoginBtn.disabled = false;
        adminLoginBtn.innerHTML = 'Login';
    }
});

adminLogoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // UI will be updated by onAuthStateChanged listener
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
});

onAuthStateChanged(auth, (user) => {
    const adminEmail = "warnightog.thunderbound@gmail.com";
    if (user && user.email === adminEmail) {
        currentAdminUID = user.uid;
        console.log("Admin UID for Firebase Rules:", currentAdminUID);
        authSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProducts();
        loadPendingOrders();
        loadCompletedOrders();
        const defaultTab = document.querySelector('.admin-nav-tab[data-tab="product-management-tab"]');
        if (defaultTab && !defaultTab.classList.contains('active')) { // Click only if not already active
             defaultTab.click();
        }
    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        adminEmailInput.value = adminEmail;
        adminPasswordInput.value = '';
        productListContainer.innerHTML = '<p class="no-items-message">Login to manage products.</p>';
        orderListContainer.innerHTML = '<p class="no-items-message">Login to manage orders.</p>';
        completedOrderListContainer.innerHTML = '<p class="no-items-message">Login to view completed orders.</p>';
        updateDashboardCounts(0,0,0);
    }
});

// --- Product Management Logic ---
function clearProductForm() {
    productIdInput.value = '';
    productTitleInput.value = '';
    productBrandInput.value = '';
    productDescriptionInput.value = '';
    productCategorySelect.value = 'Fabric';
    productPriceInput.value = '';
    productStockInput.value = '1';
    productImageURLInputs.forEach(input => input.value = ''); // Clear URL inputs
    productImageUploadInputs.forEach(input => input.value = ''); // Clear file inputs
    resetImagePreviews();
    productVideoInput.value = '';
    productFeaturedCheckbox.checked = false;
    addEditProductBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Product';
    productTitleInput.focus();
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
    const images = productImageURLInputs.map(input => input.value.trim()).filter(url => url); // Use URL inputs for saving

    if (!title || !description || !category || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || images.length === 0) {
        alert('Please fill in all required fields (Title, Description, Category, Price > 0, Stock >= 0, at least one Image URL).');
        return;
    }

    const productData = {
        title,
        brand: brand || 'N/A',
        description,
        category,
        price,
        stock,
        images,
        videoUrl: videoUrl || '',
        featured,
        updatedAt: serverTimestamp()
    };

    addEditProductBtn.disabled = true;
    const originalButtonHTML = addEditProductBtn.innerHTML;
    addEditProductBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        if (id) {
            productData.id = id;
            await set(ref(database, 'products/' + id), productData);
            alert('Product updated successfully!');
        } else {
            const newProductRef = push(ref(database, 'products'));
            productData.id = newProductRef.key;
            productData.createdAt = serverTimestamp();
            await set(newProductRef, productData);
            alert('Product added successfully!');
        }
        clearProductForm(); // Clear form after successful add/edit
    } catch (error) {
        alert('Error saving product: ' + error.message);
        console.error('Product save error:', error);
    } finally {
        addEditProductBtn.disabled = false;
        // Restore correct button text based on whether it was add or edit mode
        if (productIdInput.value) { // If ID field still has a value, it was an edit
             addEditProductBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
        } else { // Otherwise it was an add, and form was cleared
             addEditProductBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Product';
        }
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
        const displayId = product.id ? product.id.substring(product.id.length - 6) : 'N/A';
        productItem.innerHTML = `
            <img src="${(product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/65x65.png?text=N/A'}" alt="${product.title || 'Product'}">
            <div class="admin-product-details">
                <h4>${product.title || 'Untitled Product'} (ID: ...${displayId})</h4>
                <p><strong>Brand:</strong> ${product.brand || 'N/A'} | <strong>Category:</strong> ${product.category || 'N/A'} | <strong>Price:</strong> PKR ${typeof product.price === 'number' ? product.price.toLocaleString() : 'N/A'}</p>
                <p class="product-stock-info"><strong>Stock:</strong> ${typeof product.stock === 'number' ? product.stock : 'N/A'} | <strong>Featured:</strong> ${product.featured ? 'Yes' : 'No'}</p>
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
    const productsRefDb = ref(database, 'products');
    onValue(productsRefDb, (snapshot) => {
        const products = snapshot.val();
        allAdminProducts = products || {};
        displayAdminProducts(allAdminProducts);
        updateDashboardCounts(Object.keys(allAdminProducts).length, parseInt(pendingOrdersCountEl.textContent) || 0, parseInt(completedOrdersCountEl.textContent) || 0);
    }, (error) => {
        console.error("Error loading products:", error.code, error.message);
        productListContainer.innerHTML = `<p class="no-items-message">Error loading products. Firebase: ${error.message}. Check console and Firebase rules.</p>`;
    });
}

adminProductSearchBtn.addEventListener('click', () => {
    const searchTerm = adminProductSearchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        displayAdminProducts(allAdminProducts);
        return;
    }
    const filtered = {};
    for (const productId in allAdminProducts) {
        const product = allAdminProducts[productId];
        if ( (product.title && product.title.toLowerCase().includes(searchTerm)) ||
             (productId && productId.toLowerCase().includes(searchTerm)) ||
             (product.brand && product.brand.toLowerCase().includes(searchTerm))) {
            filtered[productId] = product;
        }
    }
    displayAdminProducts(filtered);
});
adminProductSearchInput.addEventListener('keyup', (event) => {
    if (event.key === "Enter") {
        adminProductSearchBtn.click();
    }
    if (adminProductSearchInput.value.trim() === '') {
        adminProductSearchBtn.click(); // Trigger search on empty input to refresh list
    }
});


function editProduct(id) {
    const product = allAdminProducts[id];
    if (product) {
        productIdInput.value = product.id;
        productTitleInput.value = product.title || '';
        productBrandInput.value = product.brand || '';
        productDescriptionInput.value = product.description || '';
        productCategorySelect.value = product.category || 'Fabric';
        productPriceInput.value = product.price || '';
        productStockInput.value = typeof product.stock === 'number' ? product.stock : '0';
        productFeaturedCheckbox.checked = product.featured || false;
        productVideoInput.value = product.videoUrl || '';

        resetImagePreviews(); // Clear file inputs as well
        if (product.images && product.images.length > 0) {
            product.images.forEach((url, index) => {
                if (index < productImageURLInputs.length) {
                    productImageURLInputs[index].value = url;
                    productImageURLInputs[index].dispatchEvent(new Event('input')); // Trigger preview update
                }
            });
        }
        addEditProductBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
        const productTab = document.querySelector('.admin-nav-tab[data-tab="product-management-tab"]');
        if (productTab) productTab.click();
        productTitleInput.focus();
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
        } catch (error) {
            alert('Error deleting product: ' + error.message);
            console.error('Product delete error:', error);
        }
    }
}

// --- Order Management Logic ---
function renderOrders(ordersData, container, isPendingList) {
    container.innerHTML = '';
    const ordersArray = Object.values(ordersData || {});
    if (ordersArray.length === 0) {
        const message = isPendingList ? "No pending orders." : "No completed orders yet.";
        container.innerHTML = `<p class="no-items-message">${message}</p>`;
        return;
    }

    const sortedOrders = ordersArray.sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0));

    sortedOrders.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.classList.add('order-item');
        
        const productPriceDisplay = (typeof order.productPrice === 'number') ? order.productPrice.toLocaleString() : 'N/A';
        const orderDateDisplay = order.orderDate ? new Date(order.orderDate).toLocaleString() : 'Date N/A';
        const orderIdShort = order.id ? order.id.substring(order.id.length - 8) : 'N/A';

        let actionsHtml = '';
        if (isPendingList) {
            actionsHtml = `
                <div class="order-actions">
                    <button class="mark-completed" data-order-id="${order.id}"><i class="fas fa-check-circle"></i> Mark Completed</button>
                    <button class="mark-cancelled" data-order-id="${order.id}"><i class="fas fa-times-circle"></i> Cancel Order</button>
                </div>`;
        } else {
            let processedDateString = 'Processing date N/A';
            if (order.completedDate) {
                processedDateString = new Date(order.completedDate).toLocaleString();
            } else if (order.orderDate) { // Fallback for completed orders that might miss completedDate (e.g. old data)
                processedDateString = `(Ordered: ${new Date(order.orderDate).toLocaleString()})`;
            }
             actionsHtml = `<p><em>Order processed on: ${processedDateString}</em></p>`;
        }

        orderItem.innerHTML = `
            <h4>Order for: ${order.productTitle || 'Product Name Missing'} (PKR ${productPriceDisplay})</h4>
            <p><strong>Order ID:</strong> ...${orderIdShort}</p>
            <p><strong>Customer:</strong> ${order.customerName || 'N/A'} | <strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
            <p><strong>Order Date:</strong> ${orderDateDisplay}</p>
            <p><strong>Status:</strong> <span class="status ${order.status ? order.status.toLowerCase().replace(/\s+/g, '-') : 'unknown'}">${order.status || 'Unknown'}</span></p>
            ${actionsHtml}
        `;
        container.appendChild(orderItem);
    });

    if (isPendingList) {
        container.querySelectorAll('.mark-completed').forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                completeOrder(btn.dataset.orderId).finally(() => {
                    btn.disabled = false;
                });
            });
        });
        container.querySelectorAll('.mark-cancelled').forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                cancelOrder(btn.dataset.orderId).finally(() => {
                    btn.disabled = false;
                });
            });
        });
    }
}

function loadPendingOrders() {
    const ordersRefDb = ref(database, 'orders');
    onValue(ordersRefDb, (snapshot) => {
        const orders = snapshot.val() || {};
        renderOrders(orders, orderListContainer, true);
        updateDashboardCounts(Object.keys(allAdminProducts).length, Object.keys(orders).length, parseInt(completedOrdersCountEl.textContent) || 0);
    }, (error) => {
        console.error("Error loading pending orders:", error.code, error.message);
        orderListContainer.innerHTML = `<p class="no-items-message">Error loading pending orders. Firebase: ${error.message}. Check console and Firebase rules.</p>`;
    });
}

function loadCompletedOrders() {
    const completedOrdersRefDb = ref(database, 'completedOrders');
    onValue(completedOrdersRefDb, (snapshot) => {
        const orders = snapshot.val() || {};
        renderOrders(orders, completedOrderListContainer, false);
        updateDashboardCounts(Object.keys(allAdminProducts).length, parseInt(pendingOrdersCountEl.textContent) || 0, Object.keys(orders).length);
    }, (error) => {
        console.error("Error loading completed orders:", error.code, error.message);
        completedOrderListContainer.innerHTML = `<p class="no-items-message">Error loading completed orders. Firebase: ${error.message}. Check console and Firebase rules.</p>`;
    });
}

async function completeOrder(orderId) {
    if (!orderId) {
        alert('Error: Order ID is missing.');
        return;
    }
    if (!confirm(`Are you sure you want to mark order ...${orderId.substring(orderId.length - 6)} as completed?`)) return;

    const orderToCompleteRef = ref(database, 'orders/' + orderId);
    try {
        const orderDataSnapshot = await get(orderToCompleteRef); // Use get for a single read

        if (orderDataSnapshot.exists()) {
            const orderData = orderDataSnapshot.val();
            const completedOrderData = {
                ...orderData,
                status: 'Completed',
                completedDate: serverTimestamp()
            };
            // Ensure all essential fields from orderData are carried over if not already spread
            if (!completedOrderData.id) completedOrderData.id = orderId;


            await set(ref(database, 'completedOrders/' + orderId), completedOrderData);
            await remove(orderToCompleteRef); // Remove from pending orders
            alert(`Order ...${orderId.substring(orderId.length - 6)} marked as completed and moved to history.`);
        } else {
            alert('Order not found in pending list. It might have been processed already or does not exist.');
        }
    } catch (error) {
        alert('Error completing order: ' + error.message);
        console.error('Order completion error:', error);
    }
}

async function cancelOrder(orderId) {
    if (!orderId) {
        alert('Error: Order ID is missing for cancellation.');
        return;
    }
    if (!confirm(`Are you sure you want to cancel and delete order ...${orderId.substring(orderId.length - 6)}? This action cannot be undone.`)) return;
    try {
        await remove(ref(database, 'orders/' + orderId));
        alert(`Order ...${orderId.substring(orderId.length - 6)} has been cancelled and removed.`);
    } catch (error) {
        alert('Error cancelling order: ' + error.message);
        console.error('Order cancellation error:', error);
    }
}

// --- Dashboard Summary Updates ---
function updateDashboardCounts(productsCount, pendingCount, completedCount) {
    totalProductsCountEl.textContent = productsCount || 0;
    pendingOrdersCountEl.textContent = pendingCount || 0;
    completedOrdersCountEl.textContent = completedCount || 0;
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.currentUser && adminDashboard.style.display === 'block') {
        // Already handled by onAuthStateChanged
    } else if (!auth.currentUser) {
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
});
