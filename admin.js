// Import Firebase functions from the global scope (set by admin.html script tag)
const app = window.firebaseApp;
const auth = window.firebaseAuth;
const database = window.firebaseDatabase;
const storage = window.firebaseStorage; // Access storage
const dbRef = window.dbRef;
const dbOnValue = window.dbOnValue;
const dbPush = window.dbPush;
const dbSet = window.dbSet;
const dbUpdate = window.dbUpdate;
const dbRemove = window.dbRemove;
const signInWithEmailAndPassword = window.signInWithEmailAndPassword;
const signOut = window.signOut;
const onAuthStateChanged = window.onAuthStateChanged;
const storageRef = window.storageRef; // Access storageRef
const uploadBytes = window.uploadBytes; // Access uploadBytes
const getDownloadURL = window.getDownloadURL; // Access getDownloadURL


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

let currentAdminUID = null; // Store the admin's UID

// --- Authentication Logic ---
adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // User is signed in, onAuthStateChanged listener will handle UI update
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
        // UI will be updated by onAuthStateChanged listener
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
        loadProducts(); // Load products when admin logs in
        loadOrders(); // Load orders when admin logs in
        console.log("Admin UID for Firebase Rules:", currentAdminUID); // Log UID for rule configuration
    } else {
        currentAdminUID = null;
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        adminEmailInput.value = 'warnightog.thunderbound@gmail.com'; // Pre-fill admin email
        adminPasswordInput.value = '';
        productListContainer.innerHTML = ''; // Clear product list
        orderListContainer.innerHTML = ''; // Clear order list
    }
});

// --- Product Management Logic ---
function clearProductForm() {
    productIdInput.value = '';
    productTitleInput.value = '';
    productDescriptionInput.value = '';
    productCategorySelect.value = 'Fabric';
    productPriceInput.value = '';
    productImageUrls.forEach(input => input.value = '');
    productImageFiles.forEach(input => input.value = ''); // Clear file input
    productVideoUrlInput.value = '';
    productVideoFile.value = ''; // Clear file input
    addEditProductBtn.textContent = 'Add Product';
}

clearFormBtn.addEventListener('click', clearProductForm);

addEditProductBtn.addEventListener('click', async () => {
    const id = productIdInput.value;
    const title = productTitleInput.value.trim();
    const description = productDescriptionInput.value.trim();
    const category = productCategorySelect.value;
    const price = parseFloat(productPriceInput.value);

    // Collect image URLs (from inputs) and files (from file inputs)
    const imageUrls = Array.from(productImageUrls).map(input => input.value.trim()).filter(url => url !== '');
    const imageFiles = Array.from(productImageFiles).map(input => input.files[0]).filter(file => file);

    const videoUrl = productVideoUrlInput.value.trim();
    const videoFile = productVideoFile.files[0];

    if (!title || !description || !category || isNaN(price) || price <= 0 || (imageUrls.length === 0 && imageFiles.length === 0)) {
        alert('Please fill in all required product fields (Title, Description, Category, Price, at least one Image URL or Upload).');
        return;
    }

    // Handle image uploads
    const uploadedImageUrls = [];
    if (imageFiles.length > 0) {
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

    // Handle video upload
    let finalVideoUrl = videoUrl;
    if (videoFile) {
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
        images: finalImages,
        videoUrl: finalVideoUrl || '', // Ensure videoUrl is empty string if not provided
        views: 0 // Initialize views for analytics
    };

    try {
        if (id) {
            // Edit existing product
            // When editing, preserve existing views if not explicitly updated
            const productToUpdateRef = dbRef(database, 'products/' + id);
            dbOnValue(productToUpdateRef, async (snapshot) => {
                const existingProduct = snapshot.val();
                if (existingProduct) {
                    productData.views = existingProduct.views || 0; // Preserve existing views
                }
                await dbSet(productToUpdateRef, { id, ...productData });
                alert('Product updated successfully!');
                clearProductForm();
            }, { onlyOnce: true });

        } else {
            // Add new product
            const newProductRef = dbPush(dbRef(database, 'products'));
            const newProductId = newProductRef.key;
            await dbSet(newProductRef, { id: newProductId, ...productData });
            alert('Product added successfully!');
            clearProductForm();
        }
    } catch (error) {
        alert('Error saving product: ' + error.message);
        console.error('Product save error:', error);
    }
});

// Load and display products
function loadProducts() {
    const productsRef = dbRef(database, 'products');
    dbOnValue(productsRef, (snapshot) => {
        productListContainer.innerHTML = ''; // Clear previous list
        const products = snapshot.val();
        if (products) {
            // Sort products by title for better readability
            const sortedProducts = Object.values(products).sort((a, b) => a.title.localeCompare(b.title));

            sortedProducts.forEach(product => {
                const productItem = document.createElement('div');
                productItem.classList.add('admin-product-item');
                productItem.innerHTML = `
                    <img src="${product.images[0] || 'https://via.placeholder.com/60'}" alt="${product.title}">
                    <div class="admin-product-details">
                        <h4>${product.title}</h4>
                        <p>${product.category} - PKR ${product.price.toLocaleString()}</p>
                        <p class="product-analytics">Views: ${product.views || 0}</p>
                    </div>
                    <div class="admin-actions">
                        <button class="edit-btn" data-id="${product.id}">Edit</button>
                        <button class="delete-btn" data-id="${product.id}">Delete</button>
                    </div>
                `;
                productListContainer.appendChild(productItem);
            });

            // Add event listeners for edit and delete buttons
            productListContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => editProduct(e.target.dataset.id));
            });
            productListContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
            });

        } else {
            productListContainer.innerHTML = '<p>No products available.</p>';
        }
    });
}

async function editProduct(id) {
    const productRef = dbRef(database, 'products/' + id);
    // Use once() equivalent (onValue with {onlyOnce: true}) to fetch data for editing
    dbOnValue(productRef, (snapshot) => {
        const product = snapshot.val();
        if (product) {
            productIdInput.value = product.id;
            productTitleInput.value = product.title;
            productDescriptionInput.value = product.description;
            productCategorySelect.value = product.category;
            productPriceInput.value = product.price;

            // Populate image URLs
            productImageUrls.forEach((input, index) => {
                input.value = product.images[index] || '';
            });
            // Clear file inputs when editing
            productImageFiles.forEach(input => input.value = '');

            productVideoUrlInput.value = product.videoUrl;
            productVideoFile.value = ''; // Clear video file input when editing

            addEditProductBtn.textContent = 'Update Product';
        } else {
            alert('Product not found.');
            clearProductForm(); // Clear form if product not found
        }
    }, {
        onlyOnce: true // Fetch data once for editing
    });
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
            await dbRemove(dbRef(database, 'products/' + id));
            alert('Product deleted successfully!');
        } catch (error) {
            alert('Error deleting product: ' + error.message);
            console.error('Product delete error:', error);
        }
    }
}

// --- Order Management Logic ---
function loadOrders() {
    const ordersRef = dbRef(database, 'orders');
    dbOnValue(ordersRef, (snapshot) => {
        orderListContainer.innerHTML = ''; // Clear previous list
        const orders = snapshot.val();
        if (orders) {
            const sortedOrders = Object.values(orders).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)); // Sort by date desc
            sortedOrders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.classList.add('order-item');
                // Display JazzCash Txn ID only if it exists and is not 'N/A'
                const jazzCashTxnDisplay = (order.jazzCashTransactionId && order.jazzCashTransactionId !== 'N/A') ? `<p><strong>JazzCash Txn ID:</strong> ${order.jazzCashTransactionId}</p>` : '';

                orderItem.innerHTML = `
                    <h4>Order for: ${order.productTitle} (PKR ${order.productPrice.toLocaleString()})</h4>
                    <p><strong>Order ID:</strong> ${order.id || 'N/A'}</p>
                    <p><strong>Customer:</strong> ${order.customerName}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone}</p>
                    <p><strong>Address:</strong> ${order.customerAddress}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                    ${jazzCashTxnDisplay}
                    <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></p>
                    <div class="order-actions">
                        <button class="mark-completed" data-order-key="${order.id}">Mark Completed</button>
                        <button class="mark-pending" data-order-key="${order.id}">Mark Pending</button>
                        <button class="mark-cancelled" data-order-key="${order.id}">Mark Cancelled</button>
                    </div>
                `;
                orderListContainer.appendChild(orderItem);
            });

            // Add event listeners for order status buttons
            orderListContainer.querySelectorAll('.mark-completed').forEach(button => {
                button.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderKey, 'Completed'));
            });
            orderListContainer.querySelectorAll('.mark-pending').forEach(button => {
                button.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderKey, 'Pending'));
            });
            orderListContainer.querySelectorAll('.mark-cancelled').forEach(button => {
                button.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderKey, 'Cancelled'));
            });

        } else {
            orderListContainer.innerHTML = '<p>No orders received yet.</p>';
        }
    });
}

async function updateOrderStatus(orderKey, newStatus) {
    try {
        await dbUpdate(dbRef(database, 'orders/' + orderKey), { status: newStatus });
        alert(`Order ${orderKey} status updated to ${newStatus}!`);
    } catch (error) {
        alert('Error updating order status: ' + error.message);
        console.error('Order status update error:', error);
    }
}
