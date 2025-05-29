// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"; // Updated to a newer SDK version
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js"; // Updated to a newer SDK version

const firebaseConfig = {
    apiKey: "AIzaSyAmTmPgLYBiPXMTqyTAsw5vIrs-11h7-9A", // Keep your actual API key
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

// Global variables
const productModal = document.getElementById('product-modal');
const orderModal = document.getElementById('order-modal');
const closeButtons = document.querySelectorAll('.close-button');
const productContainer = document.getElementById('product-container');
const categoryButtons = document.querySelectorAll('.category-button');
const placeOrderButton = document.getElementById('place-order-button');
const searchBar = document.getElementById('search-bar');
const navLinks = document.querySelectorAll('.main-nav a');

// COD specific elements
const codForm = document.getElementById('cod-form');
const confirmCodOrderButton = document.getElementById('confirm-cod-order');
const codNameInput = document.getElementById('cod-name');
const codPhoneInput = document.getElementById('cod-phone');
const codAddressInput = document.getElementById('cod-address');

let currentProduct = null;
let allProducts = {}; // Store all products fetched from Firebase

// --- Smooth Scrolling for Nav Links ---
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// --- Function to display products ---
function displayProducts(productsToDisplay) {
    productContainer.innerHTML = ''; // Clear previous products
    if (Object.keys(productsToDisplay).length === 0) {
        productContainer.innerHTML = '<p class="no-products-message">No products match your criteria.</p>';
        return;
    }
    Object.values(productsToDisplay).forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.productId = product.id;
        productCard.innerHTML = `
            <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200.png?text=No+Image'}" alt="${product.title}">
            <div class="product-info">
                <h3>${product.title}</h3>
                <p class="product-brand-card"><strong>Brand:</strong> ${product.brand || 'N/A'}</p>
                <p>${product.description.substring(0, 80)}...</p>
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
        allProducts = data;
        displayProducts(allProducts); // Display all products initially
    } else {
        allProducts = {}; // Ensure it's an empty object if no data
        productContainer.innerHTML = '<p class="no-products-message">No products available at the moment. Please check back later!</p>';
    }
});

// --- Category filtering ---
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.dataset.category;
        // Highlight active button
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (category === "All Products") {
            displayProducts(allProducts);
        } else {
            const filteredProducts = Object.values(allProducts).filter(product => product.category === category);
            displayProducts(filteredProducts);
        }
        searchBar.value = ''; // Clear search bar on category change
    });
});

// --- Search functionality ---
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    // Deselect category buttons when searching
    categoryButtons.forEach(btn => btn.classList.remove('active'));

    if (!searchTerm) {
        displayProducts(allProducts); // Show all if search is cleared
        return;
    }

    const filteredProducts = Object.values(allProducts).filter(product =>
        product.title.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm))
    );
    displayProducts(filteredProducts);
});


// --- Open Product Modal ---
function openProductModal(product) {
    currentProduct = product;
    document.getElementById('modal-product-title').textContent = product.title;
    document.getElementById('modal-product-brand').textContent = product.brand || 'N/A';
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = `PKR ${product.price.toLocaleString()}`;
    document.getElementById('modal-product-stock').textContent = product.stock !== undefined ? product.stock : 'N/A';


    const imageGallery = document.getElementById('modal-product-images');
    imageGallery.innerHTML = '';
    if (product.images && product.images.length > 0) {
        product.images.forEach(imageUrl => {
            if(imageUrl) { // Ensure URL is not empty or null
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = product.title;
                imageGallery.appendChild(img);
            }
        });
    } else {
        const img = document.createElement('img');
        img.src = 'https://via.placeholder.com/300x200.png?text=No+Image';
        img.alt = product.title;
        imageGallery.appendChild(img);
    }

    const productVideo = document.getElementById('modal-product-video');
    if (product.videoUrl) {
        productVideo.src = product.videoUrl;
        productVideo.style.display = 'block';
    } else {
        productVideo.style.display = 'none';
        productVideo.src = '';
    }

    productModal.style.display = 'flex';
}

// --- Close Modals ---
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        productModal.style.display = 'none';
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target === productModal) {
        productModal.style.display = 'none';
    }
    if (event.target === orderModal) {
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
    }
});

// --- Place Order Button in Product Modal ---
placeOrderButton.addEventListener('click', () => {
    if (!currentProduct) {
        alert("Error: Product details not loaded. Please try again.");
        return;
    }
    if (currentProduct.stock === 0) {
        alert("Sorry, this product is currently out of stock.");
        return;
    }
    productModal.style.display = 'none';
    orderModal.style.display = 'flex';
    codForm.style.display = 'block';
});

// --- Confirm Cash on Delivery Order ---
confirmCodOrderButton.addEventListener('click', async () => {
    const name = codNameInput.value.trim();
    const phone = codPhoneInput.value.trim();
    const address = codAddressInput.value.trim();

    if (!name || !phone || !address) {
        alert('Please fill in all delivery details.');
        return;
    }
    // Basic phone validation (Pakistani format)
    if (!/^(03\d{2}-\d{7})$/.test(phone) && !/^(03\d{9})$/.test(phone)) {
         alert('Please enter a valid phone number (e.g., 03XX-XXXXXXX or 03XXXXXXXXX).');
        return;
    }


    if (!currentProduct) {
        alert('Error: No product selected. Please close this form and select a product.');
        return;
    }

    // Disable button to prevent multiple submissions
    confirmCodOrderButton.disabled = true;
    confirmCodOrderButton.textContent = 'Processing...';

    try {
        const newOrderRef = push(ref(database, 'orders'));
        await set(newOrderRef, {
            id: newOrderRef.key,
            productId: currentProduct.id,
            productTitle: currentProduct.title,
            productPrice: currentProduct.price,
            customerName: name,
            customerPhone: phone,
            customerAddress: address,
            paymentMethod: 'Cash on Delivery',
            orderDate: new Date().toISOString(),
            status: "Pending"
        });

        // Optionally, update stock in Firebase (if tracking stock tightly)
        // This requires careful handling of concurrent updates.
        // For simplicity, we'll assume stock is managed primarily via admin panel.
        // if (currentProduct.stock !== undefined) {
        //     const productStockRef = ref(database, `products/${currentProduct.id}/stock`);
        //     await set(productStockRef, currentProduct.stock - 1);
        // }

        alert(`Order for "${currentProduct.title}" placed successfully! We will contact you soon for delivery.`);
        orderModal.style.display = 'none';
        codForm.style.display = 'none';

        codNameInput.value = '';
        codPhoneInput.value = '';
        codAddressInput.value = '';

    } catch (error) {
        console.error("Error placing order: ", error);
        alert("Failed to place order. Please try again. Error: " + error.message);
    } finally {
        // Re-enable button
        confirmCodOrderButton.disabled = false;
        confirmCodOrderButton.textContent = 'Confirm Order (Cash on Delivery)';
    }
});
