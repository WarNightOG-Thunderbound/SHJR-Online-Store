// script.js

// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAmTmPgLYBiPXMTqyTAsw5vIrs-11h7-9A", // Keep your actual API key
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
const database = getDatabase(app);


// --- Product Data (Now fetched from Firebase) ---
let products = []; // This will now be populated from Firebase

// --- DOM Elements ---
const productContainer = document.getElementById('product-container');
const searchBar = document.getElementById('search-bar');
const categoryButtons = document.querySelectorAll('.category-button');

// Modals
const productModal = document.getElementById('product-modal');
const orderModal = document.getElementById('order-modal');
const ratingModal = document.getElementById('rating-modal');
const customAlertModal = document.getElementById('custom-alert-modal');
const imagePreviewModal = document.getElementById('image-preview-modal');

// Close buttons
const closeButtons = document.querySelectorAll('.modal .close-button, .custom-modal-overlay .close-button');

// Product Modal Elements
const modalProductTitle = document.getElementById('modal-product-title');
const mainProductImage = document.getElementById('main-product-image');
const modalProductVideo = document.getElementById('modal-product-video');
const modalProductBrand = document.getElementById('modal-product-brand');
const modalProductDescription = document.getElementById('modal-product-description');
const modalProductStock = document.getElementById('modal-product-stock');
const modalProductPrice = document.getElementById('modal-product-price');
const placeOrderButton = document.getElementById('place-order-button');
const galleryNavPrevButton = document.querySelector('.prev-button');
const galleryNavNextButton = document.querySelector('.next-button');

// Order Modal Elements
const codNameInput = document.getElementById('cod-name');
const codPhoneInput = document.getElementById('cod-phone');
const codAddressInput = document.getElementById('cod-address');
const confirmCodOrderButton = document.getElementById('confirm-cod-order');

// Rating Modal Elements
const ratingProductTitle = document.getElementById('rating-product-title');
const ratingStarsContainer = document.getElementById('rating-stars-container');
const submitRatingButton = document.getElementById('submit-rating-button');

// Custom Alert Elements
const customModalTitle = document.getElementById('custom-modal-title');
const customModalMessage = document.getElementById('custom-modal-message');
const customModalOkBtn = document.getElementById('custom-modal-ok-btn');
const customModalCancelBtn = document.getElementById('custom-modal-cancel-btn');

// Image Preview Elements
const enlargedProductImage = document.getElementById('enlarged-product-image');
const closeImagePreviewBtn = document.getElementById('close-image-preview-btn');


let currentProduct = null;
let currentImageIndex = 0;
let userSelectedRating = 0; // To store the rating selected by the user for analytics

// To manage Firebase Realtime Database listener for reviews
let currentReviewsListenerOff = null;


// --- Helper Functions ---

/**
 * Formats a number into a currency string (e.g., "PKR - 5,000").
 * @param {number|string} priceValue - The price number or string to format.
 * @returns {string} The formatted price string.
 */
function formatPrice(priceValue) {
    // Attempt to parse the price. If it's like "PKR 1500/meter", extract the number part.
    let numericPrice;
    if (typeof priceValue === 'string') {
        const match = priceValue.match(/(\d[\d,\.]*)/); // Find number, including commas/dots
        if (match) {
            numericPrice = parseFloat(match[1].replace(/,/g, '')); // Remove commas, parse to float
        }
    } else if (typeof priceValue === 'number') {
        numericPrice = priceValue;
    }

    if (isNaN(numericPrice)) {
        return priceValue; // Return original if cannot parse
    }

    // Format with commas for thousands
    const formatted = numericPrice.toLocaleString('en-PK', { // Use 'en-PK' for Pakistani locale if available, or 'en-US' for general comma formatting
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return `PKR - ${formatted}`;
}


/**
 * Displays a custom alert modal.
 * @param {string} title - The title of the alert.
 * @param {string} message - The message content.
 * @param {boolean} showCancel - Whether to show the cancel button.
 * @returns {Promise<boolean>} - Resolves true if OK, false if Cancel.
 */
function showCustomAlert(title, message, showCancel = false) {
    return new Promise((resolve) => {
        customModalTitle.textContent = title;
        customModalMessage.textContent = message;
        customModalCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
        customAlertModal.style.display = 'flex';

        const handleOk = () => {
            customModalOkBtn.removeEventListener('click', handleOk);
            customModalCancelBtn.removeEventListener('click', handleCancel);
            customAlertModal.style.display = 'none';
            resolve(true);
        };

        const handleCancel = () => {
            customModalOkBtn.removeEventListener('click', handleOk);
            customModalCancelBtn.removeEventListener('click', handleCancel);
            customAlertModal.style.display = 'none';
            resolve(false);
        };

        customModalOkBtn.addEventListener('click', handleOk);
        if (showCancel) {
            customModalCancelBtn.addEventListener('click', handleCancel);
        }
    });
}

function closeAllModals() {
    productModal.style.display = 'none';
    orderModal.style.display = 'none';
    ratingModal.style.display = 'none';
    customAlertModal.style.display = 'none';
    imagePreviewModal.style.display = 'none';

    // Detach the real-time review listener when the product modal closes
    if (currentReviewsListenerOff) {
        currentReviewsListenerOff(); // Call the unsubscribe function
        currentReviewsListenerOff = null;
    }
}

/**
 * Generates a random fake rating with higher probability for 7 stars.
 * @returns {number} - A rating between 5 and 7.
 */
function getRandomFakeRating() {
    const rand = Math.random();
    if (rand < 0.6) { // 60% chance for 7 stars
        return 7;
    } else if (rand < 0.85) { // 25% chance for 6 stars
        return 6;
    } else { // 15% chance for 5 stars
        return 5;
    }
}

/**
 * Displays star icons in a given container based on a rating.
 * @param {HTMLElement} container - The DOM element to append stars to.
 * @param {number} rating - The numerical rating to display (e.g., 5, 6, 7).
 */
function displayRatingStars(container, rating) {
    container.innerHTML = ''; // Clear previous stars
    for (let i = 1; i <= 7; i++) {
        const star = document.createElement('i');
        star.classList.add('fa-solid', 'fa-star');
        star.dataset.rating = i; // For clickable stars in rating modal
        star.style.color = i <= rating ? 'gold' : 'lightgray';
        container.appendChild(star);
    }
}


// --- Product Display and Filtering ---

function displayProducts(productsToDisplay) {
    productContainer.innerHTML = ''; // Clear existing products
    if (productsToDisplay.length === 0) {
        productContainer.innerHTML = '<p>No products found.</p>';
        return;
    }

    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('product-card-image-container');
        const productImage = document.createElement('img');
        // Ensure product.images is an array and has at least one element
        productImage.src = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400x300?text=No+Image';
        productImage.alt = product.name;
        imageContainer.appendChild(productImage);
        productCard.appendChild(imageContainer);

        const productTitle = document.createElement('h3');
        productTitle.textContent = product.name;
        productCard.appendChild(productTitle);

        const productBrand = document.createElement('p');
        productBrand.innerHTML = `<strong>Brand:</strong> ${product.brand || 'N/A'}`; // Handle missing brand
        productCard.appendChild(productBrand);

        // --- Fake Rating System Display ---
        const ratingDisplay = document.createElement('div');
        ratingDisplay.classList.add('product-card-rating');
        const fakeRating = getRandomFakeRating();
        displayRatingStars(ratingDisplay, fakeRating); // Display fake stars on product card
        productCard.appendChild(ratingDisplay);
        // --- End Fake Rating System Display ---

        // --- Price Display with Fake Discount ---
        const productPriceDiv = document.createElement('div');
        productPriceDiv.classList.add('product-prices');

        let currentPriceValue = parseFloat(product.price.replace(/[PKR\s,-/meter]/g, '')); // Extract numeric value
        if (isNaN(currentPriceValue)) {
            currentPriceValue = 0; // Default to 0 if price can't be parsed
        }
        const originalPriceValue = currentPriceValue + 1000; // Fake higher price

        const originalPriceSpan = document.createElement('span');
        originalPriceSpan.classList.add('original-price');
        originalPriceSpan.style.textDecoration = 'line-through';
        originalPriceSpan.style.marginRight = '10px';
        originalPriceSpan.style.color = 'var(--color-medium-gray)'; // Or any subdued color
        originalPriceSpan.innerHTML = formatPrice(originalPriceValue); // Use formatPrice helper
        productPriceDiv.appendChild(originalPriceSpan);

        const currentPriceSpan = document.createElement('span');
        currentPriceSpan.classList.add('current-price');
        currentPriceSpan.textContent = formatPrice(currentPriceValue); // Use formatPrice helper
        productPriceDiv.appendChild(currentPriceSpan);

        productCard.appendChild(productPriceDiv);
        // --- End Price Display with Fake Discount ---

        productCard.addEventListener('click', () => openProductModal(product));
        productContainer.appendChild(productCard);
    });
}

function filterProducts() {
    const searchTerm = searchBar.value.toLowerCase();
    const activeCategoryButton = document.querySelector('.category-button.active');
    const selectedCategory = activeCategoryButton ? activeCategoryButton.dataset.category : 'All Products';

    const filtered = products.filter(product => {
        const matchesSearch = (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                              (product.description && product.description.toLowerCase().includes(searchTerm));
        const matchesCategory = selectedCategory === 'All Products' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    displayProducts(filtered);
}

// --- Product Modal Logic ---

function openProductModal(product) {
    currentProduct = product;
    currentImageIndex = 0; // Reset image index

    modalProductTitle.textContent = product.name;
    modalProductBrand.textContent = product.brand || 'N/A';
    modalProductDescription.textContent = product.description;
    modalProductStock.textContent = product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock';
    modalProductStock.style.color = product.stock > 0 ? 'green' : 'red';
    
    // --- Modal Price Display with Fake Discount ---
    let currentPriceValue = parseFloat(product.price.replace(/[PKR\s,-/meter]/g, ''));
    if (isNaN(currentPriceValue)) {
        currentPriceValue = 0;
    }
    const originalPriceValue = currentPriceValue + 1000; // Fake higher price

    modalProductPrice.innerHTML = ''; // Clear previous price content
    const originalModalPriceSpan = document.createElement('span');
    originalModalPriceSpan.style.textDecoration = 'line-through';
    originalModalPriceSpan.style.marginRight = '15px';
    originalModalPriceSpan.style.fontSize = '1.1em'; // Slightly smaller than current price
    originalModalPriceSpan.style.color = 'var(--color-medium-gray)';
    originalModalPriceSpan.textContent = formatPrice(originalPriceValue);
    modalProductPrice.appendChild(originalModalPriceSpan);

    const currentModalPriceSpan = document.createElement('span');
    currentModalPriceSpan.style.fontSize = '1.3em'; // Make current price slightly larger
    currentModalPriceSpan.style.fontWeight = 'bold';
    currentModalPriceSpan.textContent = formatPrice(currentPriceValue);
    modalProductPrice.appendChild(currentModalPriceSpan);
    // --- End Modal Price Display with Fake Discount ---


    // Display image or video
    updateProductMedia();

    // Show/hide gallery navigation (only if there are multiple images and no video)
    const hasMultipleImages = product.images && product.images.length > 1;
    galleryNavPrevButton.style.display = (hasMultipleImages && !product.video) ? 'block' : 'none';
    galleryNavNextButton.style.display = (hasMultipleImages && !product.video) ? 'block' : 'none';


    // Disable place order button if out of stock
    placeOrderButton.disabled = product.stock <= 0;
    placeOrderButton.textContent = product.stock > 0 ? 'Place Order' : 'Out of Stock';

    // --- Reviews Section (Front-end structure and real-time loading) ---
    let reviewsSection = document.querySelector('.product-reviews');
    if (!reviewsSection) {
        reviewsSection = document.createElement('div');
        reviewsSection.classList.add('product-reviews');
        reviewsSection.innerHTML = `
            <h4>Customer Reviews</h4>
            <div id="reviews-list" class="reviews-list">
                </div>
            <div class="review-form">
                <textarea id="review-comment" placeholder="Write your review..." rows="3"></textarea>
                <button id="submit-review-button" class="place-order-button">Submit Review</button>
            </div>
        `;
        document.querySelector('.product-details').appendChild(reviewsSection);
    } else {
        document.getElementById('reviews-list').innerHTML = '';
        document.getElementById('review-comment').value = '';
    }

    // Load reviews for the current product (real-time with Firebase)
    loadProductReviews(product.id);

    productModal.style.display = 'block';
}

function updateProductMedia() {
    if (currentProduct.video) {
        modalProductVideo.src = currentProduct.video;
        modalProductVideo.style.display = 'block';
        mainProductImage.style.display = 'none';
        modalProductVideo.load(); // Ensure video loads
    } else {
        mainProductImage.src = currentProduct.images && currentProduct.images.length > 0 ? currentProduct.images[currentImageIndex] : 'https://via.placeholder.com/400x300?text=No+Image';
        mainProductImage.alt = currentProduct.name;
        mainProductImage.style.display = 'block';
        modalProductVideo.style.display = 'none';
        modalProductVideo.pause(); // Pause any playing video
        modalProductVideo.removeAttribute('src'); // Remove src to reset video player
    }
}

// --- Image Gallery Navigation ---
galleryNavPrevButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent modal from closing if clicked on image
    if (currentProduct && currentProduct.images && currentProduct.images.length > 1) {
        currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
        updateProductMedia();
    }
});

galleryNavNextButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent modal from closing if clicked on image
    if (currentProduct && currentProduct.images && currentProduct.images.length > 1) {
        currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
        updateProductMedia();
    }
});

// --- Image Preview Logic ---
mainProductImage.addEventListener('click', () => {
    if (mainProductImage.style.display === 'block' && mainProductImage.src) {
        enlargedProductImage.src = mainProductImage.src;
        imagePreviewModal.style.display = 'flex';
    }
});

closeImagePreviewBtn.addEventListener('click', () => {
    imagePreviewModal.style.display = 'none';
});


// --- Order Modal Logic ---
placeOrderButton.addEventListener('click', () => {
    closeAllModals(); // Close product modal
    orderModal.style.display = 'block';
    codNameInput.value = '';
    codPhoneInput.value = '';
    codAddressInput.value = '';
});

confirmCodOrderButton.addEventListener('click', async () => {
    const name = codNameInput.value.trim();
    const phone = codPhoneInput.value.trim();
    const address = codAddressInput.value.trim();

    if (!name || !phone || !address) {
        await showCustomAlert('Missing Information', 'Please fill in all delivery details.');
        return;
    }

    const orderDetails = {
        product: currentProduct.name,
        productId: currentProduct.id,
        customerName: name,
        customerPhone: phone,
        deliveryAddress: address,
        price: currentProduct.price,
        orderDate: serverTimestamp() // Use Firebase server timestamp for consistency
    };

    try {
        // Save order details to Firebase Realtime Database
        await push(ref(database, 'orders'), orderDetails);

        await showCustomAlert('Order Confirmed!', 'Your order has been placed successfully. You will be contacted soon.');
        closeAllModals(); // Close order modal

        // --- Trigger Rating Modal after Order Confirmation ---
        openRatingModal(currentProduct);

        // Optionally, reduce stock (client-side simulation, ideally updated via backend)
        const productRef = ref(database, `products/${currentProduct.id}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
            const currentStock = snapshot.val().stock || 0;
            if (currentStock > 0) {
                await update(productRef, { stock: currentStock - 1 });
            }
        }

    } catch (error) {
        console.error('Error placing order:', error);
        await showCustomAlert('Order Failed', 'There was an error placing your order. Please try again.');
    }
});

// --- Rating System Logic (User Input for Analytics) ---

function openRatingModal(product) {
    ratingProductTitle.textContent = product.name;
    userSelectedRating = 0; // Reset user selected rating
    displayRatingStars(ratingStarsContainer, userSelectedRating); // Clear stars

    // Add event listeners for rating selection
    ratingStarsContainer.addEventListener('mouseover', handleRatingMouseOver);
    ratingStarsContainer.addEventListener('mouseout', handleRatingMouseOut);
    ratingStarsContainer.addEventListener('click', handleRatingClick);

    ratingModal.style.display = 'block';
}

function handleRatingMouseOver(e) {
    const star = e.target.closest('.fa-star');
    if (star) {
        const rating = parseInt(star.dataset.rating);
        displayRatingStars(ratingStarsContainer, rating);
    }
}

function handleRatingMouseOut() {
    displayRatingStars(ratingStarsContainer, userSelectedRating); // Revert to selected rating
}

function handleRatingClick(e) {
    const star = e.target.closest('.fa-star');
    if (star) {
        userSelectedRating = parseInt(star.dataset.rating);
        displayRatingStars(ratingStarsContainer, userSelectedRating); // Solidify the selection
        // Remove mouseover/mouseout listeners after a star is clicked to prevent accidental changes
        ratingStarsContainer.removeEventListener('mouseover', handleRatingMouseOver);
        ratingStarsContainer.removeEventListener('mouseout', handleRatingMouseOut);
    }
}

submitRatingButton.addEventListener('click', async () => {
    if (userSelectedRating === 0) {
        await showCustomAlert('No Rating Selected', 'Please select a star rating before submitting.');
        return;
    }

    const ratingData = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        rating: userSelectedRating,
        timestamp: serverTimestamp(), // Use Firebase server timestamp
        // Potentially add userId if users are logged in (e.g., from Firebase Auth)
        userId: 'anonymous' // Placeholder for now
    };

    console.log('User Rating for Analytics:', ratingData);

    try {
        // Save this user-submitted rating to a separate path for analytics
        await push(ref(database, `userRatings/${currentProduct.id}`), ratingData);

        await showCustomAlert('Rating Submitted!', 'Thank you for your feedback!');
        closeAllModals();

    } catch (error) {
        console.error('Error submitting rating:', error);
        await showCustomAlert('Submission Failed', 'Could not submit your rating. Please try again.');
    } finally {
        // Always remove event listeners for a clean state, especially click listener
        ratingStarsContainer.removeEventListener('mouseover', handleRatingMouseOver);
        ratingStarsContainer.removeEventListener('mouseout', handleRatingMouseOut);
        ratingStarsContainer.removeEventListener('click', handleRatingClick);
    }
});


// --- Review System Logic (Real-time with Firebase) ---

async function loadProductReviews(productId) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return; // Ensure element exists

    reviewsList.innerHTML = 'Loading reviews...'; // Show loading state

    // Detach any existing listener before attaching a new one for the current product
    if (currentReviewsListenerOff) {
        currentReviewsListenerOff();
    }

    // Attach a real-time listener to Firebase for reviews of this specific product
    const reviewsRef = ref(database, `productReviews/${productId}`);
    currentReviewsListenerOff = onValue(reviewsRef, (snapshot) => {
        reviewsList.innerHTML = ''; // Clear previous reviews
        const reviewsData = snapshot.val();
        const reviewsArray = [];

        if (reviewsData) {
            for (const key in reviewsData) {
                reviewsArray.push({ id: key, ...reviewsData[key] });
            }
        }

        if (reviewsArray.length === 0) {
            reviewsList.innerHTML = '<p>No reviews yet. Be the first to comment!</p>';
        } else {
            // Sort reviews by timestamp, newest first
            reviewsArray.sort((a, b) => {
                // Handle cases where timestamp might be a string or object (serverTimestamp resolves to a number)
                const timeA = typeof a.timestamp === 'object' && a.timestamp !== null ? a.timestamp.valueOf() : a.timestamp;
                const timeB = typeof b.timestamp === 'object' && b.timestamp !== null ? b.timestamp.valueOf() : b.timestamp;
                return timeB - timeA;
            });

            reviewsArray.forEach(review => {
                const reviewDiv = document.createElement('div');
                reviewDiv.classList.add('review-item');

                // Ensure review.timestamp exists before trying to format
                const date = review.timestamp ? new Date(review.timestamp).toLocaleDateString() : 'N/A';
                const time = review.timestamp ? new Date(review.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; // e.g., "10:30 AM"

                reviewDiv.innerHTML = `
                    <p class="review-user"><strong>${review.user || 'Anonymous'}</strong> <span class="review-date">${date} ${time}</span></p>
                    <p class="review-comment">${review.comment}</p>
                `;
                reviewsList.appendChild(reviewDiv);
            });
        }
    }, (error) => {
        console.error('Error loading reviews from Firebase:', error);
        reviewsList.innerHTML = '<p>Could not load reviews. Please try again later.</p>';
    });
}

// Event listener for submitting a new review
document.addEventListener('click', async (e) => {
    if (e.target.id === 'submit-review-button') {
        const reviewCommentInput = document.getElementById('review-comment');
        const comment = reviewCommentInput.value.trim();

        if (!comment) {
            await showCustomAlert('Empty Comment', 'Please write something before submitting your review.');
            return;
        }

        if (!currentProduct) {
            console.error('No product selected for review submission.');
            await showCustomAlert('Error', 'Could not submit review. Please select a product first.');
            return;
        }

        const reviewData = {
            productId: currentProduct.id,
            comment: comment,
            user: 'Anonymous User', // In a real app, integrate Firebase Auth to get the actual user name/ID
            timestamp: serverTimestamp() // Use Firebase server timestamp for consistency
        };

        try {
            // Push the new review to the specific product's reviews path in Firebase
            await push(ref(database, `productReviews/${currentProduct.id}`), reviewData);

            reviewCommentInput.value = ''; // Clear the input field
            await showCustomAlert('Review Submitted!', 'Your review has been added.');

        } catch (error) {
            console.error('Error submitting review to Firebase:', error);
            await showCustomAlert('Submission Failed', 'Could not submit your review. Please try again.');
        }
    }
});


// --- Initial Load: Fetch Products from Firebase ---
document.addEventListener('DOMContentLoaded', () => {
    const productsRef = ref(database, 'products'); // Listen to the 'products' node in your database

    onValue(productsRef, (snapshot) => {
        products = []; // Clear current products array
        const productsData = snapshot.val();

        if (productsData) {
            for (const key in productsData) {
                // Ensure 'images' and 'price' properties are handled
                const product = { id: key, ...productsData[key] };
                // Ensure images is an array, even if single string or null
                if (typeof product.images === 'string') {
                    product.images = [product.images];
                } else if (!Array.isArray(product.images)) {
                    product.images = [];
                }
                products.push(product);
            }
        }
        displayProducts(products); // Display fetched products
        filterProducts(); // Apply any initial search/category filters
    }, (error) => {
        console.error("Error fetching products from Firebase:", error);
        productContainer.innerHTML = '<p>Error loading products. Please check your Firebase connection and database rules.</p>';
    });
});

// --- Event Listeners ---
searchBar.addEventListener('keyup', filterProducts);

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        filterProducts();
    });
});

closeButtons.forEach(button => {
    button.addEventListener('click', closeAllModals);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === productModal || e.target === orderModal || e.target === ratingModal || e.target === customAlertModal || e.target === imagePreviewModal) {
        closeAllModals();
    }
});
/* style.css */

/* Add this to your existing style.css */

/* --- Product Prices (Fake Discount Styling) --- */
.product-prices {
    margin-top: 5px;
    display: flex; /* Use flexbox for alignment */
    align-items: baseline; /* Align prices at their baseline */
    justify-content: center; /* Center horizontally in the card */
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

.product-card .product-prices {
    font-size: 1.1em; /* Slightly larger font for prices on cards */
}

.original-price {
    color: var(--color-medium-gray); /* Subdued color for the old price */
    text-decoration: line-through; /* Strikethrough effect */
    margin-right: 8px; /* Space between original and current price */
    font-size: 0.9em; /* Slightly smaller font size for original price */
}

.current-price {
    color: var(--color-dark-gray); /* Prominent color for the current price */
    font-weight: 700; /* Bold font for current price */
    font-size: 1.1em; /* Emphasize the current price */
}

/* Styling for prices within the product modal (adjust as needed) */
#modal-product-price {
    font-size: 1.6em; /* Larger font for prices in the modal */
    font-weight: bold;
    display: flex; /* Use flexbox for alignment in modal */
    align-items: baseline;
    margin-top: 15px;
    margin-bottom: 15px;
}

#modal-product-price .original-price {
    font-size: 0.8em; /* Original price smaller in modal */
    margin-right: 15px; /* More space in modal */
}

#modal-product-price .current-price {
    font-size: 1em; /* Current price normal size in modal relative to container */
}

/* Existing styles for the product card price (you can remove or adjust if it conflicts with .product-prices) */
/*
.product-price {
    font-size: 1.2em;
    color: var(--color-dark-gray);
    margin-top: 10px;
    font-weight: bold;
}
*/
