// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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
// Add this to your existing script.js file

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
// --- Cart System Elements ---
const cartIcon = document.getElementById('cart-icon');
const cartCountEl = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartCloseButton = document.getElementById('cart-close-button');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalEl = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');

let userCart = {}; // Stores items in the current user's cart

// --- Cart Functions ---

function saveCartToLocalStorage() {
    localStorage.setItem('userCart', JSON.stringify(userCart));
}

function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('userCart');
    if (storedCart) {
        userCart = JSON.parse(storedCart);
        updateCartUI();
    }
}

function addToCart(product) {
    if (userCart[product.id]) {
        userCart[product.id].quantity += 1;
    } else {
        userCart[product.id] = {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200.png?text=No+Image',
            quantity: 1
        };
    }
    saveCartToLocalStorage();
    updateCartUI();
    alert(`${product.title} added to cart!`);
}

function removeFromCart(productId) {
    if (userCart[productId]) {
        delete userCart[productId];
        saveCartToLocalStorage();
        updateCartUI();
    }
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (Object.keys(userCart).length === 0) {
        cartItemsContainer.innerHTML = '<p class="no-items-message">Your cart is empty.</p>';
        cartTotalEl.textContent = '0';
        cartCountEl.textContent = '0';
        return;
    }

    Object.values(userCart).forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('cart-item');
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
            <div class="cart-item-details">
                <h4>${item.title}</h4>
                <p>Quantity: ${item.quantity}</p>
            </div>
            <p class="cart-item-price">PKR ${item.price.toLocaleString()}</p>
            <button class="remove-from-cart-btn" data-product-id="${item.id}"><i class="fas fa-trash"></i></button>
        `;
        cartItemsContainer.appendChild(itemElement);

        total += item.price * item.quantity;
        itemCount += item.quantity;
    });

    cartTotalEl.textContent = total.toLocaleString();
    cartCountEl.textContent = itemCount;

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.currentTarget.dataset.productId;
            removeFromCart(productId);
        });
    });
}

// --- Checkout Logic (sends cart to Firebase orders) ---
checkoutButton.addEventListener('click', async () => {
    if (Object.keys(userCart).length === 0) {
        alert('Your cart is empty. Please add items before checking out.');
        return;
    }

    const confirmCheckout = confirm('Are you sure you want to proceed to checkout with these items?');
    if (!confirmCheckout) return;

    try {
        const orderRef = push(ref(database, 'cartOrders')); // Use a new node for cart orders
        const newOrder = {
            items: userCart,
            totalAmount: parseFloat(cartTotalEl.textContent.replace(/,/g, '')),
            orderDate: new Date().toISOString(),
            status: 'pending', // Initial status
            // You might want to add user details here if you implement user authentication
            // userId: "...",
            // userName: "...",
            // userEmail: "..."
        };
        await set(orderRef, newOrder);
        alert('Your order has been placed! We will contact you soon.');
        userCart = {}; // Clear cart after order
        saveCartToLocalStorage();
        updateCartUI();
        cartModal.style.display = 'none'; // Close cart modal
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Failed to place order. Please try again.');
    }
});

// --- Event Listeners for Cart Modal ---
cartIcon.addEventListener('click', () => {
    cartModal.style.display = 'block';
    updateCartUI(); // Ensure UI is updated when opening
});

cartCloseButton.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Add to cart button in product modal (modify openProductModal to include this)
// FIND THE openProductModal function and add this line inside it:
// placeOrderButton.textContent = 'Add to Cart';
// placeOrderButton.removeEventListener('click', confirmCodOrder); // Remove old listener
// placeOrderButton.addEventListener('click', () => {
//     addToCart(product);
//     productModal.style.display = 'none'; // Close modal after adding to cart
// });
// Or, create a separate "Add to Cart" button in your product modal HTML and attach this:
// Example modification for openProductModal:
// (You'll need to manually integrate this into your existing openProductModal function)
// function openProductModal(product) {
//     currentProduct = product;
//     document.getElementById('modal-product-title').textContent = product.title;
//     document.getElementById('modal-product-brand').textContent = product.brand || 'N/A';
//     document.getElementById('modal-product-description').textContent = product.description;
//     document.getElementById('modal-product-stock').textContent = product.stock > 0 ? product.stock : 'Out of Stock';
//     document.getElementById('modal-product-price').textContent = `PKR ${product.price.toLocaleString()}`;
//     const productModalImage = document.getElementById('modal-product-image');
//     const productModalVideo = document.getElementById('modal-product-video');

//     // Display first image by default or video if available
//     if (product.images && product.images.length > 0) {
//         productModalImage.src = product.images[0];
//         productModalImage.style.display = 'block';
//         productModalVideo.style.display = 'none';
//     } else if (product.videoUrl) {
//         productModalVideo.src = product.videoUrl;
//         productModalVideo.style.display = 'block';
//         productModalImage.style.display = 'none';
//     } else {
//         productModalImage.src = 'https://via.placeholder.com/400x300.png?text=No+Image';
//         productModalImage.style.display = 'block';
//         productModalVideo.style.display = 'none';
//     }

//     // Add to Cart functionality
//     const addToCartBtn = document.getElementById('place-order-button'); // Assuming place-order-button will become add to cart
//     addToCartBtn.textContent = 'Add to Cart';
//     addToCartBtn.onclick = () => addToCart(product);
//     // Disable button if out of stock
//     addToCartBtn.disabled = product.stock <= 0;


//     productModal.style.display = 'block';
// }

// Initial cart load
loadCartFromLocalStorage();
// --- Product Ratings & Comments Elements ---
const averageRatingEl = document.getElementById('average-rating');
const starRatingDisplayEl = document.getElementById('star-rating-display');
const commentsListEl = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const ratingStars = document.querySelectorAll('.rating-input .star');
const ratingValueInput = document.getElementById('rating-value');
const commentUserNameInput = document.getElementById('comment-user-name');
const commentTextInput = document.getElementById('comment-text');

let selectedRating = 0;

// --- Rating Star Selection Logic ---
ratingStars.forEach(star => {
    star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.value);
        ratingValueInput.value = selectedRating;
        updateRatingStarsUI();
    });
    star.addEventListener('mouseover', () => {
        highlightStars(parseInt(star.dataset.value));
    });
    star.addEventListener('mouseout', () => {
        highlightStars(selectedRating); // Revert to selected rating
    });
});

function updateRatingStarsUI() {
    ratingStars.forEach(star => {
        if (parseInt(star.dataset.value) <= selectedRating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

function highlightStars(count) {
    ratingStars.forEach(star => {
        if (parseInt(star.dataset.value) <= count) {
            star.style.color = '#ffc107'; // Highlight color
        } else {
            star.style.color = 'var(--color-medium-gray)'; // Default color
        }
    });
}

// --- Submit Comment and Rating ---
commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProduct || selectedRating === 0) {
        alert('Please select a rating and ensure a product is selected.');
        return;
    }

    const userName = commentUserNameInput.value.trim() || 'Anonymous';
    const commentText = commentTextInput.value.trim();

    if (!commentText) {
        alert('Please write your review.');
        return;
    }

    try {
        const reviewRef = push(ref(database, `productReviews/${currentProduct.id}`));
        await set(reviewRef, {
            rating: selectedRating,
            comment: commentText,
            userName: userName,
            timestamp: serverTimestamp() // Firebase server timestamp
        });

        alert('Your review has been submitted!');
        commentForm.reset();
        selectedRating = 0;
        updateRatingStarsUI();
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
    }
});

// --- Load Ratings and Comments for a product ---
function loadProductReviews(productId) {
    const reviewsRef = ref(database, `productReviews/${productId}`);
    onValue(reviewsRef, (snapshot) => {
        const reviews = snapshot.val();
        commentsListEl.innerHTML = '';
        if (!reviews) {
            commentsListEl.innerHTML = '<p class="no-items-message">No reviews yet. Be the first to comment!</p>';
            averageRatingEl.textContent = 'No ratings yet.';
            starRatingDisplayEl.innerHTML = '';
            return;
        }

        let totalRating = 0;
        let reviewCount = 0;

        Object.values(reviews).forEach(review => {
            const commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');
            const reviewTimestamp = review.timestamp ? new Date(review.timestamp).toLocaleString() : 'N/A';
            commentItem.innerHTML = `
                <p><strong>${review.userName}</strong> rated
                    <span class="comment-stars">
                        ${'<span class="star">&#9733;</span>'.repeat(review.rating)}
                    </span>
                </p>
                <p>${review.comment}</p>
                <p class="comment-meta">On ${reviewTimestamp}</p>
            `;
            commentsListEl.appendChild(commentItem);

            totalRating += review.rating;
            reviewCount++;
        });

        const avgRating = (totalRating / reviewCount).toFixed(1);
        averageRatingEl.textContent = `Average Rating: ${avgRating} (${reviewCount} reviews)`;
        starRatingDisplayEl.innerHTML = '<span class="star">&#9733;</span>'.repeat(Math.round(avgRating)); // Display rounded stars for avg

        // Scroll to the bottom of the comments list
        commentsListEl.scrollTop = commentsListEl.scrollHeight;
    });
}

// Modify openProductModal to load reviews
// You will need to manually insert the call to loadProductReviews(product.id);
// inside your existing openProductModal function.
// For example:
// function openProductModal(product) {
//     // ... existing code ...
//     loadProductReviews(product.id); // Add this line
//     // ... existing code ...
// }
