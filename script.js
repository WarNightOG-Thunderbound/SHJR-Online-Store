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

// Global variables
const productModal = document.getElementById('product-modal');
const orderModal = document.getElementById('order-modal');
const ratingModal = document.getElementById('rating-modal'); // New rating modal
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

// Rating modal elements
const ratingProductTitleSpan = document.getElementById('rating-product-title');
const ratingStarsContainer = document.getElementById('rating-stars-container');
const submitRatingButton = document.getElementById('submit-rating-button');

let currentProduct = null;
let currentOrderId = null; // To link rating to an order
let selectedRating = 0; // Stores the user's selected rating
let allProducts = {}; // Store all products fetched from Firebase

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

        // Calculate average rating for display
        const averageRating = product.numberOfRatings > 0 ? (product.totalStarsSum / product.numberOfRatings).toFixed(1) : 'N/A';
        const ratingStarsHtml = product.numberOfRatings > 0 ?
            `<div class="product-card-rating">
                <i class="fa-solid fa-star" style="color: var(--color-warning-yellow);"></i> ${averageRating} (${product.numberOfRatings} ratings)
            </div>` :
            `<div class="product-card-rating">No ratings yet</div>`;


        productCard.innerHTML = `
            <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200.png?text=No+Image'}" alt="${product.title}">
            <div class="product-info">
                <h3>${product.title}</h3>
                <p class="product-brand-card"><strong>Brand:</strong> ${product.brand || 'N/A'}</p>
                <p>${product.description.substring(0, 80)}...</p>
                <p class="price">PKR ${product.price.toLocaleString()}</p>
                ${ratingStarsHtml}
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
    showAlert('Could not load products. Please try again later.', 'Error');
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
        if (product.videoUrl.includes("watch?v=")) {
            embedUrl = product.videoUrl.replace("watch?v=", "embed/");
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
        ratingModal.style.display = 'none'; // Close rating modal
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
    if (event.target === ratingModal) { // Close rating modal on outside click
        ratingModal.style.display = 'none';
    }
});

// --- Place Order Button in Product Modal ---
placeOrderButton.addEventListener('click', () => {
    if (!currentProduct) {
        showAlert("Error: Product details not loaded. Please try again.", "Error");
        return;
    }
    if (currentProduct.stock === 0) {
        showAlert("Sorry, this product is currently out of stock.", "Out of Stock");
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
        showAlert('Please fill in all delivery details.', 'Missing Details');
        return;
    }
    if (!/^(03\d{2}[-\s]?\d{7})$/.test(phone) && !/^(03\d{9})$/.test(phone)) {
         showAlert('Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX or 03XXXXXXXXX).', 'Invalid Phone');
        return;
    }

    if (!currentProduct) {
        showAlert('Error: No product selected. Please close this form and select a product.', 'Error');
        return;
    }
     if (currentProduct.stock === 0) {
        showAlert("Sorry, this product just went out of stock.", "Out of Stock");
        orderModal.style.display = 'none';
        codForm.style.display = 'none';
        return;
    }


    confirmCodOrderButton.disabled = true;
    confirmCodOrderButton.textContent = 'Processing...';

    try {
        const newOrderRef = push(ref(database, 'orders'));
        currentOrderId = newOrderRef.key; // Store order ID for rating
        await set(newOrderRef, {
            id: currentOrderId,
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

        await showAlert(`Order for "${currentProduct.title}" placed successfully! We will contact you soon for delivery.`, 'Order Placed!');
        orderModal.style.display = 'none';
        codForm.style.display = 'none';

        codNameInput.value = '';
        codPhoneInput.value = '';
        codAddressInput.value = '';

        // Open the rating modal after successful order
        openRatingModal(currentProduct);

    } catch (error) {
        console.error("Error placing order: ", error);
        showAlert("Failed to place order. Please try again. Error: " + error.message, "Order Failed");
    } finally {
        confirmCodOrderButton.disabled = false;
        confirmCodOrderButton.textContent = 'Confirm Order (Cash on Delivery)';
    }
});

// --- Rating System Logic ---
function openRatingModal(product) {
    ratingProductTitleSpan.textContent = product.title;
    selectedRating = 0; // Reset selected rating
    updateStarDisplay(); // Reset star visuals
    ratingModal.style.display = 'flex';
}

ratingStarsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('fa-star')) {
        selectedRating = parseInt(event.target.dataset.rating);
        updateStarDisplay();
    }
});

function updateStarDisplay() {
    const stars = ratingStarsContainer.querySelectorAll('.fa-star');
    stars.forEach(star => {
        const ratingValue = parseInt(star.dataset.rating);
        if (ratingValue <= selectedRating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

submitRatingButton.addEventListener('click', async () => {
    if (selectedRating === 0) {
        showAlert('Please select a star rating before submitting.', 'No Rating Selected');
        return;
    }

    submitRatingButton.disabled = true;
    submitRatingButton.textContent = 'Submitting...';

    try {
        // 1. Save individual rating to 'ratings' node
        const newRatingRef = push(ref(database, 'ratings'));
        await set(newRatingRef, {
            productId: currentProduct.id,
            orderId: currentOrderId, // Link to the order
            stars: selectedRating,
            timestamp: serverTimestamp()
        });

        // 2. Update product's aggregate rating in 'products' node
        const productRef = ref(database, 'products/' + currentProduct.id);
        const snapshot = await get(productRef);
        const productData = snapshot.val();

        if (productData) {
            const oldTotalStarsSum = productData.totalStarsSum || 0;
            const oldNumberOfRatings = productData.numberOfRatings || 0;

            const newTotalStarsSum = oldTotalStarsSum + selectedRating;
            const newNumberOfRatings = oldNumberOfRatings + 1;
            const newAverageRating = newTotalStarsSum / newNumberOfRatings;

            await update(productRef, {
                totalStarsSum: newTotalStarsSum,
                numberOfRatings: newNumberOfRatings,
                averageRating: newAverageRating.toFixed(2) // Store as string with 2 decimal places
            });
        } else {
            // This case should ideally not happen if product was just ordered
            console.warn("Product not found when updating rating aggregates.");
        }

        await showAlert('Thank you for your rating!', 'Rating Submitted');
        ratingModal.style.display = 'none';
        currentProduct = null; // Clear current product after rating
        currentOrderId = null; // Clear current order ID
        selectedRating = 0; // Reset rating

    } catch (error) {
        console.error("Error submitting rating: ", error);
        showAlert("Failed to submit rating. Please try again. Error: " + error.message, "Rating Failed");
    } finally {
        submitRatingButton.disabled = false;
        submitRatingButton.textContent = 'Submit Rating';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const homeView = document.getElementById('home-view');
    const supportView = document.getElementById('support-view');
    const supportNavLink = document.getElementById('support-nav-link');
    const backToHomeButton = document.getElementById('back-to-home');
    const navLinks = document.querySelectorAll('.nav-link'); // Select all other nav links

    function showView(viewToShow, viewToHide) {
        viewToHide.style.display = 'none';
        viewToShow.style.display = 'block'; // Or 'flex' if you use flexbox for its internal layout
    }

    // Event listener for the "Support" navigation link
    if (supportNavLink) {
        supportNavLink.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior (like jumping to #)
            showView(supportView, homeView);
            window.scrollTo(0, 0); // Scroll to top when switching view
        });
    }

    // Event listener for the "Back" button within the Support view
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            showView(homeView, supportView);
            window.scrollTo(0, 0); // Scroll to top when switching back
        });
    }

}); // This closes the document.addEventListener('DOMContentLoaded' block
// In script.js, usually at the end of your script where other event listeners are.

// Get references to the new modal elements
const imagePreviewModal = document.getElementById('image-preview-modal');
const enlargedProductImage = document.getElementById('enlarged-product-image');
const closeImagePreviewBtn = document.getElementById('close-image-preview-btn');

// --- Event Listeners for Image Preview Modal ---

// Function to open the image preview modal
function openImagePreviewModal(imageSrc) {
    enlargedProductImage.src = imageSrc;
    imagePreviewModal.style.display = 'flex'; // Use flex to center the modal
}

// Function to close the image preview modal
function closeImagePreviewModal() {
    imagePreviewModal.style.display = 'none';
    enlargedProductImage.src = ''; // Clear the image source
}

// Event listener for the close button
closeImagePreviewBtn.addEventListener('click', closeImagePreviewModal);

// Close modal if user clicks outside the content (on the overlay)
imagePreviewModal.addEventListener('click', (event) => {
    if (event.target === imagePreviewModal) {
        closeImagePreviewModal();
    }
});

// --- Handling Product Image Clicks within the Product Details Modal ---

// This part needs to be integrated into your existing product modal display logic.
// Assuming your product images are within a container like:
// <div class="product-images" id="product-images-container">
//    <img src="img1.jpg" class="product-image" alt="...">
//    <img src="img2.jpg" class="product-image" alt="...">
// </div>

// Get the container for product images within your main product modal
const productImagesContainer = document.getElementById('product-images-container'); // You might need to add this ID to your HTML

if (productImagesContainer) {
    productImagesContainer.addEventListener('click', (event) => {
        const clickedImage = event.target;

        // Check if the clicked element is an image with the 'product-image' class
        if (clickedImage.tagName === 'IMG' && clickedImage.classList.contains('product-image')) {
            // Remove 'selected-image' class from all other images
            document.querySelectorAll('.product-images .product-image').forEach(img => {
                img.classList.remove('selected-image');
            });

            // Add 'selected-image' class to the clicked image
            clickedImage.classList.add('selected-image');

            // Open the image preview modal with the clicked image's source
            openImagePreviewModal(clickedImage.src);
        }
    });
}


// --- Important: How product images are populated ---
// When you populate your `product-modal` with product details,
// make sure the images are given the class `product-image`.
// Example of how you might populate images (adapt to your code):
/*
function showProductDetails(product) {
    // ... other product details ...

    const imagesHtml = product.images.map(imgUrl => `
        <img src="${imgUrl}" class="product-image" alt="${product.title}">
    `).join('');

    // Assuming you have a div with id="product-images-container" inside your product modal
    document.getElementById('product-images-container').innerHTML = imagesHtml;

    // Show the product modal
    productModal.style.display = 'flex'; // or 'block'
}
*/
