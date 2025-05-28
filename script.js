// DOM Elements
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const productContainer = document.getElementById('product-container');
const categoryTitle = document.getElementById('category-title');
const productModal = document.getElementById('product-modal');
const paymentModal = document.getElementById('payment-modal');
const paymentDetailsModal = document.getElementById('payment-details-modal');
const closeModals = document.querySelectorAll('.close-modal');
const buyNowBtn = document.getElementById('buy-now-btn');

// Current product for purchase
let currentProduct = null;

// Toggle mobile menu
menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
});

// Close modals
closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        productModal.style.display = 'none';
        paymentModal.style.display = 'none';
        paymentDetailsModal.style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.style.display = 'none';
    }
    if (e.target === paymentModal) {
        paymentModal.style.display = 'none';
    }
    if (e.target === paymentDetailsModal) {
        paymentDetailsModal.style.display = 'none';
    }
});

// Load products from Firebase
function loadProducts(category = null) {
    let productsRef;
    
    if (category) {
        categoryTitle.textContent = category === 'fabric' ? 'Fabric Products' : 'Organic Products';
        productsRef = ref(database, `products/${category}`);
    } else {
        categoryTitle.textContent = 'Featured Products';
        productsRef = ref(database, 'products/featured');
    }
    
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        productContainer.innerHTML = '';
        
        if (data) {
            Object.keys(data).forEach(key => {
                const product = data[key];
                createProductCard(product, key, category || 'featured');
            });
        } else {
            productContainer.innerHTML = '<p class="no-products">No products found in this category.</p>';
        }
    });
}

// Create product card
function createProductCard(product, id, category) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
        <img src="${product.images[0]}" alt="${product.title}" class="product-image">
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-price">Rs. ${product.price}</p>
        </div>
    `;
    
    productCard.addEventListener('click', () => {
        showProductDetails(product, id, category);
    });
    
    productContainer.appendChild(productCard);
}

// Show product details in modal
function showProductDetails(product, id, category) {
    currentProduct = { ...product, id, category };
    
    // Set product details
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('product-price').textContent = `Rs. ${product.price}`;
    document.getElementById('product-description').textContent = product.description;
    
    // Load product images
    const productImages = document.getElementById('product-images');
    productImages.innerHTML = '';
    
    // Main image
    const mainImg = document.createElement('img');
    mainImg.src = product.images[0];
    mainImg.alt = product.title;
    mainImg.className = 'product-main-image';
    productImages.appendChild(mainImg);
    
    // Thumbnails
    if (product.images.length > 1) {
        const thumbnails = document.createElement('div');
        thumbnails.className = 'product-thumbnails';
        
        product.images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img;
            thumb.alt = `${product.title} ${index + 1}`;
            thumb.className = 'product-thumbnail';
            thumb.addEventListener('click', () => {
                mainImg.src = img;
            });
            thumbnails.appendChild(thumb);
        });
        
        productImages.appendChild(thumbnails);
    }
    
    productModal.style.display = 'block';
}

// Show products by category
function showProducts(category) {
    loadProducts(category);
    mobileMenu.classList.remove('show');
    window.scrollTo({ top: document.getElementById('products-section').offsetTop - 20, behavior: 'smooth' });
}

// Buy now button click
buyNowBtn.addEventListener('click', () => {
    productModal.style.display = 'none';
    paymentModal.style.display = 'block';
});

// Select payment method
function selectPayment(method) {
    paymentModal.style.display = 'none';
    
    const paymentDetails = document.getElementById('payment-instructions');
    const paymentTitle = document.getElementById('payment-method-title');
    
    // Set order summary
    document.getElementById('order-product-name').textContent = `Product: ${currentProduct.title}`;
    document.getElementById('order-product-price').textContent = `Price: Rs. ${currentProduct.price}`;
    document.getElementById('order-total').textContent = `Total: Rs. ${currentProduct.price}`;
    
    if (method === 'easypaisa') {
        paymentTitle.textContent = 'EasyPaisa Payment';
        paymentDetails.innerHTML = `
            <h3>Please send payment to:</h3>
            <p><strong>EasyPaisa Number:</strong> 03344148636</p>
            <p><strong>Amount:</strong> Rs. ${currentProduct.price}</p>
            <p>After payment, please share the transaction ID via WhatsApp or SMS to confirm your order.</p>
        `;
    } else if (method === 'jazzcash') {
        paymentTitle.textContent = 'JazzCash Payment';
        paymentDetails.innerHTML = `
            <h3>Please send payment to:</h3>
            <p><strong>JazzCash Number:</strong> 03008682938</p>
            <p><strong>Amount:</strong> Rs. ${currentProduct.price}</p>
            <p>After payment, please share the transaction ID via WhatsApp or SMS to confirm your order.</p>
        `;
    } else if (method === 'bank') {
        paymentTitle.textContent = 'Bank Transfer';
        paymentDetails.innerHTML = `
            <h3>Please transfer payment to:</h3>
            <p><strong>Account Number:</strong> 09830010026508610011</p>
            <p><strong>Amount:</strong> Rs. ${currentProduct.price}</p>
            <p>After transfer, please share the transaction receipt via email or WhatsApp to confirm your order.</p>
        `;
    } else if (method === 'cod') {
        paymentTitle.textContent = 'Cash on Delivery';
        paymentDetails.innerHTML = `
            <h3>Order Confirmation</h3>
            <p>Your order will be delivered to your provided address.</p>
            <p><strong>Amount to pay on delivery:</strong> Rs. ${currentProduct.price}</p>
            <p>Please ensure you have the exact amount ready for the delivery person.</p>
        `;
    }
    
    paymentDetailsModal.style.display = 'block';
}

// Confirm order (would be connected to Firebase in a real implementation)
function confirmOrder() {
    alert('Your order has been placed successfully! We will contact you shortly for confirmation.');
    paymentDetailsModal.style.display = 'none';
    
    // In a real app, you would save the order to Firebase here
    // const ordersRef = ref(database, 'orders');
    // push(ordersRef, {
    //     productId: currentProduct.id,
    //     productName: currentProduct.title,
    //     price: currentProduct.price,
    //     paymentMethod: paymentMethod,
    //     status: 'pending',
    //     timestamp: Date.now()
    // });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
