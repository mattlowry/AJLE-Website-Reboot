/**
 * fix-tap-targets.js
 * Improves tap targets for mobile devices to meet accessibility standards
 */
document.addEventListener('DOMContentLoaded', function() {
  // Function to apply padding to make tap targets larger
  function fixTapTargets() {
    if (window.innerWidth < 768) { // Only apply on mobile devices
      // Target the footer links that need fixing
      const footerLinks = document.querySelectorAll('footer a.hover\\:text-aj-orange');
      footerLinks.forEach(link => {
        // Add padding to increase tap target size
        link.style.padding = '12px 8px';
        link.style.margin = '4px 0';
        link.style.display = 'inline-block';
      });
      
      // Fix service area links in the city-link-list
      const cityLinks = document.querySelectorAll('.city-link-list a');
      cityLinks.forEach(link => {
        // Increase padding for larger touch area
        link.style.padding = '12px 16px'; 
        link.style.margin = '6px 4px';
        link.style.minHeight = '48px';
        link.style.minWidth = '48px';
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';
      });
      
      // Fix links in service areas sidebar
      const sidebarLinks = document.querySelectorAll('.sticky-sidebar a');
      sidebarLinks.forEach(link => {
        link.style.padding = '16px';
        link.style.minHeight = '48px';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
      });
    }
  }
  
  // Run on page load
  fixTapTargets();
  
  // Run on window resize
  window.addEventListener('resize', fixTapTargets);
});