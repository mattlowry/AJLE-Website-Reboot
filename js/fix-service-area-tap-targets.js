/**
 * This script specifically fixes the tap targets on the service areas page
 * It will run after the DOM is loaded to ensure all elements are accessible
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Fixing service areas tap targets...');
    
    // Fix city links in the city-link-list
    const cityLinks = document.querySelectorAll('.city-link-list a');
    cityLinks.forEach(link => {
        link.style.minHeight = '48px';
        link.style.minWidth = '48px';
        link.style.padding = '12px 16px';
        link.style.margin = '6px 4px';
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
    });
    
    // Fix sidebar links to ensure they're large enough
    const sidebarLinks = document.querySelectorAll('.sticky-sidebar a');
    sidebarLinks.forEach(link => {
        link.style.minHeight = '48px';
        link.style.padding = '14px 16px';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
    });
    
    // Add spacing between links to prevent overlapping tap targets
    const allServiceAreaLinks = document.querySelectorAll('a[href*="electrical-services"]');
    allServiceAreaLinks.forEach(link => {
        // Only apply to links that might be too small
        if (link.getBoundingClientRect().height < 48 || link.getBoundingClientRect().width < 48) {
            link.style.padding = '12px 8px';
            link.style.minHeight = '48px';
            link.style.minWidth = '48px';
            link.style.marginTop = '4px';
            link.style.marginBottom = '4px';
            link.style.display = 'inline-block';
        }
    });
    
    console.log('Service areas tap targets fixed!');
});