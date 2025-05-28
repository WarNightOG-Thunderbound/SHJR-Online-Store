// Firebase configuration (already provided)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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
const closeButtons = document.querySelectorAll('.close-button'); // For both modals
const productContainer = document.getElementById('product-container');
const categoryButtons = document.querySelectorAll('.category-button');
const placeOrderButton = document.getElementById('place-order-button');
const modalVideoContainer = document.getElementById('modal-video-container'); // New video container

// COD specific elements
const codForm = document.getElementById('cod-form');
const confirmCodOrderButton = document.getElementById('confirm-cod-order');
const codNameInput = document.getElementById('cod-name');
const codPhoneInput = document.getElementById('cod-phone');
const codAddressInput = document.getElementById('cod-address');

// Navigation elements
const navButtons = document.querySelectorAll('.nav-button');
const homeSection = document.getElementById('home-section');
const historySection = document.getElementById('history-section');
const contactUsSection = document.getElementById('contact-us-section');
const aboutUsSection = document.getElementById('about-us-section');

let currentProduct = null;
let allProducts = {}; // Store all products fetched from Firebase

// --- Function to display products ---
function displayProducts(productsToDisplay) {
    productContainer.innerHTML = ''; // Clear previous products
    Object.values(productsToDisplay).forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.productId = product.id; // Store product ID for easy access
        productCard.innerHTML = `
            <img src="${product.images[0] || 'https://via.placeholder.com/200'}" alt="${product.title}">
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
        // Remove active class from all category buttons
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to the clicked button
        button.classList.add('active');

        const category = button.dataset.category;
        const filteredProducts = Object.values(allProducts).filter(product => product.category === category);
        displayProducts(filteredProducts);
    });
});

// --- Open Product Modal ---
function openProductModal(product) {
    currentProduct = product; // Set the current product for order placement
    document.getElementById('modal-product-title').textContent = product.title;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = `PKR ${product.price.toLocaleString()}`;

    // Increment product views (for basic analytics)
    if (product.id) {
        const productViewsRef = ref(database, `products/${product.id}/views`);
        // Use a transaction to safely increment the counter
        onValue(productViewsRef, (snapshot) => {
            const currentViews = snapshot.val() || 0;
            update(productViewsRef, currentViews + 1);
        }, { onlyOnce: true });
    }

    // Display images
    const imageGallery = document.getElementById('modal-product-images');
    imageGallery.innerHTML = ''; // Clear previous images
    product.images.forEach(imageUrl => {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = product.title; // Add alt text for accessibility
        imageGallery.appendChild(img);
    });

    // Display video (YouTube or direct URL)
    modalVideoContainer.innerHTML = ''; // Clear previous video content
    if (product.videoUrl) {
        let videoElement;
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/g;
        const match = youtubeRegex.exec(product.videoUrl);

        if (match && match[1]) {
            // It's a YouTube video
            videoElement = document.createElement('iframe');
            videoElement.setAttribute('src', `https://www.youtube.com/embed/${match[1]}`);
            videoElement.setAttribute('frameborder', '0');
            videoElement.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            videoElement.setAttribute('allowfullscreen', '');
            videoElement.classList.add('product-video'); // Apply existing video style
        } else {
            // Assume it's a direct video URL
            videoElement = document.createElement('video');
            videoElement.setAttribute('src', product.videoUrl);
            videoElement.setAttribute('controls', '');
            videoElement.classList.add('product-video'); // Apply existing video style
        }
        modalVideoContainer.appendChild(videoElement);
        modalVideoContainer.style.display = 'block';
    } else {
        modalVideoContainer.style.display = 'none';
    }

    productModal.style.display = 'flex'; // Show product details modal
}

// --- Close Modals ---
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        productModal.style.display = 'none';
        orderModal.style.display = 'none';
        codForm.style.display = 'block'; // Ensure form is visible when order modal reopens
    });
});

window.addEventListener('click', (event) => {
    if (event.target == productModal) {
        productModal.style.display = 'none';
    }
    if (event.target == orderModal) {
        orderModal.style.display = 'none';
        codForm.style.display = 'block';
    }
});

// --- Place Order Button in Product Modal ---
placeOrderButton.addEventListener('click', () => {
    productModal.style.display = 'none'; // Close product modal
    orderModal.style.display = 'flex'; // Open order modal
});


// --- Confirm Cash on Delivery Order ---
confirmCodOrderButton.addEventListener('click', () => {
    const name = codNameInput.value.trim();
    const phone = codPhoneInput.value.trim();
    const address = codAddressInput.value.trim();

    if (!name || !phone || !address) {
        alert('Please fill in all details for Cash on Delivery.');
        return;
    }

    placeOrder('Cash on Delivery', { name, phone, address });
});


// --- Place Order Function (to Firebase) ---
async function placeOrder(paymentMethod, customerDetails) {
    if (!currentProduct) {
        alert('No product selected for order. Please select a product first.');
        return;
    }

    try {
        const newOrderRef = push(ref(database, 'orders')); // Generate unique key for the new order
        await set(newOrderRef, {
            id: newOrderRef.key, // Store the unique key within the order data
            productId: currentProduct.id,
            productTitle: currentProduct.title,
            productPrice: currentProduct.price,
            customerName: customerDetails.name,
            customerPhone: customerDetails.phone,
            customerAddress: customerDetails.address,
            paymentMethod: paymentMethod,
            orderDate: new Date().toISOString(), // ISO 8601 format for easy sorting/parsing
            status: "Pending" // Initial status for COD
        });

        alert(`Order for "${currentProduct.title}" placed successfully! We will contact you soon for delivery.`);
        orderModal.style.display = 'none'; // Close order modal

        // Clear form fields after successful order
        codNameInput.value = '';
        codPhoneInput.value = '';
        codAddressInput.value = '';

    } catch (error) {
        console.error("Error placing order: ", error);
        alert("Failed to place order. Please try again.");
    }
}

// --- Navigation Logic (for static tabs) ---
navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Remove active class from all nav buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to the clicked button
        e.target.classList.add('active');

        // Hide all content sections
        homeSection.style.display = 'none';
        historySection.style.display = 'none';
        contactUsSection.style.display = 'none';
        aboutUsSection.style.display = 'none';

        // Show the target section
        const targetSectionId = e.target.dataset.targetSection;
        switch (targetSectionId) {
            case 'home':
                homeSection.style.display = 'block';
                break;
            case 'history':
                historySection.style.display = 'block';
                break;
            case 'contact-us':
                contactUsSection.style.display = 'block';
                break;
            case 'about-us':
                aboutUsSection.style.display = 'block';
                break;
        }
    });
});
