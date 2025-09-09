// Main JavaScript file for AJ Long Electric website
// Consolidating common functionality from navigation.js and ui-components.js

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    initMobileMenu();
    
    // Set active navigation links
    setActiveNavLinks();
    
    // Chat Widget functionality
    // Back to top button functionality
    initBackToTopButton();
    
    // Set copyright year
    setCopyrightYear();
});

// MOBILE MENU FUNCTIONALITY
function initMobileMenu() {
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
}

// NAVIGATION ACTIVE LINK FUNCTIONALITY
function setActiveNavLinks() {
    // Get current page path
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
}

// CHAT WIDGET FUNCTIONALITY
function initChatWidget() {
    const chatButton = document.getElementById('chat-button');
    const chatPopup = document.getElementById('chat-popup');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input-field');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    if (!chatButton || !chatPopup) return;

    chatButton.addEventListener('click', () => {
        const isHidden = chatPopup.style.display === 'none' || chatPopup.style.display === '';
        chatPopup.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && chatInput) {
            chatInput.focus();
        }
    });

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatPopup.style.display = 'none';
        });
    }

    if (chatInput && sendChatBtn && chatMessages) {
        const addMessage = (text, sender = 'user') => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('mb-2', 'clear-both');

            const p = document.createElement('p');
            p.classList.add('rounded-lg', 'py-2', 'px-3', 'inline-block', 'max-w-xs', 'text-sm');

            if (sender === 'user') {
                p.classList.add('bg-aj-orange', 'text-white', 'float-right');
            } else {
                p.classList.add('bg-gray-200', 'text-gray-800', 'float-left');
            }
            p.textContent = text;
            messageDiv.appendChild(p);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        const handleSendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                addMessage(message, 'user');
                chatInput.value = '';

                // Simulate agent response
                setTimeout(() => {
                    addMessage("Thanks for your message! We typically respond within a few minutes during business hours. For immediate assistance, please call us at 855-353-8755.", 'agent');
                }, 1500);
            }
        };

        sendChatBtn.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
    }
}

// BACK TO TOP BUTTON FUNCTIONALITY
function initBackToTopButton() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (!backToTopButton) return;
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
            backToTopButton.classList.remove('invisible', 'opacity-0');
        } else {
            backToTopButton.classList.remove('visible');
            backToTopButton.classList.add('invisible', 'opacity-0');
        }
    });
    
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// COPYRIGHT YEAR FUNCTIONALITY
function setCopyrightYear() {
    const copyrightYearElement = document.getElementById('copyright-year');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}