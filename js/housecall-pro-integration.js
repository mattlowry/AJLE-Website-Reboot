/**
 * Housecall Pro Integration
 * This script ensures that the Book Online button functionality
 * works consistently across all website pages
 */
(function() {
  // Polyfill for HCPWidget to prevent errors if it's not loaded yet
  if (typeof window.HCPWidget === 'undefined') {
    window.HCPWidget = {
      openModal: function() {
        console.log('HCPWidget not loaded yet, will retry after script loads');
      }
    };
  }

  // Ensure the HousecallPro widget script is loaded
  function loadHCPWidget() {
    // Only add if not already loaded
    if (!document.querySelector('script[src*="online-booking.housecallpro.com"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = "https://online-booking.housecallpro.com/script.js?token=4bcbc2f7231b4633abc97173fe9db382&orgName=AJ-Long-Electric";

      // After the script loads, fix all buttons and attach event listeners
      script.onload = function() {
        console.log('HousecallPro widget script loaded');
        fixHCPButtonsFunctionality();
        fixHCPButtonStyles();
      };

      document.body.appendChild(script);
    }
  }

  // Fix button functionality by re-attaching click handlers
  function fixHCPButtonsFunctionality() {
    const buttons = document.querySelectorAll('.hcp-button');
    buttons.forEach(button => {
      // Remove existing onclick handler to prevent duplication
      const clone = button.cloneNode(true);
      button.parentNode.replaceChild(clone, button);

      // Add new click handler that references the global HCPWidget
      clone.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.HCPWidget !== 'undefined' && window.HCPWidget.openModal) {
          window.HCPWidget.openModal();
        } else {
          console.error('HCPWidget not available');
          // Fallback - reload the script and try again
          loadHCPWidget();
          setTimeout(() => {
            if (typeof window.HCPWidget !== 'undefined' && window.HCPWidget.openModal) {
              window.HCPWidget.openModal();
            }
          }, 1000);
        }
      });
    });
  }

  // Fix button styles - run this after a small delay to override any styles
  // that might be applied by the HCP widget
  function fixHCPButtonStyles() {
    // Query all HCP buttons
    const buttons = document.querySelectorAll('.hcp-button');

    // Apply our consistent styling
    buttons.forEach(button => {
      // Fixed position button at the bottom of the screen (orange text, gray background)
      if (button.closest('.fixed') || button.closest('[class*="fixed"]')) {
        // Remove existing styling classes
        button.className = button.className
          .replace(/bg-blue-\d+/g, '')
          .replace(/hover:bg-blue-\d+/g, '');

        // Add our custom styling
        button.classList.add('bg-gray-800');
        button.classList.add('hover:bg-gray-700');

        // Make sure text and icon are orange
        const icon = button.querySelector('i');
        if (icon) icon.classList.add('text-aj-orange');

        const span = button.querySelector('span');
        if (span) span.classList.add('text-aj-orange');
      }
      // Header buttons (gray background, orange icon/text)
      else if (button.closest('header')) {
        // Remove existing styling classes
        button.className = button.className
          .replace(/bg-blue-\d+/g, '')
          .replace(/hover:bg-blue-\d+/g, '');

        // Add our custom styling
        button.classList.add('bg-gray-800');
        button.classList.add('hover:bg-gray-700');

        // Make sure icon is orange
        const icon = button.querySelector('i');
        if (icon) icon.classList.add('text-aj-orange');
      }
    });
  }

  // Apply stronger style overrides via CSS
  function addStyleOverrides() {
    const style = document.createElement('style');
    style.textContent = `
      /* HCP Button style overrides */
      .hcp-button.bg-blue-500,
      .hcp-button.bg-blue-600,
      .hcp-button.bg-blue-700,
      .hcp-button.bg-blue-800,
      .hcp-button {
        background-color: #1a202c !important; /* gray-800 */
      }

      .hcp-button:hover {
        background-color: #2d3748 !important; /* gray-700 */
      }

      .hcp-button i.text-aj-orange,
      .hcp-button span.text-aj-orange {
        color: #FF7200 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize everything
  function init() {
    loadHCPWidget();
    addStyleOverrides();

    // First attempt at fixing styles and functionality
    setTimeout(() => {
      fixHCPButtonStyles();
      fixHCPButtonsFunctionality();
    }, 100);

    // Second attempt after HCP widget has definitely loaded
    setTimeout(() => {
      fixHCPButtonStyles();
      fixHCPButtonsFunctionality();
    }, 1000);

    // Final attempt to catch any late style changes
    setTimeout(() => {
      fixHCPButtonStyles();
      fixHCPButtonsFunctionality();
    }, 2000);
  }

  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();