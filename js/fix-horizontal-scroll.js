// Fix horizontal scroll issues on mobile devices

(function() {
    'use strict';

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        fixHorizontalScroll();
        
        // Re-check on window resize
        window.addEventListener('resize', debounce(fixHorizontalScroll, 250));
        
        // Check after dynamic content loads
        setTimeout(fixHorizontalScroll, 1000);
    });

    function fixHorizontalScroll() {
        // Only apply fixes on mobile devices
        if (window.innerWidth > 768) return;

        // 1. Find and fix elements causing overflow
        findOverflowingElements();
        
        // 2. Set max-width on common problem elements
        setMaxWidths();
        
        // 3. Fix table responsiveness
        wrapTables();
        
        // 4. Fix pre/code blocks
        fixCodeBlocks();
        
        // 5. Ensure images don't overflow
        constrainImages();
        
        // 6. Fix absolute positioned elements
        fixAbsoluteElements();
    }

    function findOverflowingElements() {
        const docWidth = document.documentElement.offsetWidth;
        const elements = document.querySelectorAll('*');
        
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            
            if (rect.right > docWidth || rect.left < 0) {
                // Log the overflowing element
                console.warn('Overflowing element:', el);
                
                // Apply fixes based on element type
                if (el.tagName === 'IMG') {
                    el.style.maxWidth = '100%';
                    el.style.height = 'auto';
                } else if (el.tagName === 'TABLE') {
                    wrapTable(el);
                } else if (getComputedStyle(el).position === 'absolute') {
                    // Constrain absolute elements
                    el.style.maxWidth = '100vw';
                    if (rect.right > docWidth) {
                        el.style.right = '0';
                        el.style.left = 'auto';
                    }
                } else {
                    // Generic fix for other elements
                    el.style.maxWidth = '100%';
                    el.style.overflowX = 'hidden';
                    el.style.wordWrap = 'break-word';
                    el.style.overflowWrap = 'break-word';
                }
            }
        });
    }

    function setMaxWidths() {
        // Common containers
        const containers = document.querySelectorAll(
            '.container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl, .max-w-3xl, .max-w-2xl, .max-w-xl'
        );
        containers.forEach(el => {
            el.style.maxWidth = '100%';
            el.style.paddingLeft = '1rem';
            el.style.paddingRight = '1rem';
        });

        // Grid and flex containers
        const grids = document.querySelectorAll('.grid, .flex');
        grids.forEach(el => {
            el.style.maxWidth = '100%';
            // Ensure flex items wrap on mobile
            if (el.classList.contains('flex')) {
                el.style.flexWrap = 'wrap';
            }
        });

        // Fixed width elements
        const fixedElements = document.querySelectorAll('[style*="width:"]');
        fixedElements.forEach(el => {
            const width = el.style.width;
            if (width && width.includes('px')) {
                const widthValue = parseInt(width);
                if (widthValue > window.innerWidth - 32) {
                    el.style.width = '100%';
                    el.style.maxWidth = width;
                }
            }
        });
    }

    function wrapTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-wrapper')) {
                wrapTable(table);
            }
        });
    }

    function wrapTable(table) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        wrapper.style.overflowX = 'auto';
        wrapper.style.webkitOverflowScrolling = 'touch';
        wrapper.style.maxWidth = '100%';
        
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }

    function fixCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre, code');
        codeBlocks.forEach(block => {
            block.style.maxWidth = '100%';
            block.style.overflowX = 'auto';
            block.style.wordWrap = 'normal';
            block.style.whiteSpace = 'pre-wrap';
        });
    }

    function constrainImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Skip if already has max-width set
            if (!img.style.maxWidth || img.style.maxWidth === 'none') {
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
            }
        });

        // Also handle background images
        const bgElements = document.querySelectorAll('[style*="background-image"]');
        bgElements.forEach(el => {
            if (!el.style.backgroundSize) {
                el.style.backgroundSize = 'contain';
            }
        });
    }

    function fixAbsoluteElements() {
        const absoluteElements = document.querySelectorAll('[style*="position: absolute"], [style*="position:absolute"], .absolute');
        absoluteElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const docWidth = document.documentElement.offsetWidth;
            
            // If element extends beyond viewport
            if (rect.right > docWidth) {
                // Try to constrain it
                el.style.maxWidth = '100vw';
                
                // If it has a specific left position, adjust it
                if (el.style.left && el.style.left !== 'auto') {
                    const leftValue = parseInt(el.style.left);
                    if (leftValue + rect.width > docWidth) {
                        el.style.left = 'auto';
                        el.style.right = '0';
                    }
                }
            }
        });
    }

    // Utility function: Debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Additional CSS rules to prevent horizontal scroll
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            /* Prevent horizontal scroll */
            html, body {
                overflow-x: hidden !important;
                max-width: 100% !important;
            }
            
            /* Constrain all direct children of body */
            body > * {
                max-width: 100% !important;
                overflow-x: hidden !important;
            }
            
            /* Fix common overflow issues */
            .container {
                max-width: 100% !important;
                padding-left: 1rem !important;
                padding-right: 1rem !important;
            }
            
            /* Tables */
            .table-wrapper {
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                max-width: 100vw !important;
                margin: 0 -1rem !important;
                padding: 0 1rem !important;
            }
            
            /* Images */
            img {
                max-width: 100% !important;
                height: auto !important;
            }
            
            /* Pre and code blocks */
            pre, code {
                max-width: 100% !important;
                overflow-x: auto !important;
                word-wrap: break-word !important;
            }
            
            /* Fixed elements */
            .fixed {
                max-width: 100vw !important;
            }
            
            /* Absolute positioned elements */
            .absolute {
                max-width: 100vw !important;
            }
        }
    `;
    document.head.appendChild(style);
})();