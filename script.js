// Firebase configuration (already provided)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAmTmPgLYBiPXMTqyTAsw5vIrs-11h7-9A",
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
const database = getDatabase(app);

// Global variables for modals and current product
const productModal = document.getElementById('product-modal');
const orderModal = document.getElementById('order-modal');
const closeButtons = document.querySelectorAll('.close-button');
const productContainer = document.getElementById('product-container');
const categoryButtons = document.querySelectorAll('.category-button');
const placeOrderButton = document.getElementById('place-order-button');
const cashOnDeliveryButton = document.getElementById('cash-on-delivery-button');
const jazzCashButton = document.getElementById('jazzcash-button');
const codForm = document.getElementById('cod-form');
const jazzCashForm = document.getElementById('jazzcash-form');
const confirmCodOrderButton = document.getElementById('confirm-cod-order');
const confirmJazzCashOrderButton = document.getElementById('confirm-jazzcash-order');
const jazzCashAmountSpan = document.getElementById('jazzcash-amount');

let currentProduct = null;
let allProducts = {}; // Store all products fetched from Firebase

// --- Function to display products ---
function displayProducts(productsToDisplay) {
    productContainer.innerHTML = ''; // Clear previous products
    Object.values(productsToDisplay).forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.productId = product.id;
        productCard.innerHTML = `
            <img src="${product.images[0]}" alt="${product.title}">
            <div class="product-info">
                <h3>${product.title}</h3>
                <p>${product.description.substring(0, 100)}...</p>
                <p class="price">PKR ${product.price.toLocaleString()}</p>
            </div>
        `;
        productCard.addEventListener('click', () => openProductModal(product));
        productContainer.appendChild(productCard);
    });
}

// --- Fetch products from Firebase ---
const productsRef = ref(database, 'products');
onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allProducts = data; // Store all products
        displayProducts(allProducts); // Display all products initially
    } else {
        productContainer.innerHTML = '<p>No products available.</p>';
    }
});

// --- Category filtering ---
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.dataset.category;
        const filteredProducts = Object.values(allProducts).filter(product => product.category === category);
        displayProducts(filteredProducts);
    });
});

// --- Open Product Modal ---
function openProductModal(product) {
    currentProduct = product; // Set the current product
    document.getElementById('modal-product-title').textContent = product.title;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = `PKR ${product.price.toLocaleString()}`;

    // Display images
    const imageGallery = document.getElementById('modal-product-images');
    imageGallery.innerHTML = '';
    product.images.forEach(imageUrl => {
        const img = document.createElement('img');
        img.src = imageUrl;
        imageGallery.appendChild(img);
    });

    // Display video
    const productVideo = document.getElementById('modal-product-video');
    if (product.videoUrl) {
        productVideo.src = product.videoUrl;
        productVideo.style.display = 'block';
    } else {
        productVideo.style.display = 'none';
        productVideo.src = ''; // Clear video source if no video
    }

    productModal.style.display = 'flex'; // Show modal
}

// --- Close Modals ---
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        productModal.style.display = 'none';
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
        jazzCashForm.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target == productModal) {
        productModal.style.display = 'none';
    }
    if (event.target == orderModal) {
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
        jazzCashForm.style.display = 'none';
    }
});

// --- Place Order Button in Product Modal ---
placeOrderButton.addEventListener('click', () => {
    productModal.style.display = 'none'; // Close product modal
    orderModal.style.display = 'flex'; // Open order modal
    jazzCashAmountSpan.textContent = `PKR ${currentProduct.price.toLocaleString()}`;
});

// --- Payment Method Selection ---
cashOnDeliveryButton.addEventListener('click', () => {
    codForm.style.display = 'block';
    jazzCashForm.style.display = 'none';
});

jazzCashButton.addEventListener('click', () => {
    jazzCashForm.style.display = 'block';
    codForm.style.display = 'none';
});

// --- Confirm Cash on Delivery Order ---
confirmCodOrderButton.addEventListener('click', () => {
    const name = document.getElementById('cod-name').value;
    const phone = document.getElementById('cod-phone').value;
    const address = document.getElementById('cod-address').value;

    if (!name || !phone || !address) {
        alert('Please fill in all details for Cash on Delivery.');
        return;
    }

    placeOrder('Cash on Delivery', { name, phone, address });
});

// --- Confirm JazzCash Order (Simulated) ---
confirmJazzCashOrderButton.addEventListener('click', () => {
    const transactionId = document.getElementById('jazzcash-transaction-id').value;
    const name = document.getElementById('jazzcash-name').value;
    const phone = document.getElementById('jazzcash-phone').value;
    const address = document.getElementById('jazzcash-address').value;

    if (!transactionId || !name || !phone || !address) {
        alert('Please fill in all details for JazzCash payment.');
        return;
    }

    // In a real application, you'd verify the transaction ID with a server-side JazzCash API call here.
    // For this demonstration, we'll just log it.
    console.log(`Simulating JazzCash payment for ${currentProduct.title}. Transaction ID: ${transactionId}`);

    placeOrder('JazzCash (Simulated)', { name, phone, address, transactionId });
});

// --- Place Order Function (to Firebase) ---
function placeOrder(paymentMethod, customerDetails) {
    if (!currentProduct) {
        alert('No product selected for order.');
        return;
    }

    const newOrderRef = push(ref(database, 'orders')); // Generate unique key
    set(newOrderRef, {
        productId: currentProduct.id,
        productTitle: currentProduct.title,
        productPrice: currentProduct.price,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerAddress: customerDetails.address,
        paymentMethod: paymentMethod,
        jazzCashTransactionId: customerDetails.transactionId || 'N/A', // Only for JazzCash
        orderDate: new Date().toISOString(),
        status: "Pending" // Initial status
    }).then(() => {
        alert(`Order placed successfully! Payment Method: ${paymentMethod}.`);
        orderModal.style.display = 'none'; // Close order modal
        codForm.style.display = 'none';
        jazzCashForm.style.display = 'none';
        // Clear form fields
        document.getElementById('cod-name').value = '';
        document.getElementById('cod-phone').value = '';
        document.getElementById('cod-address').value = '';
        document.getElementById('jazzcash-transaction-id').value = '';
        document.getElementById('jazzcash-name').value = '';
        document.getElementById('jazzcash-phone').value = '';
        document.getElementById('jazzcash-address').value = '';

    }).catch((error) => {
        console.error("Error placing order: ", error);
        alert("Failed to place order. Please try again.");
    });
}
