// Import Firebase functions directly from the SDK URLs
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Get Firebase instances from the global window object
const app = window.firebaseApp;
const auth = window.firebaseAuthInstance; // Use the globally exposed instance
const database = window.firebaseDatabaseInstance; // Use the globally exposed instance

// Conditionally import storage related functions if Firebase Storage is available
const hasFirebaseStorage = window.hasFirebaseStorage;
let storage = null;
let storageRef = null;
let uploadBytes = null;
let getDownloadURL = null;

if (hasFirebaseStorage) {
    // Dynamically import storage functions if available, to avoid errors if not.
    // This part is handled in admin.html by setting window.firebaseStorage etc.
    // So, we just need to reference them here if they were successfully loaded globally.
    storage = window.firebaseStorage;
    // For storage functions, we need to import them directly in admin.js as well
    // if we intend to use them within this module's scope without global exposure of each function.
    // However, since we've established no Firebase Storage is used, these will remain null/disabled.
    // If Firebase Storage were to be used, these would need to be imported here:
    // import { ref as storageRefImport, uploadBytes as uploadBytesImport, getDownloadURL as getDownloadURLImport } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
    // storageRef = storageRefImport;
    // uploadBytes = uploadBytesImport;
    // getDownloadURL = getDownloadURLImport;
}


// Admin UI Elements
const authSection = document.getElementById('auth-section');
const adminDashboard = document.getElementById('admin-dashboard');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

const productIdInput = document.getElementById('product-id');
const productTitleInput = document.getElementById('product-title');
const productDescriptionInput = document.getElementById('product-description');
const productCategorySelect = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productStockInput = document.getElementById('product-stock'); // New Stock Input
const productIsActiveCheckbox = document.getElementById('product-is-active'); // New Active Status Checkbox

const productImageUrls = document.querySelectorAll('.product-image-url'); // Multiple URL inputs
const productImageFiles = document.querySelectorAll('.product-image-file'); // Multiple File inputs
const productVideoUrlInput = document.getElementById('product-video-url'); // Video URL input
const productVideoFile = document.getElementById('product-video-file'); // Video File input
const imageUploadLoading = document.getElementById('image-upload-loading');
const videoUploadLoading = document.getElementById('video-upload-loading');

const addEditProductBtn = document.getElementById('add-edit-product-btn');
const clearFormBtn = document.getElementById('clear-form-btn');
const productListContainer = document.getElementById('product-list-container');
const orderListContainer = document.getElementById('order-list-container');
const doneOrderListContainer = document.getElementById('done-order-list-container'); // New container for done orders

// Dashboard Stats
const totalProductsStat = document.getElementById('total-products-stat');
const activeProductsStat = document.getElementById('active-products-stat');
const pendingOrdersStat = document.getElementById('pending-orders-stat');
const completedOrdersStat = document.getElementById('completed-orders-stat');
const cancelledOrdersStat = document.getElementById('cancelled-orders-stat');

// Admin Tabs
const adminTabButtons = document.querySelectorAll('.admin-tab-button');
const adminTabContents = document.querySelectorAll('.admin-tab-content');

// Search Bar
const productSearchInput = document.getElementById('product-search-input');

let currentAdminUID = null; // Store the admin's UID
let allProductsData = {}; // Cache all products for searching

// --- Conditional Firebase Storage Setup ---
if (!hasFirebaseStorage) {
    productImageFiles.forEach(input => input.disabled = true);
    productVideoFile.disabled = true;
    console.warn("Direct file uploads disabled. Firebase Storage not available.");
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

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    // IMPORTANT: Replace 'warnightog.thunderbound@gmail.com' with the actual ADMIN EMAIL if different
    if (user && user.email === 'warnightog.thunderbound@gmail.com') {
        currentAdminUID = user.uid; // Save admin UID
        authSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAllDataForDashboardAndLists(); // Load all necessary data
        console.log("Admin UID for Firebase Rules:", currentAdminUID); // Log UID for rule configuration

        // Activate the first tab by default
        adminTabButtons[0].click();

    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        adminEmailInput.value = 'warnightog.thunderbound@gmail.com'; // Pre-fill admin email
        adminPasswordInput.value = '';
        productListContainer.innerHTML = ''; // Clear product list
        orderListContainer.innerHTML = ''; // Clear order list
        doneOrderListContainer.innerHTML = ''; // Clear done order list
    }
});

// --- Admin Tab Navigation ---
adminTabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Deactivate all buttons and hide all content
        adminTabButtons.forEach(btn => btn.classList.remove('active'));
        adminTabContents.forEach(content => content.classList.remove('active'));

        // Activate clicked button and show its content
        button.classList.add('active');
        const targetTabId = button.dataset.tab + '-tab';
        document.getElementById(targetTabId).classList.add('active');
    });
});


// --- Product Management Logic ---
function clearProductForm() {
    productIdInput.value = '';
    productTitleInput.value = '';
    productDescriptionInput.value = '';
    productCategorySelect.value = 'Fabric';
    productPriceInput.value = '';
    productStockInput.value = '1'; // Reset stock
    productIsActiveCheckbox.checked = true; // Reset active status
    productImageUrls.forEach(input => input.value = '');
    productImageFiles.forEach(input => input.value = '');
    productVideoUrlInput.value = '';
    productVideoFile.value = '';
    addEditProductBtn.textContent = 'Add Product';
}

clearFormBtn.addEventListener('click', clearProductForm);

addEditProductBtn.addEventListener('click', async () => {
    const id = productIdInput.value;
    const title = productTitleInput.value.trim();
    const description = productDescriptionInput.value.trim();
    const category = productCategorySelect.value;
    const price = parseFloat(productPriceInput.value);
    const stock = parseInt(productStockInput.value); // Get stock
    const isActive = productIsActiveCheckbox.checked; // Get active status

    // Collect image URLs (from inputs) and files (from file inputs)
    const imageUrls = Array.from(productImageUrls).map(input => input.value.trim()).filter(url => url !== '');
    const imageFiles = hasFirebaseStorage ? Array.from(productImageFiles).map(input => input.files[0]).filter(file => file) : [];

    const videoUrl = productVideoUrlInput.value.trim();
    const videoFile = hasFirebaseStorage ? productVideoFile.files[0] : null;

    if (!title || !description || !category || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0 || (imageUrls.length === 0 && imageFiles.length === 0)) {
        alert('Please fill in all required product fields (Title, Description, Category, Price, Stock, at least one Image URL).');
        return;
    }

    // Handle image uploads if Firebase Storage is available
    const uploadedImageUrls = [];
    if (hasFirebaseStorage && imageFiles.length > 0) {
        imageUploadLoading.style.display = 'block';
        try {
            for (const file of imageFiles) {
                const imgRef = storageRef(storage, `product_images/${Date.now()}_${file.name}`);
                await uploadBytes(imgRef, file);
                const downloadURL = await getDownloadURL(imgRef);
                uploadedImageUrls.push(downloadURL);
            }
        } catch (error) {
            alert('Error uploading images: ' + error.message);
            console.error('Image upload error:', error);
            imageUploadLoading.style.display = 'none';
            return;
        } finally {
            imageUploadLoading.style.display = 'none';
        }
    }

    // Combine manual URLs and uploaded URLs
    const finalImages = [...imageUrls, ...uploadedImageUrls];

    // Handle video upload if Firebase Storage is available
    let finalVideoUrl = videoUrl;
    if (hasFirebaseStorage && videoFile) {
        videoUploadLoading.style.display = 'block';
        try {
            const videoStorageRef = storageRef(storage, `product_videos/${Date.now()}_${videoFile.name}`);
            await uploadBytes(videoStorageRef, videoFile);
            finalVideoUrl = await getDownloadURL(videoStorageRef);
        } catch (error) {
            alert('Error uploading video: ' + error.message);
            console.error('Video upload error:', error);
            videoUploadLoading.style.display = 'none';
            return;
        } finally {
            videoUploadLoading.style.display = 'none';
        }
    }


    const productData = {
        title,
        description,
        category,
        price,
        stock, // Add stock to product data
        isActive, // Add isActive to product data
        images: finalImages,
        videoUrl: finalVideoUrl || '',
        views: 0 // Initialize views for analytics, preserved on update
    };

    try {
        if (id) {
            // Edit existing product
            const productToUpdateRef = ref(database, 'products/' + id); // Use ref from imported functions
            // Fetch existing views to preserve them
            onValue(productToUpdateRef, async (snapshot) => { // Use onValue from imported functions
                const existingProduct = snapshot.val();
                if (existingProduct) {
                    productData.views = existingProduct.views || 0;
                }
                await set(productToUpdateRef, { id, ...productData }); // Use set from imported functions
                alert('Product updated successfully!');
                clearProductForm();
            }, { onlyOnce: true });

        } else {
            // Add new product
            const newProductRef = push(ref(database, 'products')); // Use push and ref from imported functions
            const newProductId = newProductRef.key;
            await set(newProductRef, { id: newProductId, ...productData }); // Use set from imported functions
            alert('Product added successfully!');
            clearProductForm();
        }
    } catch (error) {
        alert('Error saving product: ' + error.message);
        console.error('Product save error:', error);
    }
});

// Load and display products (and update dashboard stats)
function loadProducts() {
    const productsRef = ref(database, 'products'); // Use ref from imported functions
    onValue(productsRef, (snapshot) => { // Use onValue from imported functions
        allProductsData = snapshot.val() || {}; // Cache all products
        displayProductsList(allProductsData); // Display all products initially
        updateDashboardStats(); // Update dashboard after loading products
    });
}

function displayProductsList(productsToDisplay) {
    productListContainer.innerHTML = ''; // Clear previous list
    const productsArray = Object.values(productsToDisplay);

    if (productsArray.length > 0) {
        // Sort products by title for better readability
        const sortedProducts = productsArray.sort((a, b) => a.title.localeCompare(b.title));

        sortedProducts.forEach(product => {
            // Ensure product.price is a number before calling toLocaleString()
            const displayPrice = typeof product.price === 'number' ? product.price.toLocaleString() : 'N/A';
            const displayStock = typeof product.stock === 'number' ? product.stock : 'N/A';
            const displayImage = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/60';

            const productItem = document.createElement('div');
            productItem.classList.add('admin-product-item');
            productItem.innerHTML = `
                <img src="${displayImage}" alt="${product.title || 'Product Image'}">
                <div class="admin-product-details">
                    <h4>${product.title || 'No Title'}</h4>
                    <p>${product.category || 'N/A'} - PKR ${displayPrice} | Stock: ${displayStock} | Status: ${product.isActive ? 'Active' : 'Inactive'}</p>
                    <p class="product-analytics">Views: ${product.views || 0}</p>
                </div>
                <div class="admin-actions">
                    <button class="edit-btn" data-id="${product.id}">Edit</button>
                    <button class="delete-btn" data-id="${product.id}">Delete</button>
                </div>
            `;
            productListContainer.appendChild(productItem);
        });

        productListContainer.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => editProduct(e.target.dataset.id));
        });
        productListContainer.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
        });

    } else {
        productListContainer.innerHTML = '<p>No products available.</p>';
    }
}

async function editProduct(id) {
    const productRef = ref(database, 'products/' + id); // Use ref from imported functions
    onValue(productRef, (snapshot) => { // Use onValue from imported functions
        const product = snapshot.val();
        if (product) {
            productIdInput.value = product.id;
            productTitleInput.value = product.title;
            productDescriptionInput.value = product.description;
            productCategorySelect.value = product.category;
            productPriceInput.value = product.price;
            productStockInput.value = product.stock || 0; // Populate stock
            productIsActiveCheckbox.checked = product.isActive !== undefined ? product.isActive : true; // Populate active status

            productImageUrls.forEach((input, index) => {
                input.value = product.images[index] || '';
            });
            productImageFiles.forEach(input => input.value = ''); // Clear file input

            productVideoUrlInput.value = product.videoUrl;
            productVideoFile.value = ''; // Clear video file input

            addEditProductBtn.textContent = 'Update Product';
        } else {
            alert('Product not found.');
            clearProductForm();
        }
    }, {
        onlyOnce: true
    });
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
            await remove(ref(database, 'products/' + id)); // Use remove and ref from imported functions
            alert('Product deleted successfully!');
        } catch (error) {
            alert('Error deleting product: ' + error.message);
            console.error('Product delete error:', error);
        }
    }
}

// --- Product Search in Admin App ---
productSearchInput.addEventListener('input', () => {
    const query = productSearchInput.value.toLowerCase().trim();
    if (query === '') {
        displayProductsList(allProductsData); // Show all products if search is empty
        return;
    }

    const filteredProducts = {};
    const productsArray = Object.values(allProductsData);

    // First, search by title
    productsArray.forEach(product => {
        if (product.title && product.title.toLowerCase().includes(query)) {
            filteredProducts[product.id] = product;
        }
    });

    // If no title match, search by description
    if (Object.keys(filteredProducts).length === 0) {
        productsArray.forEach(product => {
            if (product.description && product.description.toLowerCase().includes(query)) {
                filteredProducts[product.id] = product;
            }
        });
    }

    displayProductsList(filteredProducts);
});


// --- Order Management Logic ---
function loadOrders() {
    const ordersRef = ref(database, 'orders'); // Use ref from imported functions
    onValue(ordersRef, (snapshot) => { // Use onValue from imported functions
        orderListContainer.innerHTML = ''; // Clear pending/active orders
        let pendingCount = 0;
        let cancelledCount = 0;

        const orders = snapshot.val();
        if (orders) {
            const sortedOrders = Object.values(orders).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)); // Sort by date desc
            sortedOrders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.classList.add('order-item');
                const jazzCashTxnDisplay = (order.jazzCashTransactionId && order.jazzCashTransactionId !== 'N/A') ? `<p><strong>JazzCash Txn ID:</strong> ${order.jazzCashTransactionId}</p>` : '';

                const displayProductPrice = typeof order.productPrice === 'number' ? order.productPrice.toLocaleString() : 'N/A';
                const displayOrderId = order.id || 'N/A';
                const displayOrderDate = order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A';

                orderItem.innerHTML = `
                    <h4>Order for: ${order.productTitle || 'N/A'} (PKR ${displayProductPrice})</h4>
                    <p><strong>Order ID:</strong> ${displayOrderId}</p>
                    <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                    ${jazzCashTxnDisplay}
                    <p><strong>Order Date:</strong> ${displayOrderDate}</p>
                    <p><strong>Status:</strong> <span class="status ${order.status ? order.status.toLowerCase().replace(' ', '-') : 'N/A'}">${order.status || 'N/A'}</span></p>
                    <div class="order-actions">
                        <button class="mark-done" data-order-key="${order.id}">Done</button>
                        <button class="mark-cancelled" data-order-key="${order.id}">Cancel</button>
                    </div>
                `;
                orderListContainer.appendChild(orderItem);

                if (order.status === 'Pending') {
                    pendingCount++;
                } else if (order.status === 'Cancelled') {
                    cancelledCount++;
                }
            });

            // Add event listeners for order status buttons
            orderListContainer.querySelectorAll('.mark-done').forEach(button => {
                button.addEventListener('click', (e) => handleOrderAction(e.target.dataset.orderKey, 'Done'));
            });
            orderListContainer.querySelectorAll('.mark-cancelled').forEach(button => {
                button.addEventListener('click', (e) => handleOrderAction(e.target.dataset.orderKey, 'Cancel'));
            });

        } else {
            orderListContainer.innerHTML = '<p>No pending/active orders.</p>';
        }
        pendingOrdersStat.textContent = pendingCount;
        updateDashboardStats();
    });
}

function loadDoneOrders() {
    const doneOrdersRef = ref(database, 'done_orders'); // New path for done orders, use ref
    onValue(doneOrdersRef, (snapshot) => { // Use onValue
        doneOrderListContainer.innerHTML = ''; // Clear done orders list
        let completedCount = 0;

        const orders = snapshot.val();
        if (orders) {
            const sortedOrders = Object.values(orders).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)); // Sort by date desc
            sortedOrders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.classList.add('order-item');
                const jazzCashTxnDisplay = (order.jazzCashTransactionId && order.jazzCashTransactionId !== 'N/A') ? `<p><strong>JazzCash Txn ID:</strong> ${order.jazzCashTransactionId}</p>` : '';

                const displayProductPrice = typeof order.productPrice === 'number' ? order.productPrice.toLocaleString() : 'N/A';
                const displayOrderId = order.id || 'N/A';
                const displayOrderDate = order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A';

                orderItem.innerHTML = `
                    <h4>Order for: ${order.productTitle || 'N/A'} (PKR ${displayProductPrice})</h4>
                    <p><strong>Order ID:</strong> ${displayOrderId}</p>
                    <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                    ${jazzCashTxnDisplay}
                    <p><strong>Order Date:</strong> ${displayOrderDate}</p>
                    <p><strong>Status:</strong> <span class="status completed">${order.status || 'N/A'}</span></p>
                `;
                doneOrderListContainer.appendChild(orderItem);
                completedCount++;
            });
        } else {
            doneOrderListContainer.innerHTML = '<p>No completed orders yet.</p>';
        }
        completedOrdersStat.textContent = completedCount;
        updateDashboardStats();
    });
}

async function handleOrderAction(orderKey, action) {
    if (action === 'Done') {
        if (confirm('Are you sure you want to mark this order as DONE and move it to history?')) {
            try {
                const orderRef = ref(database, 'orders/' + orderKey); // Use ref
                // Fetch the order data first
                onValue(orderRef, async (snapshot) => { // Use onValue
                    const orderData = snapshot.val();
                    if (orderData) {
                        // Set status to Completed
                        orderData.status = 'Completed';
                        // Push to done_orders
                        await set(ref(database, 'done_orders/' + orderKey), orderData); // Use set and ref
                        // Remove from original orders
                        await remove(orderRef); // Use remove
                        alert(`Order ${orderKey} marked as DONE and moved to history!`);
                    }
                }, { onlyOnce: true });

            } catch (error) {
                alert('Error marking order as DONE: ' + error.message);
                console.error('Order DONE error:', error);
            }
        }
    } else if (action === 'Cancel') {
        if (confirm('Are you sure you want to CANCEL this order? This will permanently remove it.')) {
            try {
                await remove(ref(database, 'orders/' + orderKey)); // Use remove and ref
                alert(`Order ${orderKey} CANCELLED and removed!`);
            } catch (error) {
                alert('Error cancelling order: ' + error.message);
                console.error('Order CANCEL error:', error);
            }
        }
    }
}

// --- Dashboard Stats Update ---
function updateDashboardStats() {
    const totalProducts = Object.keys(allProductsData).length;
    const activeProducts = Object.values(allProductsData).filter(p => p.isActive).length;

    totalProductsStat.textContent = totalProducts;
    activeProductsStat.textContent = activeProducts;
    // Pending, Completed, Cancelled counts are updated within their respective load functions
}

// Function to load all necessary data after login
function loadAllDataForDashboardAndLists() {
    loadProducts(); // This also updates product counts for dashboard
    loadOrders(); // This updates pending/cancelled order counts for dashboard
    loadDoneOrders(); // This updates completed order count for dashboard
}

// Initial load (if already logged in) - handled by onAuthStateChanged
