import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js"; // New import for Firebase Storage

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmTmPgLYBiPXMTqyTAsw5vIrs-11h7-9A", // KEEP YOUR ACTUAL KEY
    authDomain: "shjr-online-store.firebaseapp.com",
    databaseURL: "https://shjr-online-store-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shjr-online-store",
    storageBucket: "shjr-online-store.firebasestorage.app",
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

// Image Input Elements (updated for file inputs)
const productImageInputs = [
    document.getElementById('product-image-file-1'),
    document.getElementById('product-image-file-2'),
    document.getElementById('product-image-file-3'),
    document.getElementById('product-image-file-4'),
    document.getElementById('product-image-file-5'),
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
const productImageRemoveBtns = [
    document.getElementById('product-image-remove-1'),
    document.getElementById('product-image-remove-2'),
    document.getElementById('product-image-remove-3'),
    document.getElementById('product-image-remove-4'),
    document.getElementById('product-image-remove-5'),
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

// --- Image Preview Logic (for file inputs) ---
productImageInputs.forEach((input, index) => {
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const previewEl = productImagePreviews[index];
        const placeholderEl = productImagePlaceholders[index];
        const removeBtn = productImageRemoveBtns[index];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewEl.src = e.target.result;
                previewEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                removeBtn.style.display = 'inline-block'; // Show remove button
            };
            reader.readAsDataURL(file);
        } else {
            previewEl.style.display = 'none';
            placeholderEl.style.display = 'flex';
            removeBtn.style.display = 'none'; // Hide remove button
            previewEl.src = ''; // Clear src
        }
    });
});

// Remove Image Logic
productImageRemoveBtns.forEach((button, index) => {
    button.addEventListener('click', () => {
        const fileInput = productImageInputs[index];
        const previewEl = productImagePreviews[index];
        const placeholderEl = productImagePlaceholders[index];
        const removeBtn = productImageRemoveBtns[index];

        fileInput.value = ''; // Clear the file input
        previewEl.src = ''; // Clear the preview image
        previewEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
        removeBtn.style.display = 'none'; // Hide remove button
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
    productImageInputs.forEach(input => {
        input.value = ''; // Clear file input
    });
    productImageRemoveBtns.forEach(btn => {
        btn.style.display = 'none'; // Hide remove buttons
    });
}

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
    const adminEmail = "warnightog.thunderbound@gmail.com"; // Set your admin email here
    if (user && user.email === adminEmail) {
        currentAdminUID = user.uid;
        authSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        // Manually click the dashboard tab to ensure it's active on login
        document.querySelector('.admin-nav-tab[data-tab="dashboard-tab"]').click();
        listenForProducts(); // Start listening for products when admin logs in
        listenForOrders(); // Start listening for orders
    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        // Clear any displayed products/orders when logged out
        productListContainer.innerHTML = '<p class="no-items-message">No products available.</p>';
        orderListContainer.innerHTML = '<p class="no-items-message">No pending orders.</p>';
        completedOrderListContainer.innerHTML = '<p class="no-items-message">No completed orders yet.</p>';
        updateDashboardCounts(0, 0, 0); // Reset dashboard counts
    }
});

// --- Product Management Logic ---
clearFormBtn.addEventListener('click', clearProductForm);

function clearProductForm() {
    productIdInput.value = '';
    productTitleInput.value = '';
    productBrandInput.value = '';
    productDescriptionInput.value = '';
    productCategorySelect.value = 'Fabric'; // Default category
    productPriceInput.value = '';
    productStockInput.value = '';
    productFeaturedCheckbox.checked = false;
    productVideoInput.value = '';
    resetImagePreviews(); // Clear all image previews and file inputs
    addEditProductBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Product';
    productTitleInput.focus();
}

// Helper function to upload an image and return its URL
async function uploadImageAndGetURL(file, productId) {
    if (!file) return null;
    const storageRefPath = `product_images/${productId}/${Date.now()}_${file.name}`; // Unique filename
    const imageRef = storageRef(storage, storageRefPath);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

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

    // Collect existing image URLs (if editing) and new files to upload
    const existingImageUrls = [];
    const newFilesToUpload = [];

    productImagePreviews.forEach((previewEl, index) => {
        // If an existing image URL is displayed AND it's not a local FileReader URL (which starts with 'data:'),
        // add it to existing URLs.
        if (previewEl.style.display === 'block' && previewEl.src && previewEl.src.startsWith('http')) {
            existingImageUrls.push(previewEl.src);
        }
    });

    productImageInputs.forEach((input, index) => {
        if (input.files && input.files[0]) {
            newFilesToUpload.push(input.files[0]);
        }
    });


    // Basic validation
    if (!title || !description || !category || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || (existingImageUrls.length === 0 && newFilesToUpload.length === 0)) {
        alert('Please fill in all required fields (Title, Description, Category, Price > 0, Stock >= 0, at least one image).');
        return;
    }

    addEditProductBtn.disabled = true;
    const originalButtonHTML = addEditProductBtn.innerHTML; // Store original button content
    addEditProductBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let currentProductId = id;
    if (!currentProductId) {
        // Generate a temporary ID for new product to use in storage path, if not editing
        const tempRef = push(ref(database, 'products'));
        currentProductId = tempRef.key;
    }

    try {
        // Upload new files to Firebase Storage
        const uploadedImageUrls = await Promise.all(
            newFilesToUpload.map((file) => uploadImageAndGetURL(file, currentProductId))
        );

        // Filter out nulls from failed uploads and combine with existing URLs
        const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls.filter(url => url !== null)];

        if (finalImageUrls.length === 0) {
             alert('No images were uploaded or existing images found. Please provide at least one image.');
             addEditProductBtn.disabled = false;
             addEditProductBtn.innerHTML = originalButtonHTML; // Restore button state
             return;
        }

        const productData = {
            title,
            brand: brand || 'N/A',
            description,
            category,
            price,
            stock,
            images: finalImageUrls, // Use the collected URLs
            videoUrl: videoUrl || '',
            featured,
            updatedAt: serverTimestamp()
        };

        if (id) {
            // If editing, use the existing ID
            productData.id = id;
            await set(ref(database, 'products/' + id), productData);
            alert('Product updated successfully!');
        } else {
            // If adding, use the generated temporary ID and set createdAt
            productData.id = currentProductId;
            productData.createdAt = serverTimestamp();
            await set(ref(database, 'products/' + currentProductId), productData);
            alert('Product added successfully!');
        }
        clearProductForm(); // Clear form after successful add/edit
    } catch (error) {
        alert('Error saving product: ' + error.message);
        console.error('Product save error:', error);
    } finally {
        addEditProductBtn.disabled = false;
        addEditProductBtn.innerHTML = originalButtonHTML; // Always restore to original content
    }
});


function displayAdminProducts(products) {
    productListContainer.innerHTML = '';
    if (Object.keys(products).length === 0) {
        productListContainer.innerHTML = '<p class="no-items-message">No products available.</p>';
        return;
    }

    const productListHtml = Object.values(products).map(product => {
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/65x65?text=No+Image';
        return `
            <div class="admin-product-item">
                <img src="${imageUrl}" alt="${product.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/65x65?text=Error';">
                <div class="admin-product-details">
                    <h4>${product.title} (ID: ${product.id.substring(0, 6)}...)</h4>
                    <p>${product.brand} - ${product.category}</p>
                    <p>Price: PKR ${product.price.toLocaleString()}</p>
                    <p class="product-stock-info">Stock: ${product.stock}</p>
                </div>
                <div class="admin-product-actions">
                    <button class="admin-button secondary edit-product-btn" data-id="${product.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="admin-button danger delete-product-btn" data-id="${product.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    }).join('');
    productListContainer.innerHTML = productListHtml;

    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', (e) => editProduct(e.target.dataset.id));
    });
    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
    });
}

function listenForProducts() {
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
        allAdminProducts = snapshot.val() || {};
        displayAdminProducts(allAdminProducts);
        updateDashboardCounts(Object.keys(allAdminProducts).length, pendingOrdersCountEl.textContent, completedOrdersCountEl.textContent);
    }, (error) => {
        console.error("Error listening for products:", error);
        productListContainer.innerHTML = `<p class="no-items-message error-message">Error loading products. Firebase: ${error.message}. Check console and Firebase rules.</p>`;
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
        if (
            (product.title && product.title.toLowerCase().includes(searchTerm)) ||
            (productId && productId.toLowerCase().includes(searchTerm)) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm))
        ) {
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
        displayAdminProducts(allAdminProducts);
    }
});


function editProduct(id) {
    const product = allAdminProducts[id];
    if (product) {
        productIdInput.value = product.id;
        productTitleInput.value = product.title || '';
        productBrandInput.value = product.brand || '';
        productDescriptionInput.value = product.description || '';
        productCategorySelect.value = product.category || 'Fabric'; // Set default if category is missing
        productPriceInput.value = product.price || '';
        productStockInput.value = typeof product.stock === 'number' ? product.stock : '0';
        productFeaturedCheckbox.checked = product.featured || false;
        productVideoInput.value = product.videoUrl || '';

        resetImagePreviews(); // Clear all current previews and file inputs first

        if (product.images && product.images.length > 0) {
            product.images.forEach((url, index) => {
                if (index < productImagePreviews.length) {
                    const previewEl = productImagePreviews[index];
                    const placeholderEl = productImagePlaceholders[index];
                    const removeBtn = productImageRemoveBtns[index];

                    previewEl.src = url;
                    previewEl.style.display = 'block';
                    placeholderEl.style.display = 'none';
                    removeBtn.style.display = 'inline-block'; // Show remove button for existing image

                    previewEl.onerror = () => { // Fallback if existing image URL fails to load
                        previewEl.style.display = 'none';
                        placeholderEl.style.display = 'flex';
                        removeBtn.style.display = 'none'; // Hide remove button if image is broken
                        previewEl.src = ''; // Clear src
                    };
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
    if (!confirm(`Are you sure you want to delete product ${id.substring(0, 6)}...? This action cannot be undone.`)) {
        return;
    }
    try {
        // TODO: Optionally delete images from Firebase Storage here as well
        // This requires listing items in a folder, which can be complex if not using specific file paths.
        // For now, only deleting database entry.

        await remove(ref(database, 'products/' + id));
        alert('Product deleted successfully!');
    } catch (error) {
        alert('Error deleting product: ' + error.message);
        console.error('Product delete error:', error);
    }
}


// --- Order Management Logic ---
function listenForOrders() {
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        const allOrders = snapshot.val() || {};
        const pendingOrders = {};
        const completedOrders = {};

        for (const orderId in allOrders) {
            const order = { id: orderId, ...allOrders[orderId] };
            if (order.status === 'completed' || order.status === 'cancelled') {
                completedOrders[orderId] = order;
            } else {
                pendingOrders[orderId] = order;
            }
        }

        displayOrders(pendingOrders, orderListContainer, false);
        displayOrders(completedOrders, completedOrderListContainer, true);

        updateDashboardCounts(totalProductsCountEl.textContent, Object.keys(pendingOrders).length, Object.keys(completedOrders).length);

    }, (error) => {
        console.error("Error listening for orders:", error);
        orderListContainer.innerHTML = `<p class="no-items-message error-message">Error loading orders. Firebase: ${error.message}.</p>`;
        completedOrderListContainer.innerHTML = `<p class="no-items-message error-message">Error loading completed orders. Firebase: ${error.message}.</p>`;
    });
}

function displayOrders(orders, containerEl, isCompletedTab) {
    containerEl.innerHTML = '';
    if (Object.keys(orders).length === 0) {
        containerEl.innerHTML = `<p class="no-items-message">No ${isCompletedTab ? 'completed' : 'pending'} orders.</p>`;
        return;
    }

    const orderListHtml = Object.values(orders).sort((a, b) => {
        // Sort by timestamp, newest first
        const dateA = new Date(a.orderDate || 0);
        const dateB = new Date(b.orderDate || 0);
        return dateB - dateA;
    }).map(order => {
        const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A';
        const productTitles = order.items ? Object.values(order.items).map(item => `${item.title} (x${item.quantity})`).join(', ') : 'Product Name Missing';
        const orderStatusClass = order.status || 'pending'; // Default to pending if status is missing
        let actionsHtml = '';

        if (!isCompletedTab) {
            actionsHtml = `
                <div class="order-actions">
                    <button class="admin-button success mark-completed" data-order-id="${order.id}"><i class="fas fa-check-circle"></i> Mark Completed</button>
                    <button class="admin-button danger mark-cancelled" data-order-id="${order.id}"><i class="fas fa-times-circle"></i> Cancel Order</button>
                </div>
            `;
        } else {
            let processedDateString = 'Processing date N/A';
            if (order.completedDate) {
                processedDateString = new Date(order.completedDate).toLocaleString();
            } else if (order.orderDate) { // Fallback for completed orders that might miss completedDate (e.g. old data)
                processedDateString = `(Ordered: ${new Date(order.orderDate).toLocaleString()})`;
            }
            actionsHtml = `<p><em>Order processed on: ${processedDateString}</em></p>`;
        }

        return `
            <div class="order-item">
                <h4>Order ID: ${order.id.substring(0, 6)}... for ${order.customerName || 'N/A'}</h4>
                <p><strong>Products:</strong> ${productTitles}</p>
                <p><strong>Total Amount:</strong> PKR ${order.totalAmount ? order.totalAmount.toLocaleString() : '0.00'}</p>
                <p><strong>Status:</strong> <span class="status ${orderStatusClass}">${orderStatusClass}</span></p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p>
                <p><strong>Contact:</strong> ${order.customerContact || 'N/A'}</p>
                ${actionsHtml}
            </div>
        `;
    }).join('');
    containerEl.innerHTML = orderListHtml;

    if (!isCompletedTab) {
        document.querySelectorAll('.mark-completed').forEach(button => {
            button.addEventListener('click', (e) => completeOrder(e.target.dataset.orderId));
        });
        document.querySelectorAll('.mark-cancelled').forEach(button => {
            button.addEventListener('click', (e) => cancelOrder(e.target.dataset.orderId));
        });
    }
}

async function completeOrder(orderId) {
    if (!orderId) {
        alert('Error: Order ID is missing for completion.');
        return;
    }
    if (!confirm(`Are you sure you want to mark order ...${orderId.substring(orderId.length - 6)} as completed?`)) return;

    try {
        const orderRef = ref(database, 'orders/' + orderId);
        const snapshot = await get(orderRef);
        const orderData = snapshot.val();

        if (orderData) {
            // Update status and add completion timestamp
            await update(orderRef, {
                status: 'completed',
                completedDate: serverTimestamp() // Add completion timestamp
            });
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
// --- Cart Order Management Elements ---
const cartOrderListContainer = document.getElementById('cart-order-list-container');

// --- Listen for Cart Orders ---
onValue(ref(database, 'cartOrders'), (snapshot) => {
    const cartOrders = snapshot.val();
    cartOrderListContainer.innerHTML = ''; // Clear previous orders
    if (!cartOrders) {
        cartOrderListContainer.innerHTML = '<p class="no-items-message">No pending cart orders.</p>';
        return;
    }

    Object.keys(cartOrders).forEach(orderId => {
        const order = cartOrders[orderId];
        const orderCard = document.createElement('div');
        orderCard.classList.add('order-card'); // You can reuse or create a new style for order-card
        orderCard.innerHTML = `
            <h4>Cart Order ID: ${orderId.substring(0, 8)}...</h4>
            <p><strong>Status:</strong> <span class="status-${order.status}">${order.status.toUpperCase()}</span></p>
            <p><strong>Total Amount:</strong> PKR ${order.totalAmount ? order.totalAmount.toLocaleString() : 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
            <div class="order-items">
                <h5>Items:</h5>
                <ul>
                    ${Object.values(order.items).map(item => `
                        <li>${item.title} (x${item.quantity}) - PKR ${item.price ? (item.price * item.quantity).toLocaleString() : 'N/A'}</li>
                    `).join('')}
                </ul>
            </div>
            <div class="order-actions">
                <button class="admin-button success small" onclick="completeCartOrder('${orderId}')"><i class="fas fa-check"></i> Complete</button>
                <button class="admin-button danger small" onclick="cancelCartOrder('${orderId}')"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;
        cartOrderListContainer.appendChild(orderCard);
    });
});

// --- Cart Order Action Functions ---
async function completeCartOrder(orderId) {
    if (!confirm(`Are you sure you want to mark cart order ${orderId.substring(0, 8)}... as completed?`)) return;
    try {
        const cartOrderRef = ref(database, 'cartOrders/' + orderId);
        const completedOrderRef = ref(database, 'completedCartOrders/' + orderId);

        const snapshot = await get(cartOrderRef);
        const orderData = snapshot.val();

        if (orderData) {
            orderData.status = 'completed';
            orderData.completionDate = serverTimestamp(); // Add a completion timestamp
            await set(completedOrderRef, orderData); // Move to completed orders
            await remove(cartOrderRef); // Remove from pending cart orders
            alert(`Cart Order ${orderId.substring(0, 8)}... marked as completed.`);
        } else {
            alert('Cart order not found or already processed.');
        }
    } catch (error) {
        alert('Error completing cart order: ' + error.message);
        console.error('Cart order completion error:', error);
    }
}

async function cancelCartOrder(orderId) {
    if (!confirm(`Are you sure you want to cancel and delete cart order ${orderId.substring(0, 8)}...? This action cannot be undone.`)) return;
    try {
        await remove(ref(database, 'cartOrders/' + orderId));
        alert(`Cart Order ${orderId.substring(0, 8)}... has been cancelled and removed.`);
    } catch (error) {
        alert('Error cancelling cart order: ' + error.message);
        console.error('Cart order cancellation error:', error);
    }
}
// --- Product Review Management Elements ---
const reviewsListContainer = document.getElementById('reviews-list-container');

// --- Listen for all Product Reviews ---
onValue(ref(database, 'productReviews'), (snapshot) => {
    const allReviews = snapshot.val();
    reviewsListContainer.innerHTML = '';
    if (!allReviews) {
        reviewsListContainer.innerHTML = '<p class="no-items-message">No product reviews available.</p>';
        return;
    }

    Object.keys(allReviews).forEach(productId => {
        const productReviews = allReviews[productId];
        const productTitle = allAdminProducts[productId] ? allAdminProducts[productId].title : `Product ID: ${productId.substring(0, 8)}...`;

        const productReviewsSection = document.createElement('div');
        productReviewsSection.classList.add('product-reviews-section'); // Add some styling later if needed
        productReviewsSection.innerHTML = `<h4>Reviews for: ${productTitle}</h4>`;

        Object.keys(productReviews).forEach(reviewId => {
            const review = productReviews[reviewId];
            const reviewTimestamp = review.timestamp ? new Date(review.timestamp).toLocaleString() : 'N/A';
            const reviewCard = document.createElement('div');
            reviewCard.classList.add('review-card'); // Reuse or create style for review-card
            reviewCard.innerHTML = `
                <p><strong>Rating:</strong> ${review.rating} out of 5
                    ${'<i class="fas fa-star" style="color:#ffc107;"></i>'.repeat(review.rating)}
                </p>
                <p><strong>Comment:</strong> ${review.comment}</p>
                <p><strong>By:</strong> ${review.userName} on ${reviewTimestamp}</p>
                <button class="admin-button danger small" onclick="deleteReview('${productId}', '${reviewId}')"><i class="fas fa-trash"></i> Delete</button>
            `;
            productReviewsSection.appendChild(reviewCard);
        });
        reviewsListContainer.appendChild(productReviewsSection);
    });
});

// --- Delete Review Function ---
async function deleteReview(productId, reviewId) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
    try {
        await remove(ref(database, `productReviews/${productId}/${reviewId}`));
        alert('Review deleted successfully!');
    } catch (error) {
        alert('Error deleting review: ' + error.message);
        console.error('Review deletion error:', error);
    }
}
// --- Sales Analytics Elements ---
const mostOrderedListEl = document.getElementById('most-ordered-list');
const highestRatedListEl = document.getElementById('highest-rated-list');

// --- Analytics Logic ---
// This function will gather data for analytics
async function updateSalesAnalytics() {
    // 1. Fetch all products
    const productsSnapshot = await get(ref(database, 'products'));
    const products = productsSnapshot.val() || {};

    // 2. Fetch all completed orders (including regular and cart orders)
    const completedOrdersSnapshot = await get(ref(database, 'completedOrders'));
    const completedOrders = completedOrdersSnapshot.val() || {};

    const completedCartOrdersSnapshot = await get(ref(database, 'completedCartOrders'));
    const completedCartOrders = completedCartOrdersSnapshot.val() || {};

    const allCompletedOrders = { ...completedOrders, ...completedCartOrders };

    // 3. Fetch all product reviews
    const reviewsSnapshot = await get(ref(database, 'productReviews'));
    const productReviews = reviewsSnapshot.val() || {};

    // --- Calculate Most Ordered Products ---
    const productOrderCounts = {};
    Object.values(allCompletedOrders).forEach(order => {
        // Assuming order.items contains an object where keys are product IDs
        if (order.items) {
            Object.values(order.items).forEach(item => {
                const productId = item.id;
                const quantity = item.quantity || 1; // Default to 1 if quantity not specified
                productOrderCounts[productId] = (productOrderCounts[productId] || 0) + quantity;
            });
        }
    });

    const sortedMostOrdered = Object.entries(productOrderCounts)
        .map(([productId, count]) => ({
            productId,
            count,
            title: products[productId] ? products[productId].title : `Unknown Product (${productId.substring(0, 6)}...)`
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Get top 5

    displayMostOrdered(sortedMostOrdered);

    // --- Calculate Highest Rated Products ---
    const productRatings = {}; // { productId: { totalRating: X, count: Y } }
    Object.keys(productReviews).forEach(productId => {
        const reviewsForProduct = productReviews[productId];
        let totalRating = 0;
        let reviewCount = 0;
        Object.values(reviewsForProduct).forEach(review => {
            if (review.rating) {
                totalRating += review.rating;
                reviewCount++;
            }
        });
        if (reviewCount > 0) {
            productRatings[productId] = {
                averageRating: totalRating / reviewCount,
                reviewCount: reviewCount
            };
        }
    });

    const sortedHighestRated = Object.entries(productRatings)
        .map(([productId, data]) => ({
            productId,
            averageRating: data.averageRating,
            reviewCount: data.reviewCount,
            title: products[productId] ? products[productId].title : `Unknown Product (${productId.substring(0, 6)}...)`
        }))
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5); // Get top 5

    displayHighestRated(sortedHighestRated);
}

function displayMostOrdered(products) {
    mostOrderedListEl.innerHTML = '';
    if (products.length === 0) {
        mostOrderedListEl.innerHTML = '<p class="no-items-message">No order data yet.</p>';
        return;
    }
    products.forEach(p => {
        const item = document.createElement('div');
        item.classList.add('analytics-list-item');
        item.innerHTML = `
            <span>${p.title}</span>
            <span class="count">${p.count} orders</span>
        `;
        mostOrderedListEl.appendChild(item);
    });
}

function displayHighestRated(products) {
    highestRatedListEl.innerHTML = '';
    if (products.length === 0) {
        highestRatedListEl.innerHTML = '<p class="no-items-message">No rating data yet.</p>';
        return;
    }
    products.forEach(p => {
        const item = document.createElement('div');
        item.classList.add('analytics-list-item');
        item.innerHTML = `
            <span>${p.title}</span>
            <span class="rating-value">${p.averageRating.toFixed(1)}/5 (${p.reviewCount} reviews)</span>
        `;
        highestRatedListEl.appendChild(item);
    });
}

// Ensure analytics update when the tab is activated
// Add this inside the navTabs.forEach(tab => { ... }) listener in admin.js
// if (tab.dataset.tab === 'sales-analytics-tab') {
//     updateSalesAnalytics();
// }
