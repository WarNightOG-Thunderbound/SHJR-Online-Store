// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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
            // Adjust for sticky header height if necessary
            // const headerOffset = document.querySelector('header').offsetHeight;
            // const elementPosition = targetElement.getBoundingClientRect().top;
            // const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            // window.scrollTo({ top: offsetPosition, behavior: 'smooth'});
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
}, (error) => {
    console.error("Firebase product read failed: " + error.message);
    productContainer.innerHTML = '<p class="no-products-message">Could not load products. Please try again later.</p>';
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
    document.getElementById('modal-product-stock').textContent = product.stock !== undefined ? (product.stock > 0 ? `${product.stock} available` : 'Out of Stock') : 'N/A';
    placeOrderButton.disabled = product.stock === 0; // Disable button if out of stock


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
        // Basic YouTube URL to Embed URL conversion
        let embedUrl = product.videoUrl;
        if (product.videoUrl.includes("youtube.com/watch?v=")) {
            embedUrl = product.videoUrl.replace("watch?v=", "embed/");
        } else if (product.videoUrl.includes("youtu.be/")) {
            embedUrl = product.videoUrl.replace("youtu.be/", "youtube.com/embed/");
        }
        // Remove other parameters like &list=...
        const queryIndex = embedUrl.indexOf('?');
        if (queryIndex !== -1) {
             const videoIdPart = embedUrl.substring(0, queryIndex);
             const params = new URLSearchParams(embedUrl.substring(queryIndex));
             if (params.has('v')) { // For URLs like /embed/?v=VIDEO_ID
                 embedUrl = `https://www.youtube.com/embed/${params.get('v')}`;
             } else if (videoIdPart.includes("/embed/")) { // If it's already an embed link but with params
                 embedUrl = videoIdPart;
             }
        }


        productVideo.src = embedUrl;
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
        codForm.style.display = 'none'; // Ensure form is hidden on modal close
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
    productModal.style.display = 'none'; // Close product modal
    orderModal.style.display = 'flex'; // Open order modal
    codForm.style.display = 'block'; // Ensure COD form is visible
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
    if (!/^(03\d{2}[-\s]?\d{7})$/.test(phone) && !/^(03\d{9})$/.test(phone)) {
         alert('Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX or 03XXXXXXXXX).');
        return;
    }

    if (!currentProduct) {
        alert('Error: No product selected. Please close this form and select a product.');
        return;
    }
     if (currentProduct.stock === 0) {
        alert("Sorry, this product just went out of stock.");
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
        return;
    }


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
        confirmCodOrderButton.disabled = false;
        confirmCodOrderButton.textContent = 'Confirm Order (Cash on Delivery)';
    }
});
