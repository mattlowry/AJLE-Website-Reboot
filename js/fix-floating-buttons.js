/**
 * Fix for floating buttons issue - removes fixed position buttons that incorrectly 
 * appear on desktop view
 */
document.addEventListener('DOMContentLoaded', function() {
    // Function to check if element exists
    function elementExists(selector) {
        return document.querySelector(selector) !== null;
    }
    
    // Check if we're on desktop view
    function isDesktopView() {
        return window.innerWidth >= 768; // Common breakpoint for desktop
    }
    
    // Find any elements that match these patterns
    const possibleSelectors = [
        '.fixed.bottom-0.left-0.w-full',
        '.fixed.bottom-0.w-full',
        '[class*="fixed"][class*="bottom"][class*="w-full"]',
        '[class*="fixed"][class*="bottom-0"][class*="left-0"]',
        '.bottom-buttons',
        '.cta-buttons.fixed',
        '.floating-buttons',
        '.mobile-action-buttons'
    ];
    
    // If we're on desktop, hide any fixed bottom buttons that shouldn't be visible
    if (isDesktopView()) {
        possibleSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // Check if this element contains buttons for Call Us, Get an Estimate, Book Online
                const text = el.textContent.toLowerCase();
                if (text.includes('call us') || text.includes('get an estimate') || text.includes('book online')) {
                    // Hide this element on desktop
                    el.style.display = 'none';
                    console.log('Fixed floating buttons hidden on desktop view');
                }
            });
        });
    }
    
    // Add resize listener to handle window resizing
    window.addEventListener('resize', function() {
        // Re-run the check if viewport size changes between mobile/desktop
        const elements = document.querySelectorAll(possibleSelectors.join(','));
        elements.forEach(el => {
            const text = el.textContent.toLowerCase();
            if (text.includes('call us') || text.includes('get an estimate') || text.includes('book online')) {
                if (isDesktopView()) {
                    el.style.display = 'none';
                } else {
                    el.style.display = '';
                }
            }
        });
    });
});