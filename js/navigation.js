// Mobile menu toggle functionality for AJ Long Electric website
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu elements
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    
    // Open mobile menu
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            menuOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Close mobile menu
    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            menuOverlay.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    // Close menu when clicking on overlay
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            this.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    // Fix for floating buttons issue in desktop view
    fixFloatingButtons();
});

/**
 * Fix for floating buttons issue - prevents fixed buttons from appearing in desktop view
 */
function fixFloatingButtons() {
    // Function to check if we're on desktop view
    function isDesktopView() {
        return window.innerWidth >= 768; // Common breakpoint for desktop
    }
    
    // Function to find and fix any incorrectly positioned fixed elements
    function findAndFixElements() {
        // Check for elements in mobile menu that might be incorrectly positioned
        const mobileMenuBottomElement = document.querySelector('.mobile-menu .fixed');
        if (mobileMenuBottomElement) {
            // Change fixed positioning in mobile menu to absolute
            mobileMenuBottomElement.classList.remove('fixed');
            mobileMenuBottomElement.classList.add('absolute');
            console.log('Mobile menu buttons fixed');
        }
        
        // Check for any other fixed bottom elements that should be hidden on desktop
        if (isDesktopView()) {
            // Find any elements that have fixed bottom styling
            const possibleFixedElements = document.querySelectorAll('.fixed.bottom-0, [class*="fixed bottom"], [class*="fixed w-full"]');
            
            possibleFixedElements.forEach(el => {
                // Check if this element contains call/estimate/book buttons
                const text = el.textContent.toLowerCase();
                if ((text.includes('call us') || text.includes('get an estimate') || text.includes('book online')) &&
                    !el.closest('.mobile-menu')) {
                    // Hide this element on desktop
                    el.style.display = 'none';
                    console.log('Found and fixed full-width buttons on desktop');
                }
            });
        }
    }
    
    // Run on page load
    findAndFixElements();
    
    // Also run on resize
    window.addEventListener('resize', findAndFixElements);
    
    // Run after a slight delay to ensure all elements are loaded
    setTimeout(findAndFixElements, 500);
}

// Set active navigation link
document.addEventListener('DOMContentLoaded', function() {
    // Get current page path (e.g., "/about.html" from "/about.html")
    let currentPath = window.location.pathname;
    
    // If we're at the root, set index.html as current
    if (currentPath === '/' || currentPath === '') {
        currentPath = '/index.html';
    }
    
    // For desktop menu, mark the current page
    const desktopLinks = document.querySelectorAll('nav.bg-aj-dark ul li a');
    desktopLinks.forEach(link => {
        // Check if the href matches the current path
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('bg-gray-800');
        } else {
            link.classList.remove('bg-gray-800');
        }
    });
    
    // For mobile menu, mark the current page
    const mobileLinks = document.querySelectorAll('#mobile-menu nav ul li a');
    mobileLinks.forEach(link => {
        // Check if the href matches the current path
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('bg-gray-100');
        } else {
            link.classList.remove('bg-gray-100');
        }
    });
});