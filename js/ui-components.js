// UI Components JavaScript for AJ Long Electric website
document.addEventListener('DOMContentLoaded', function() {
    // Chat Widget functionality
    initChatWidget();
    
    // Back to top button functionality
    initBackToTopButton();
    
    // Set copyright year
    setCopyrightYear();
});

// Initialize chat widget functionality
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

// Initialize back to top button functionality
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

// Set the copyright year in the footer
function setCopyrightYear() {
    const copyrightYearElement = document.getElementById('copyright-year');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}