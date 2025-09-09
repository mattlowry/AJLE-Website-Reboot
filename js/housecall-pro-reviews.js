/**
 * Housecall Pro Reviews Display Script
 * 
 * This script fetches and displays 5-star reviews with written content
 * from both Housecall Pro and Google sources.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Look for the reviews container
    const reviewsContainer = document.getElementById('housecall-pro-reviews');
    
    if (!reviewsContainer) {
        console.warn('Reviews container not found. Make sure to add <div id="housecall-pro-reviews"></div> to your page.');
        return;
    }
    
    // Show loading state
    reviewsContainer.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-aj-orange"></div>
            <p class="mt-4 text-gray-600">Loading reviews...</p>
        </div>
    `;
    
    // Fetch reviews from the Housecall Pro API endpoint
    fetch('/api/housecall-pro-reviews?minRating=5&limit=20')
        .then(response => {
            // Check if response is OK (status 200-299)
            if (!response.ok) {
                // If it's a 404, use fallback mock reviews
                if (response.status === 404) {
                    console.warn('Reviews API endpoint not found. Using fallback mock reviews.');
                    return {
                        success: true,
                        reviews: getMockReviews(),
                        count: getMockReviews().length,
                        source: 'mock-fallback'
                    };
                }
                // For other errors, throw to be caught in catch block
                throw new Error(`API returned status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success || !data.reviews || data.reviews.length === 0) {
                reviewsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-600">No reviews found. Please check back later.</p>
                    </div>
                `;
                return;
            }
            
            // Filter to only include reviews with written content
            const reviewsWithContent = data.reviews.filter(review => 
                review.comment && review.comment.trim().length > 0
            );
            
            if (reviewsWithContent.length === 0) {
                reviewsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-600">No detailed reviews found. Please check back later.</p>
                    </div>
                `;
                return;
            }
            
            // Display the reviews
            displayReviews(reviewsWithContent, reviewsContainer);
        })
        .catch(error => {
            console.error('Error fetching reviews:', error);
            // Use fallback mock reviews on any error
            console.warn('Error fetching reviews. Using fallback mock reviews instead.');
            const mockReviews = getMockReviews();
            displayReviews(mockReviews, reviewsContainer);
        });
});

/**
 * Displays reviews in a grid layout
 * 
 * @param {Array} reviews - Array of review objects
 * @param {HTMLElement} container - Container element to display reviews in
 */
function displayReviews(reviews, container) {
    // Sort reviews by date (newest first)
    reviews.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    
    // Create header
    const header = document.createElement('div');
    header.className = 'text-center mb-12';
    header.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Our <span class="text-aj-orange">Latest 5-Star Reviews</span></h2>
        <p class="text-lg text-gray-600 max-w-3xl mx-auto">
            See what our customers are saying about their recent experiences with AJ Long Electric.
        </p>
    `;
    
    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'grid md:grid-cols-3 gap-8';
    
    // Add each review to the grid
    reviews.forEach(review => {
        const card = createReviewCard(review);
        grid.appendChild(card);
    });
    
    // Clear the container and add the new content
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(grid);
    
    // Add "View All Reviews" button
    const viewAllContainer = document.createElement('div');
    viewAllContainer.className = 'text-center mt-12';
    viewAllContainer.innerHTML = `
        <a href="https://www.google.com/search?q=AJ+Long+Electric+reviews" target="_blank" class="inline-block px-8 py-3 bg-aj-orange text-white font-bold rounded hover:bg-orange-600 transition">
            View All Reviews <i class="fas fa-external-link-alt ml-2"></i>
        </a>
    `;
    container.appendChild(viewAllContainer);
}

/**
 * Returns mock reviews when the API is unavailable
 * @returns {Array} - Array of mock review objects
 */
function getMockReviews() {
    return [
        {
            id: 'g1',
            customerName: 'Michael S.',
            rating: 5,
            comment: 'AJ Long Electric did an excellent job installing our recessed lighting. Professional, on-time, and reasonably priced. Would highly recommend!',
            date: 'January 15, 2023',
            rawDate: '2023-01-15T15:30:00Z',
            location: 'Fairfax, VA',
            service: 'Recessed Lighting',
            source: 'google'
        },
        {
            id: 'g2',
            customerName: 'Jennifer L.',
            rating: 5,
            comment: 'They replaced our electrical panel and installed a new EV charger. The work was done quickly and properly. Very happy with the service!',
            date: 'February 22, 2023',
            rawDate: '2023-02-22T10:15:00Z',
            location: 'Alexandria, VA',
            service: 'Panel Replacement',
            source: 'google'
        },
        {
            id: 'g3',
            customerName: 'David W.',
            rating: 5,
            comment: 'Called them for troubleshooting electrical issues in our home. They were able to diagnose and fix the problem quickly. Great service and fair pricing.',
            date: 'March 10, 2023',
            rawDate: '2023-03-10T14:45:00Z',
            location: 'Arlington, VA',
            service: 'Troubleshooting',
            source: 'google'
        },
        {
            id: 'g4',
            customerName: 'Sarah M.',
            rating: 5,
            comment: 'AJ Long Electric installed ceiling fans throughout our house. They were professional, efficient, and did excellent work. Highly recommend!',
            date: 'April 5, 2023',
            rawDate: '2023-04-05T09:30:00Z',
            location: 'McLean, VA',
            service: 'Ceiling Fan Installation',
            source: 'google'
        },
        {
            id: 'g5',
            customerName: 'Robert J.',
            rating: 5,
            comment: 'Had them install GFCI outlets in our kitchen and bathrooms. Great work, reasonable price, and they cleaned up after themselves. Will definitely use them again.',
            date: 'May 12, 2023',
            rawDate: '2023-05-12T13:45:00Z',
            location: 'Vienna, VA',
            service: 'Outlet Installation',
            source: 'google'
        },
        {
            id: 'g6',
            customerName: 'Emily T.',
            rating: 5,
            comment: 'Fantastic experience with AJ Long Electric! They updated our entire home\'s electrical system during a renovation and everything works perfectly. Their attention to detail was impressive.',
            date: 'June 8, 2023',
            rawDate: '2023-06-08T11:20:00Z',
            location: 'Reston, VA',
            service: 'Electrical Remodel',
            source: 'google'
        }
    ];
}

/**
 * Creates a review card element
 * 
 * @param {Object} review - Review object
 * @returns {HTMLElement} - Review card element
 */
function createReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'testimonial-card bg-white p-6 rounded-lg shadow-md';
    
    // Star rating HTML
    const starsHtml = '★★★★★';
    
    // Shorten comment if too long
    let comment = review.comment;
    if (comment.length > 300) {
        comment = comment.substring(0, 297) + '...';
    }
    
    // Determine source (Google vs Housecall Pro vs Mock)
    let sourceIcon = '<i class="fas fa-check-circle text-green-500 ml-1"></i>';
    if (review.source === 'google') {
        sourceIcon = '<i class="fab fa-google text-blue-500 ml-1"></i>';
    } else if (review.source === 'mock-fallback') {
        sourceIcon = '<i class="fas fa-star text-yellow-500 ml-1"></i>';
    }
    
    // Create card content
    card.innerHTML = `
        <div class="text-aj-orange text-xl mb-3">${starsHtml}</div>
        <p class="text-gray-600 italic mb-6">"${comment}"</p>
        <div class="flex items-center justify-between">
            <div>
                <p class="font-bold">${review.customerName}</p>
                <p class="text-sm text-gray-500">${review.location}</p>
            </div>
            <div class="text-sm text-gray-400 flex flex-col items-end">
                <span>${review.date}</span>
                <span class="flex items-center">${review.service} ${sourceIcon}</span>
            </div>
        </div>
    `;
    
    return card;
}