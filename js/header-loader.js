/**
 * AJLE Header Loader - A robust solution to handle all header includes
 * This script automatically renders the standard header on page load
 * regardless of how the HTML is structured.
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Add the necessary CSS for mobile menu and button styling
    const style = document.createElement('style');
    style.textContent = `
      /* Custom variables */
      :root {
        --aj-orange: #FF7200;
        --aj-dark: #222222;
      }
      
      /* Mobile menu styles */
      .sticky-nav {
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .mobile-menu {
        position: fixed;
        top: 0;
        right: -300px;
        width: 300px;
        height: 100vh;
        background-color: white;
        z-index: 200;
        transition: right 0.3s ease;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        overflow-y: auto;
      }
      
      .mobile-menu.active {
        right: 0;
      }
      
      .menu-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0,0,0,0.5);
        z-index: 150;
        display: none;
      }
      
      /* Button color overrides */
      .bg-aj-orange { background-color: var(--aj-orange) !important; }
      .text-aj-orange { color: var(--aj-orange) !important; }
      .bg-aj-dark { background-color: var(--aj-dark) !important; }
      .text-aj-dark { color: var(--aj-dark) !important; }
      
      /* Book Online button style fix */
      .hcp-button.bg-blue-500, 
      .hcp-button.bg-blue-600,
      .hcp-button.bg-blue-700,
      .hcp-button.bg-blue-800,
      .hcp-button.fixed {
        background-color: var(--aj-dark) !important;
      }
      
      .hcp-button.hover\\:bg-blue-600:hover,
      .hcp-button.hover\\:bg-blue-700:hover,
      .hcp-button.hover\\:bg-blue-800:hover,
      .hcp-button:hover {
        background-color: #2a2a2a !important;
      }
      
      /* Additional utility classes */
      .container { width: 100%; max-width: 1200px; }
      @media (max-width: 768px) {
        .md\\:hidden { display: none; }
        .md\\:flex { display: flex; }
        .md\\:block { display: block; }
      }
    `;
    document.head.appendChild(style);
    
    // Define header content location
    const HEADER_URL = '/include/standard-header.html';
    const CACHE_BUSTER = Date.now();
    const HEADER_URL_WITH_CACHE = `${HEADER_URL}?_cb=${CACHE_BUSTER}`;
    
    // Function to load header content
    function loadHeader() {
      // Look for any existing header divs first
      const existingHeaders = document.querySelectorAll(
        '[w3-include-html="/include/standard-header.html"], ' + 
        '[data-include="/include/standard-header.html"]'
      );
      
      // If we already have a header div that's being processed by include-html.js, skip
      if (existingHeaders.length > 0) {
        console.log('Found existing header include, enhancing it...');
        enhanceExistingHeader(existingHeaders[0]);
        // Remove any duplicate headers beyond the first one
        for (let i = 1; i < existingHeaders.length; i++) {
          existingHeaders[i].remove();
        }
        return;
      }
      
      // Check if we already have a standard header in the document
      const headerElement = document.querySelector('header.sticky-nav');
      if (headerElement) {
        console.log('Found existing header element, no need to inject');
        // Still set up mobile menu functionality
        setupMobileMenu();
        return;
      }
      
      // If no header found, we need to insert one at the beginning of the body
      console.log('No header found, injecting standard header...');
      injectStandardHeader();
    }
    
    // Function to enhance an existing header
    function enhanceExistingHeader(headerDiv) {
      // Fetch the header content directly
      fetch(HEADER_URL_WITH_CACHE)
        .then(response => {
          if (!response.ok) throw new Error('Failed to load header');
          return response.text();
        })
        .then(htmlContent => {
          // Replace the content of the header div
          headerDiv.innerHTML = htmlContent;
          // Setup mobile menu functionality
          setupMobileMenu();
          // Fix button styling
          fixButtonStyling();
        })
        .catch(error => {
          console.error('Error loading header:', error);
          headerDiv.innerHTML = '<p class="text-red-500">Error loading header</p>';
        });
    }
    
    // Function to inject standard header
    function injectStandardHeader() {
      // Create a new div for the header
      const headerDiv = document.createElement('div');
      headerDiv.setAttribute('id', 'standard-header-container');
      
      // Fetch the header content
      fetch(HEADER_URL_WITH_CACHE)
        .then(response => {
          if (!response.ok) throw new Error('Failed to load header');
          return response.text();
        })
        .then(htmlContent => {
          // Set the content
          headerDiv.innerHTML = htmlContent;
          
          // Insert at the beginning of the body, after any comments but before content
          const body = document.body;
          if (body.firstChild) {
            body.insertBefore(headerDiv, body.firstChild);
          } else {
            body.appendChild(headerDiv);
          }
          
          // Setup mobile menu functionality
          setupMobileMenu();
          // Fix button styling
          fixButtonStyling();
        })
        .catch(error => {
          console.error('Error injecting header:', error);
        });
    }
    
    // Function to fix button styling
    function fixButtonStyling() {
      // Fix any blue buttons that should be dark charcoal or orange
      document.querySelectorAll('.hcp-button').forEach(button => {
        // Remove any blue classes
        button.classList.remove('bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800');
        button.classList.remove('hover:bg-blue-600', 'hover:bg-blue-700', 'hover:bg-blue-800');
        
        // Add proper styling for header buttons
        if (button.closest('header')) {
          button.classList.add('bg-gray-800');
          button.classList.add('hover:bg-gray-700');
        } else {
          // Fixed position book online button
          button.classList.add('bg-gray-800');
          button.classList.add('hover:bg-gray-700');
        }
      });
    }
    
    // Function to setup mobile menu functionality
    function setupMobileMenu() {
      setTimeout(() => {
        const menuToggle = document.getElementById('menu-toggle');
        const closeMenu = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        
        if (menuToggle && closeMenu && mobileMenu && menuOverlay) {
          // Remove any existing event listeners first
          const newMenuToggle = replaceElementToRemoveListeners(menuToggle);
          const newCloseMenu = replaceElementToRemoveListeners(closeMenu);
          const newMenuOverlay = replaceElementToRemoveListeners(menuOverlay);
          
          newMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            newMenuOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
          });
          
          const hideMenu = () => {
            mobileMenu.classList.remove('active');
            newMenuOverlay.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
          };
          
          newCloseMenu.addEventListener('click', hideMenu);
          newMenuOverlay.addEventListener('click', hideMenu);
        }
      }, 100);
    }
    
    // Helper function to replace an element with a clone to remove event listeners
    function replaceElementToRemoveListeners(element) {
      if (!element) return null;
      const clone = element.cloneNode(true);
      element.parentNode.replaceChild(clone, element);
      return clone;
    }
    
    // Load the HousecallPro integration script
    function loadHCPScript() {
      const script = document.createElement('script');
      script.src = `/js/housecall-pro-integration.js?v=${Date.now()}`;
      document.head.appendChild(script);
    }

    // Start loading the header
    loadHeader();

    // Also set a timeout to fix button styling after everything is loaded
    setTimeout(fixButtonStyling, 1000);

    // Load HousecallPro integration after a short delay
    setTimeout(loadHCPScript, 300);
  });
})();