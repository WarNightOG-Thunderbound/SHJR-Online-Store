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

// Analytics Elements
const analyticsTimeframeSelect = document.getElementById('analytics-timeframe');
const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
const productRatingsChartCanvas = document.getElementById('productRatingsChart');
const winnerProductName = document.getElementById('winner-product-name');
const winnerRatingInfo = document.getElementById('winner-rating-info');
const winnerOrdersInfo = document.getElementById('winner-orders-info');
const compareProduct1Select = document.getElementById('compare-product-1');
const compareProduct2Select = document.getElementById('compare-product-2');
const compareProductsBtn = document.getElementById('compare-products-btn');
const productComparisonChartCanvas = document.getElementById('productComparisonChart');

let currentAdminUID = null;
let allAdminProducts = {}; // To store all products for admin search
let allRatings = {}; // To store all ratings for analytics
let allOrders = {}; // To store all orders for analytics
let productRatingsChart = null; // Chart.js instance for main ratings chart
let productComparisonChart = null; // Chart.js instance for comparison chart

// --- Custom Alert/Confirm Functions ---
const customAlertModal = document.getElementById('custom-alert-modal');
const customModalTitle = document.getElementById('custom-modal-title');
const customModalMessage = document.getElementById('custom-modal-message');
const customModalOkBtn = document.getElementById('custom-modal-ok-btn');
const customModalCancelBtn = document.getElementById('custom-modal-cancel-btn');

function showAlert(message, title = 'Notification') {
    return new Promise(resolve => {
        customModalTitle.textContent = title;
        customModalMessage.textContent = message;
        customModalOkBtn.textContent = 'OK';
        customModalOkBtn.classList.remove('danger', 'secondary');
        customModalOkBtn.classList.add('primary');
        customModalCancelBtn.style.display = 'none';
        customAlertModal.style.display = 'flex';

        const okHandler = () => {
            customAlertModal.style.display = 'none';
            customModalOkBtn.removeEventListener('click', okHandler);
            resolve(true);
        };
        customModalOkBtn.addEventListener('click', okHandler);
    });
}

function showConfirm(message, title = 'Confirm Action', okButtonText = 'Yes', cancelButtonText = 'No', okButtonClass = 'primary') {
    return new Promise(resolve => {
        customModalTitle.textContent = title;
        customModalMessage.textContent = message;
        customModalOkBtn.textContent = okButtonText;
        customModalOkBtn.classList.remove('primary', 'secondary', 'danger');
        customModalOkBtn.classList.add(okButtonClass);
        customModalCancelBtn.textContent = cancelButtonText;
        customModalCancelBtn.style.display = 'inline-block';
        customAlertModal.style.display = 'flex';

        const okHandler = () => {
            customAlertModal.style.display = 'none';
            customModalOkBtn.removeEventListener('click', okHandler);
            customModalCancelBtn.removeEventListener('click', cancelHandler);
            resolve(true);
        };
        const cancelHandler = () => {
            customAlertModal.style.display = 'none';
            customModalOkBtn.removeEventListener('click', okHandler);
            customModalCancelBtn.removeEventListener('click', cancelHandler);
            resolve(false);
        };

        customModalOkBtn.addEventListener('click', okHandler);
        customModalCancelBtn.addEventListener('click', cancelHandler);
    });
}

// --- Tab Navigation Logic ---
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetTabId = tab.dataset.tab;
        document.getElementById(targetTabId).classList.add('active');

        // If switching to analytics tab, refresh data
        if (targetTabId === 'analytics-tab') {
            refreshAnalytics();
        }
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
        await showAlert('Login failed: ' + error.message, 'Login Error');
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
        await showAlert('Logout failed: ' + error.message, 'Logout Error');
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
        listenForRatings(); // Start listening for ratings
    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        // Clear any displayed products/orders when logged out
        productListContainer.innerHTML = '<p class="no-items-message">No products available.</p>';
        orderListContainer.innerHTML = '<p class="no-items-message">No pending orders.</p>';
        completedOrderListContainer.innerHTML = '<p class="no-items-message">No completed orders yet.</p>';
        updateDashboardCounts(0, 0, 0); // Reset dashboard counts
        // Destroy charts if they exist
        if (productRatingsChart) productRatingsChart.destroy();
        if (productComparisonChart) productComparisonChart.destroy();
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
        await showAlert('Please fill in all required fields (Title, Description, Category, Price > 0, Stock >= 0, at least one image).', 'Validation Error');
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
             await showAlert('No images were uploaded or existing images found. Please provide at least one image.', 'Image Required');
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
            await showAlert('Product updated successfully!', 'Success');
        } else {
            // If adding, use the generated temporary ID and set createdAt
            productData.id = currentProductId;
            productData.createdAt = serverTimestamp();
            productData.totalStarsSum = 0; // Initialize for new products
            productData.numberOfRatings = 0; // Initialize for new products
            productData.averageRating = "0.00"; // Initialize for new products
            await set(ref(database, 'products/' + currentProductId), productData);
            await showAlert('Product added successfully!', 'Success');
        }
        clearProductForm(); // Clear form after successful add/edit
    } catch (error) {
        await showAlert('Error saving product: ' + error.message, 'Save Error');
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
        const averageRating = product.numberOfRatings > 0 ? (product.totalStarsSum / product.numberOfRatings).toFixed(1) : 'N/A';
        const ratingDisplay = product.numberOfRatings > 0 ? `Rating: ${averageRating}/7 (${product.numberOfRatings} reviews)` : 'No ratings yet';

        return `
            <div class="admin-product-item">
                <img src="${imageUrl}" alt="${product.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/65x65?text=Error';">
                <div class="admin-product-details">
                    <h4>${product.title} (ID: ${product.id.substring(0, 6)}...)</h4>
                    <p>${product.brand} - ${product.category}</p>
                    <p>Price: PKR ${product.price.toLocaleString()}</p>
                    <p class="product-stock-info">Stock: ${product.stock}</p>
                    <p class="product-rating-info">${ratingDisplay}</p>
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
        button.addEventListener('click', async (e) => {
            const confirmed = await showConfirm(`Are you sure you want to delete product ${e.target.dataset.id.substring(0, 6)}...? This action cannot be undone.`, 'Confirm Deletion', 'Delete', 'Cancel', 'danger');
            if (confirmed) {
                deleteProduct(e.target.dataset.id);
            }
        });
    });
}

function listenForProducts() {
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
        allAdminProducts = snapshot.val() || {};
        displayAdminProducts(allAdminProducts);
        updateDashboardCounts(Object.keys(allAdminProducts).length, pendingOrdersCountEl.textContent, completedOrdersCountEl.textContent);
        populateProductSelects(); // Update product selects for analytics
    }, (error) => {
        console.error("Error listening for products:", error);
        productListContainer.innerHTML = `<p class="no-items-message error-message">Error loading products. Firebase: ${error.message}. Check console and Firebase rules.</p>`;
        showAlert(`Error loading products: ${error.message}. Check console and Firebase rules.`, 'Data Error');
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
                        showAlert(`Failed to load image for ${product.title}. Please check the URL or re-upload.`, 'Image Load Error');
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
        showAlert('Product not found. It might have been deleted.', 'Product Not Found');
        clearProductForm();
    }
}

async function deleteProduct(id) {
    try {
        // TODO: Optionally delete images from Firebase Storage here as well
        // This requires listing items in a folder, which can be complex if not using specific file paths.
        // For now, only deleting database entry.

        await remove(ref(database, 'products/' + id));
        await showAlert('Product deleted successfully!', 'Success');
    } catch (error) {
        await showAlert('Error deleting product: ' + error.message, 'Delete Error');
        console.error('Product delete error:', error);
    }
}


// --- Order Management Logic ---
function listenForOrders() {
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        allOrders = data; // Store all orders for analytics
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
        showAlert(`Error loading orders: ${error.message}.`, 'Data Error');
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
        const productTitles = order.items ? Object.values(order.items).map(item => `${item.title} (x${item.quantity})`).join(', ') : (order.productTitle || 'Product Name Missing'); // Fallback to productTitle from order
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
            button.addEventListener('click', async (e) => {
                const confirmed = await showConfirm(`Are you sure you want to mark order ...${e.target.dataset.orderId.substring(e.target.dataset.orderId.length - 6)} as completed?`, 'Confirm Completion');
                if (confirmed) {
                    completeOrder(e.target.dataset.orderId);
                }
            });
        });
        document.querySelectorAll('.mark-cancelled').forEach(button => {
            button.addEventListener('click', async (e) => {
                const confirmed = await showConfirm(`Are you sure you want to cancel and delete order ...${e.target.dataset.orderId.substring(e.target.dataset.orderId.length - 6)}? This action cannot be undone.`, 'Confirm Cancellation', 'Cancel Order', 'No', 'danger');
                if (confirmed) {
                    cancelOrder(e.target.dataset.orderId);
                }
            });
        });
    }
}

async function completeOrder(orderId) {
    if (!orderId) {
        await showAlert('Error: Order ID is missing for completion.', 'Error');
        return;
    }

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
            await showAlert(`Order ...${orderId.substring(orderId.length - 6)} marked as completed and moved to history.`, 'Order Completed');
        } else {
            await showAlert('Order not found in pending list. It might have been processed already or does not exist.', 'Order Not Found');
        }
    } catch (error) {
        await showAlert('Error completing order: ' + error.message, 'Completion Error');
        console.error('Order completion error:', error);
    }
}

async function cancelOrder(orderId) {
    if (!orderId) {
        await showAlert('Error: Order ID is missing for cancellation.', 'Error');
        return;
    }
    try {
        await remove(ref(database, 'orders/' + orderId));
        await showAlert(`Order ...${orderId.substring(orderId.length - 6)} has been cancelled and removed.`, 'Order Cancelled');
    } catch (error) {
        await showAlert('Error cancelling order: ' + error.message, 'Cancellation Error');
        console.error('Order cancellation error:', error);
    }
}

// --- Dashboard Summary Updates ---
function updateDashboardCounts(productsCount, pendingCount, completedCount) {
    totalProductsCountEl.textContent = productsCount || 0;
    pendingOrdersCountEl.textContent = pendingCount || 0;
    completedOrdersCountEl.textContent = completedCount || 0;
}

// --- Analytics Logic ---
function listenForRatings() {
    const ratingsRef = ref(database, 'ratings');
    onValue(ratingsRef, (snapshot) => {
        allRatings = snapshot.val() || {};
        refreshAnalytics(); // Refresh analytics whenever ratings change
    }, (error) => {
        console.error("Error listening for ratings:", error);
        showAlert(`Error loading ratings data: ${error.message}.`, 'Data Error');
    });
}

refreshAnalyticsBtn.addEventListener('click', refreshAnalytics);
analyticsTimeframeSelect.addEventListener('change', refreshAnalytics);
compareProductsBtn.addEventListener('click', renderComparisonChart);


function refreshAnalytics() {
    const timeframe = analyticsTimeframeSelect.value;
    const filteredRatings = filterRatingsByTimeframe(timeframe);

    renderProductRatingsChart(filteredRatings);
    updateWinnerOfTheWeek(filteredRatings);
    populateProductSelects(); // Ensure selects are updated with latest products
    renderComparisonChart(); // Re-render comparison chart with potentially new data
}

function filterRatingsByTimeframe(timeframe) {
    const now = Date.now();
    let cutoffDate = 0; // All time

    if (timeframe === 'week') {
        cutoffDate = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    } else if (timeframe === 'month') {
        cutoffDate = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    }

    const filtered = {};
    for (const ratingId in allRatings) {
        const rating = allRatings[ratingId];
        // Firebase server timestamps are objects, convert to milliseconds
        const ratingTimestamp = rating.timestamp && rating.timestamp.hasOwnProperty(' sentado') ? rating.timestamp.sentado : rating.timestamp;
        if (ratingTimestamp >= cutoffDate) {
            filtered[ratingId] = rating;
        }
    }
    return filtered;
}

function getProductAggregates(ratings) {
    const productAggregates = {}; // { productId: { totalStars: X, count: Y, orders: Z } }

    // Aggregate ratings
    for (const ratingId in ratings) {
        const rating = ratings[ratingId];
        if (!productAggregates[rating.productId]) {
            productAggregates[rating.productId] = { totalStars: 0, count: 0, orderCount: 0 };
        }
        productAggregates[rating.productId].totalStars += rating.stars;
        productAggregates[rating.productId].count += 1;
    }

    // Aggregate order counts for products within the same timeframe as ratings
    const timeframe = analyticsTimeframeSelect.value;
    const now = Date.now();
    let orderCutoffDate = 0;

    if (timeframe === 'week') {
        orderCutoffDate = now - (7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
        orderCutoffDate = now - (30 * 24 * 60 * 60 * 1000);
    }

    for (const orderId in allOrders) {
        const order = allOrders[orderId];
        // Firebase server timestamps are objects, convert to milliseconds
        const orderTimestamp = order.orderDate ? new Date(order.orderDate).getTime() : 0;

        if (orderTimestamp >= orderCutoffDate && order.productId) {
            if (!productAggregates[order.productId]) {
                productAggregates[order.productId] = { totalStars: 0, count: 0, orderCount: 0 };
            }
            productAggregates[order.productId].orderCount += 1;
        }
    }

    // Calculate average rating and sort
    const sortedProducts = Object.keys(productAggregates)
        .map(productId => {
            const aggregate = productAggregates[productId];
            const product = allAdminProducts[productId];
            const averageRating = aggregate.count > 0 ? (aggregate.totalStars / aggregate.count) : 0;
            return {
                id: productId,
                title: product ? product.title : `Unknown Product (${productId.substring(0,6)}...)`,
                averageRating: parseFloat(averageRating.toFixed(2)),
                numberOfRatings: aggregate.count,
                orderCount: aggregate.orderCount
            };
        })
        .sort((a, b) => b.averageRating - a.averageRating); // Sort descending by average rating

    return sortedProducts;
}

function renderProductRatingsChart(filteredRatings) {
    const productData = getProductAggregates(filteredRatings);

    const labels = productData.map(p => p.title);
    const data = productData.map(p => p.averageRating);
    const colors = labels.map((_, i) => `hsl(${i * 30}, 70%, 60%)`); // Dynamic colors

    if (productRatingsChart) {
        productRatingsChart.destroy(); // Destroy existing chart before creating a new one
    }

    productRatingsChart = new Chart(productRatingsChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Rating (out of 7)',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('70%', '50%').replace('60%', '50%')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Product Ratings - ${analyticsTimeframeSelect.options[analyticsTimeframeSelect.selectedIndex].text}`,
                    font: { size: 18 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            const product = productData[context.dataIndex];
                            if (product) {
                                label += ` (${product.numberOfRatings} reviews, ${product.orderCount} orders)`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 7,
                    title: {
                        display: true,
                        text: 'Average Rating'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Product'
                    }
                }
            }
        }
    });
}

function updateWinnerOfTheWeek(filteredRatings) {
    const productData = getProductAggregates(filteredRatings); // Already filtered by timeframe

    // Find the product with the highest average rating and highest order count
    let winner = null;
    if (productData.length > 0) {
        // Sort by average rating descending, then by order count descending
        const sortedByRatingAndOrders = [...productData].sort((a, b) => {
            if (b.averageRating !== a.averageRating) {
                return b.averageRating - a.averageRating;
            }
            return b.orderCount - a.orderCount;
        });
        winner = sortedByRatingAndOrders[0];
    }

    if (winner && winner.averageRating > 0) {
        winnerProductName.textContent = winner.title;
        winnerRatingInfo.textContent = `Average Rating: ${winner.averageRating.toFixed(2)}/7 (${winner.numberOfRatings} reviews)`;
        winnerOrdersInfo.textContent = `Orders in timeframe: ${winner.orderCount}`;
    } else {
        winnerProductName.textContent = 'No clear winner this period.';
        winnerRatingInfo.textContent = 'Not enough ratings or orders to determine a winner.';
        winnerOrdersInfo.textContent = '';
    }
}

function populateProductSelects() {
    const productsArray = Object.values(allAdminProducts);
    // Clear existing options
    compareProduct1Select.innerHTML = '<option value="">Select Product</option>';
    compareProduct2Select.innerHTML = '<option value="">Select Product</option>';

    productsArray.forEach(product => {
        const option1 = document.createElement('option');
        option1.value = product.id;
        option1.textContent = product.title;
        compareProduct1Select.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = product.id;
        option2.textContent = product.title;
        compareProduct2Select.appendChild(option2);
    });
}

function renderComparisonChart() {
    const product1Id = compareProduct1Select.value;
    const product2Id = compareProduct2Select.value;

    if (!product1Id || !product2Id) {
        if (productComparisonChart) productComparisonChart.destroy();
        return;
    }

    const product1 = allAdminProducts[product1Id];
    const product2 = allAdminProducts[product2Id];

    if (!product1 || !product2) {
        showAlert('Selected products not found.', 'Comparison Error');
        if (productComparisonChart) productComparisonChart.destroy();
        return;
    }

    const labels = ['Average Rating', 'Number of Ratings', 'Order Count'];
    const data1 = [
        parseFloat(product1.averageRating || 0).toFixed(2),
        product1.numberOfRatings || 0,
        getOrdersForProductInTimeframe(product1.id, analyticsTimeframeSelect.value)
    ];
    const data2 = [
        parseFloat(product2.averageRating || 0).toFixed(2),
        product2.numberOfRatings || 0,
        getOrdersForProductInTimeframe(product2.id, analyticsTimeframeSelect.value)
    ];

    if (productComparisonChart) {
        productComparisonChart.destroy();
    }

    productComparisonChart = new Chart(productComparisonChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: product1.title,
                    data: data1,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: product2.title,
                    data: data2,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Comparison: ${product1.title} vs ${product2.title}`,
                    font: { size: 18 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            }
        }
    });
}

function getOrdersForProductInTimeframe(productId, timeframe) {
    const now = Date.now();
    let cutoffDate = 0;

    if (timeframe === 'week') {
        cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
        cutoffDate = now - (30 * 24 * 60 * 60 * 1000);
    }

    let count = 0;
    for (const orderId in allOrders) {
        const order = allOrders[orderId];
        const orderTimestamp = order.orderDate ? new Date(order.orderDate).getTime() : 0;
        if (order.productId === productId && orderTimestamp >= cutoffDate) {
            count++;
        }
    }
    return count;
}


document.addEventListener('DOMContentLoaded', () => {
    if (auth.currentUser && adminDashboard.style.display === 'block') {
        // Already handled by onAuthStateChanged
    } else if (!auth.currentUser) {
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
});
