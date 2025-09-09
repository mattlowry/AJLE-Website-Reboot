/**
 * Mobile Floating Action Button (FAB) functionality
 * Provides quick access to call, estimate, and scheduling actions on mobile devices
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize FAB on mobile devices
    if (window.innerWidth <= 768) {
        initializeMobileFAB();
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const fabContainer = document.querySelector('.mobile-fab');
        if (window.innerWidth <= 768) {
            if (!fabContainer) {
                initializeMobileFAB();
            }
        } else {
            if (fabContainer) {
                fabContainer.remove();
            }
        }
    });
});

function initializeMobileFAB() {
    // Create FAB HTML structure
    const fabHTML = `
        <div class="mobile-fab">
            <div class="fab-backdrop" id="fab-backdrop"></div>
            <div class="fab-menu" id="fab-menu">
                <div class="fab-item">
                    <span class="fab-label">Call Now</span>
                    <a href="tel:7039970026" class="fab-button call" aria-label="Call AJ Long Electric">
                        <i class="fas fa-phone"></i>
                    </a>
                </div>
                <div class="fab-item">
                    <span class="fab-label">Get Estimate</span>
                    <a href="/estimate.html" class="fab-button estimate" aria-label="Get an estimate">
                        <i class="fas fa-calculator"></i>
                    </a>
                </div>
                <div class="fab-item">
                    <span class="fab-label">Book Online</span>
                    <button class="fab-button schedule hcp-button" 
                            data-token="4bcbc2f7231b4633abc97173fe9db382" 
                            data-orgname="AJ-Long-Electric"
                            onclick="HCPWidget.openModal()"
                            aria-label="Book appointment online">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                </div>
            </div>
            <button class="fab-main" id="fab-main" aria-label="Open quick actions menu">
                <i class="fas fa-plus"></i>
            </button>
        </div>
    `;
    
    // Insert FAB into the page
    document.body.insertAdjacentHTML('beforeend', fabHTML);
    
    // Initialize FAB functionality
    setupFABEventListeners();
}

function setupFABEventListeners() {
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const fabBackdrop = document.getElementById('fab-backdrop');
    
    if (!fabMain || !fabMenu || !fabBackdrop) {
        console.warn('FAB elements not found');
        return;
    }
    
    let isOpen = false;
    
    // Toggle FAB menu
    function toggleFAB() {
        isOpen = !isOpen;
        
        if (isOpen) {
            fabMain.classList.add('active');
            fabMenu.classList.add('active');
            fabBackdrop.classList.add('active');
            fabMain.setAttribute('aria-expanded', 'true');
        } else {
            fabMain.classList.remove('active');
            fabMenu.classList.remove('active');
            fabBackdrop.classList.remove('active');
            fabMain.setAttribute('aria-expanded', 'false');
        }
    }
    
    // Close FAB menu
    function closeFAB() {
        if (isOpen) {
            toggleFAB();
        }
    }
    
    // Event listeners
    fabMain.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFAB();
    });
    
    fabBackdrop.addEventListener('click', function(e) {
        e.preventDefault();
        closeFAB();
    });
    
    // Close FAB when pressing escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            closeFAB();
        }
    });
    
    // Close FAB when clicking on any menu item
    const fabItems = document.querySelectorAll('.fab-item a, .fab-item button');
    fabItems.forEach(item => {
        item.addEventListener('click', function() {
            // Small delay to allow the action to register
            setTimeout(closeFAB, 100);
        });
    });
    
    // Handle scroll to hide/show FAB
    let lastScrollTop = 0;
    let fabVisible = true;
    
    window.addEventListener('scroll', function() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const fabContainer = document.querySelector('.mobile-fab');
        
        if (!fabContainer) return;
        
        // Hide FAB when scrolling down, show when scrolling up
        if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
            // Scrolling down
            if (fabVisible) {
                fabContainer.style.transform = 'translateY(100px)';
                fabContainer.style.opacity = '0';
                fabVisible = false;
                closeFAB(); // Close menu if open
            }
        } else {
            // Scrolling up
            if (!fabVisible) {
                fabContainer.style.transform = 'translateY(0)';
                fabContainer.style.opacity = '1';
                fabVisible = true;
            }
        }
        
        lastScrollTop = currentScrollTop;
    });
    
    // Accessibility: Focus management
    fabMain.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFAB();
        }
    });
    
    // Track FAB interactions for analytics (if needed)
    function trackFABInteraction(action) {
        // Add analytics tracking here if needed
        console.log('FAB interaction:', action);
        
        // Example: Google Analytics event tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'fab_interaction', {
                'event_category': 'mobile_ux',
                'event_label': action
            });
        }
    }
    
    // Track interactions
    document.querySelector('.fab-button.call')?.addEventListener('click', () => {
        trackFABInteraction('call');
    });
    
    document.querySelector('.fab-button.estimate')?.addEventListener('click', () => {
        trackFABInteraction('estimate');
    });
    
    document.querySelector('.fab-button.schedule')?.addEventListener('click', () => {
        trackFABInteraction('schedule');
    });
}

// Handle dynamic content loading
function reinitializeFAB() {
    const existingFAB = document.querySelector('.mobile-fab');
    if (existingFAB) {
        existingFAB.remove();
    }
    
    if (window.innerWidth <= 768) {
        initializeMobileFAB();
    }
}

// Export for use in other scripts
window.mobileFAB = {
    initialize: initializeMobileFAB,
    reinitialize: reinitializeFAB
};