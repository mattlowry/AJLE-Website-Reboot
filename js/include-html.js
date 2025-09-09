// Function to include HTML components - supporting both data-include and w3-include-html attributes
document.addEventListener('DOMContentLoaded', function() {
    // Find all elements with data-include or w3-include-html attribute
    const includes = document.querySelectorAll('[data-include], [w3-include-html]');
    
    // Process each include
    includes.forEach(element => {
        // Get the include path from either attribute
        const file = element.getAttribute('data-include') || element.getAttribute('w3-include-html');
        
        if (!file) return; // Skip if no path found
        
        // Fetch the include file with cache busting
        const cacheBuster = Date.now();
        const fileWithCacheBuster = file.includes('?') ? `${file}&_cb=${cacheBuster}` : `${file}?_cb=${cacheBuster}`;
        
        fetch(fileWithCacheBuster)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not find ${file}`);
                }
                return response.text();
            })
            .then(html => {
                // Insert the HTML content
                element.innerHTML = html;
                
                // Execute any scripts in the included content
                const scripts = element.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.head.appendChild(newScript);
                    script.remove();
                });
                
                // Dispatch an event to indicate the include is loaded
                element.dispatchEvent(new Event('included'));
                
                // Also trigger any event listeners waiting for w3-include-html
                element.dispatchEvent(new Event('w3-include-complete'));
                
                // Handle mobile menu functionality
                if (file.includes('header')) {
                    setTimeout(() => {
                        const menuToggle = document.getElementById('menu-toggle');
                        const closeMenu = document.getElementById('close-menu');
                        const mobileMenu = document.getElementById('mobile-menu');
                        const menuOverlay = document.getElementById('menu-overlay');
        
                        if (menuToggle && closeMenu && mobileMenu && menuOverlay) {
                            menuToggle.addEventListener('click', () => {
                                mobileMenu.classList.add('active');
                                menuOverlay.style.display = 'block';
                                document.body.style.overflow = 'hidden'; // Prevent background scroll
                            });
        
                            const hideMenu = () => {
                                mobileMenu.classList.remove('active');
                                menuOverlay.style.display = 'none';
                                document.body.style.overflow = ''; // Restore scroll
                            };
        
                            closeMenu.addEventListener('click', hideMenu);
                            menuOverlay.addEventListener('click', hideMenu);
                        }
                    }, 100);
                }
            })
            .catch(error => {
                console.error(`Error including ${file}:`, error);
                element.innerHTML = `<p class="text-red-500">Error loading ${file}</p>`;
            });
    });
});
