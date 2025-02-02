// Function to fetch CSV data
async function fetchCSV() {
    try {
        const response = await fetch('http://localhost:5000/data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const products = await response.json();
        console.log('Fetched products:', products.slice(0, 2)); // Log first two products
        return products;
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load products. Please try again later.'); // User-friendly error message
        return [];
    }
}

// Function to organize products by category
function organizeProductsByCategory(products) {
    const categories = {};

    products.forEach((product) => {
        if (!product['Product Category']) {
            console.error('Missing Product Category for product:', product);
            return;
        }

        // Split the category and keep only the first two levels
        const categoryPath = product['Product Category'].split(' > ').slice(0, 2);
        let currentLevel = categories;

        categoryPath.forEach((category, index) => {
            if (!currentLevel[category]) {
                currentLevel[category] = {
                    products: [],
                    subCategories: {},
                };
            }
            if (index === categoryPath.length - 1) {
                currentLevel[category].products.push(product);
            } else {
                currentLevel = currentLevel[category].subCategories;
            }
        });
    });

    console.log('Organized categories:', JSON.stringify(categories, null, 2)); // Log final category structure
    return categories;
}

// Function to populate category menu
function populateCategoryMenu(categories) {
    const categoryList = document.getElementById('category-list');

    for (const category in categories) {
        const li = document.createElement('li');
        li.textContent = category;

        const subMenu = document.createElement('ul');
        for (const subCategory in categories[category].subCategories) {
            const subLi = document.createElement('li');
            subLi.textContent = subCategory;
            subLi.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent event bubbling
                displayProducts(categories[category].subCategories[subCategory].products); // Show all products in the subcategory
            });
            subMenu.appendChild(subLi);
        }

        li.appendChild(subMenu);
        li.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event bubbling
            displaySubcategoryProducts(categories[category]); // Show 3 products from each subcategory
        });

        categoryList.appendChild(li);
    }
}

// Function to display 3 products from each subcategory when a category is selected
function displaySubcategoryProducts(category) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    for (const subCategory in category.subCategories) {
        const subCategoryHeader = document.createElement('h3');
        subCategoryHeader.className = 'subcategory-header'; // Add class for styling
        subCategoryHeader.textContent = subCategory; // Display subcategory name
        productList.appendChild(subCategoryHeader);

        const limitedProducts = category.subCategories[subCategory].products.slice(0, 3); // Get up to 3 products

        const productRow = document.createElement('div');
        productRow.style.display = 'flex'; // Use flexbox for product alignment
        productRow.style.justifyContent = 'center'; // Center align products
        productRow.style.flexWrap = 'wrap'; // Allow wrapping

        limitedProducts.forEach((product) => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product';

            // Get the first image URL, if there are multiple
            const imageUrls = product['Product Image Url'].split('|');
            const firstImageUrl = imageUrls[0].trim(); // Take the first image and trim any whitespace

            productDiv.innerHTML = `
                <img src="${firstImageUrl}" alt="${product['Product Name'] || 'Product Name Not Available'}" 
                     onerror="this.src='placeholder-image.jpeg'">
                <h2>${product['Product Name'] || 'Product Name Not Available'}</h2>
            `;

            productDiv.addEventListener('click', () => {
                displayProductDetail(product);
            });

            productRow.appendChild(productDiv);
        });

        productList.appendChild(productRow); // Append the row of products
    }
}

// Function to display products
function displayProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    if (!Array.isArray(products) || products.length === 0) {
        productList.innerHTML = '<p class="no-products">No products found in this category.</p>';
        return;
    }

    products.forEach((product) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';

        // Get the first image URL, if there are multiple
        const imageUrls = product['Product Image Url'].split('|');
        const firstImageUrl = imageUrls[0].trim(); // Take the first image and trim any whitespace

        productDiv.innerHTML = `
            <img src="${firstImageUrl}" alt="${product['Product Name'] || 'Product Name Not Available'}" 
                 onerror="this.src='placeholder-image.jpeg'">
            <h2>${product['Product Name'] || 'Product Name Not Available'}</h2>
        `;

        productDiv.addEventListener('click', () => {
            displayProductDetail(product);
        });

        productList.appendChild(productDiv);
    });
}

let recentlyViewed = []; // Array to store recently viewed product IDs

// Function to display product details
function displayProductDetail(product) {
    const productDetail = document.getElementById('product-detail');
    const productBrand = product['Product Brand'] || 'Brand Not Available';
    const productPrice = parseFloat(product['Product Price'] || 0).toFixed(2);
    const productRating = product['Product Rating'] || 'No Rating';
    const productReviewsCount = product['Product Reviews Count'] || '0';
    const productDescription = product['Product Description'] || 'No description available.';

    productDetail.innerHTML = `
        <h2>${product['Product Name'] || 'Product Name Not Available'}</h2>
        <img src="${product['Product Image Url'].split('|')[0].trim() || 'placeholder-image.jpeg'}" 
             alt="${product['Product Name'] || 'Product Name Not Available'}" 
             onerror="this.src='placeholder-image.jpeg'">
        <p><strong>Brand:</strong> ${productBrand}</p>
        <p><strong>Price:</strong> $${productPrice}</p>
        <p><strong>Rating:</strong> ${productRating} (${productReviewsCount} reviews)</p>
        <p>${productDescription}</p>
        <button onclick="closeProductDetail()">Close</button>
        <div id="recommendations-section">
            <div id="content-based-recommendations" class="recommendation-row"></div>
            <div id="hybrid-recommendations" class="recommendation-row"></div>
            <div id="previously-viewed-recommendations" class="recommendation-row"></div>
        </div>
    `;
    productDetail.style.display = 'block';

    // Fetch recommendations based on the clicked product ID
    fetchRecommendations(product['Product Id']);
}

// Function to fetch recommendations and their details
async function fetchRecommendations(productId) {
    try {
        const response = await fetch(`http://localhost:5000/recommendations/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }
        const recommendations = await response.json();
        console.log('Fetched recommendations:', recommendations);

        // Fetch details for each type of recommendation
        const contentBasedDetails = await Promise.all(
            recommendations.content_based.map((id) => fetchProductDetails(id))
        );
        const hybridDetails = await Promise.all(
            recommendations.hybrid.map((id) => fetchProductDetails(id))
        );
        const prevViewedDetails = await Promise.all(
            recommendations.prev_viewed.map((id) => fetchProductDetails(id))
        );

        // Display all recommendations
        displayRecommendations(contentBasedDetails, hybridDetails, prevViewedDetails);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        alert('Failed to load recommendations. Please try again later.');
    }
}

// Function to fetch product details by ID
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`http://localhost:5000/data/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null; // Return null if there's an error
    }
}

// Function to display recommendations
// Update the displayRecommendations function to handle empty previously viewed section
function displayRecommendations(contentBased, hybrid, prevViewed) {
    const sections = [
        {
            id: 'content-based-recommendations',
            title: 'Similar to this:',
            data: contentBased.filter(Boolean),
        },
        {
            id: 'hybrid-recommendations',
            title: 'You might also like:',
            data: hybrid.filter(Boolean),
        },
        {
            id: 'previously-viewed-recommendations',
            title: 'Based on your viewing history:',
            data: prevViewed.filter(Boolean),
        },
    ];

    sections.forEach((section) => {
        const container = document.getElementById(section.id);
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add title
        const titleElement = document.createElement('h3');
        titleElement.textContent = section.title;
        container.appendChild(titleElement);

        // Only show arrows and products if we have data
        if (Array.isArray(section.data) && section.data.length > 0) {
            // Add arrow container
            const arrowContainer = document.createElement('div');
            arrowContainer.className = 'arrow-container';
            arrowContainer.innerHTML = `
                <button class="arrow" onclick="scrollContent(this.parentElement.nextElementSibling, -200)">←</button>
                <button class="arrow" onclick="scrollContent(this.parentElement.nextElementSibling, 200)">→</button>
            `;
            container.appendChild(arrowContainer);

            // Add product container
            const productContainer = document.createElement('div');
            productContainer.className = 'product-container';

            // Add products
            section.data.forEach((product) => {
                if (product) {
                    productContainer.appendChild(createClickableProductElement(product));
                }
            });

            container.appendChild(productContainer);
        } else if (section.id === 'previously-viewed-recommendations') {
            // Special handling for empty previously viewed section
            const noProducts = document.createElement('p');
            noProducts.textContent = 'Start browsing to get personalized recommendations based on your viewing history!';
            noProducts.className = 'no-recommendations';
            container.appendChild(noProducts);
        }
    });
}

// Function to create a clickable product element
function createClickableProductElement(product) {
    const productDiv = document.createElement('div');
    productDiv.className = 'recommendation-product';

    if (!product || typeof product !== 'object') {
        console.error('Invalid product data:', product);
        return null;
    }

    const imageUrls = (product['Product Image Url'] || '').split('|');
    const firstImageUrl = imageUrls[0]?.trim() || 'placeholder-image.jpeg';
    // Ensure product name doesn't exceed reasonable length
    const productName = (product['Product Name'] || 'Product Name Not Available')
        .slice(0, 50); // Limit to 50 characters
    const productPrice = parseFloat(product['Product Price'] || 0).toFixed(2);

    productDiv.innerHTML = `
        <img src="${firstImageUrl}" 
             alt="${productName}" 
             onerror="this.src='placeholder-image.jpeg'">
        <h4>${productName}</h4>
        <p><strong>$${productPrice}</strong></p>
    `;

    productDiv.addEventListener('click', () => {
        displayProductDetail(product);
    });

    return productDiv;
}

// Function to scroll content
function scrollContent(container, amount) {
    if (container) {
        container.scrollBy({
            left: amount,
            behavior: 'smooth',
        });
    }
}

// Function to add navigation arrows
function addNavigationArrows(container) {
    const arrowContainer = document.createElement('div');
    arrowContainer.className = 'arrow-container';
    arrowContainer.innerHTML = `
        <button class="arrow left-arrow" onclick="scrollLeft(this)">&#9664;</button>
        <button class="arrow right-arrow" onclick="scrollRight(this)">&#9654;</button>
    `;
    container.prepend(arrowContainer);
}

function scrollLeft(button) {
    const container = button.parentElement.nextElementSibling;
    container.scrollBy({ left: -container.clientWidth / 2, behavior: 'smooth' });
}

function scrollRight(button) {
    const container = button.parentElement.nextElementSibling;
    container.scrollBy({ left: container.clientWidth / 2, behavior: 'smooth' });
}

// Function to close product detail
function closeProductDetail() {
    const productDetail = document.getElementById('product-detail');
    productDetail.style.display = 'none';
}

// Function to handle search functionality
function handleSearch() {
    const searchInput = document.getElementById('search-box').value.toLowerCase();
    const productList = document.getElementById('product-list');
    const products = Array.from(productList.getElementsByClassName('product'));

    products.forEach((productDiv) => {
        const productName = productDiv.querySelector('h2').textContent.toLowerCase();
        if (productName.includes(searchInput)) {
            productDiv.style.display = 'block'; // Show matching product
        } else {
            productDiv.style.display = 'none'; // Hide non-matching product
        }
    });
}

// Function to display random products
function displayRandomProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    // Shuffle products and take the first 15
    const shuffledProducts = products.sort(() => 0.5 - Math.random()).slice(0, 15);

    shuffledProducts.forEach((product) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';

        // Get the first image URL, if there are multiple
        const imageUrls = product['Product Image Url'].split('|');
        const firstImageUrl = imageUrls[0].trim(); // Take the first image and trim any whitespace

        productDiv.innerHTML = `
            <img src="${firstImageUrl}" alt="${product['Product Name'] || 'Product Name Not Available'}" 
                 onerror="this.src='placeholder-image.jpeg'">
            <h2>${product['Product Name'] || 'Product Name Not Available'}</h2>
        `;

        productDiv.addEventListener('click', () => {
            displayProductDetail(product);
        });

        productList.appendChild(productDiv);
    });
}

// Main function to initialize the app
async function init() {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading';
    loadingElement.textContent = 'Loading products...';
    document.body.appendChild(loadingElement);

    try {
        const products = await fetchCSV();
        const categories = organizeProductsByCategory(products);
        populateCategoryMenu(categories);
        displayRandomProducts(products); // Show random products on homepage
    } catch (error) {
        console.error('Error initializing the app:', error);
        alert('Failed to load products. Please try again later.'); // User-friendly error message
    } finally {
        document.body.removeChild(loadingElement);
    }
}

// Add event listener for search box
document.getElementById('search-box').addEventListener('input', handleSearch);

document.addEventListener('DOMContentLoaded', init);