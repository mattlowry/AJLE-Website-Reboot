/**
 * Auto Save Manager - Handles automatic saving of draft responses
 */
class AutoSaveManager {
    constructor() {
        this.saveInterval = 5000; // Save every 5 seconds
        this.timers = new Map();
        this.lastSaved = new Map();
        this.storagePrefix = 'draft_';
        
        this.initializeAutoSave();
    }

    /**
     * Initialize auto-save functionality
     */
    initializeAutoSave() {
        // Listen for input events on response forms
        document.addEventListener('input', (e) => {
            if (e.target.matches('#responseMessage, #statusNotes')) {
                this.handleInput(e.target);
            }
        });

        // Save drafts when forms are shown
        document.addEventListener('DOMContentLoaded', () => {
            this.bindFormEvents();
        });

        // Clean up drafts when forms are submitted successfully
        this.bindSuccessfulSubmissions();
    }

    /**
     * Bind events to form shows and hides
     */
    bindFormEvents() {
        // Monitor for modal shows/hides
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const element = mutation.target;
                    if (element.id === 'responseModal' || element.id === 'statusModal') {
                        if (!element.classList.contains('hidden')) {
                            this.onFormShow(element.id);
                        } else {
                            this.onFormHide(element.id);
                        }
                    }
                }
            });
        });

        const responseModal = document.getElementById('responseModal');
        const statusModal = document.getElementById('statusModal');
        
        if (responseModal) {
            observer.observe(responseModal, { attributes: true });
        }
        if (statusModal) {
            observer.observe(statusModal, { attributes: true });
        }
    }

    /**
     * Handle input events with debouncing
     */
    handleInput(inputElement) {
        const formType = this.getFormType(inputElement);
        const submissionId = this.getCurrentSubmissionId();
        const key = `${formType}_${submissionId}`;

        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set new timer for auto-save
        const timer = setTimeout(() => {
            this.saveDraft(inputElement, key);
        }, 2000); // Save 2 seconds after user stops typing

        this.timers.set(key, timer);
    }

    /**
     * Save draft to localStorage
     */
    saveDraft(inputElement, key) {
        try {
            const value = inputElement.value.trim();
            const storageKey = this.storagePrefix + key;
            
            if (value) {
                const draftData = {
                    content: value,
                    timestamp: Date.now(),
                    submissionId: this.getCurrentSubmissionId(),
                    formType: this.getFormType(inputElement)
                };

                localStorage.setItem(storageKey, JSON.stringify(draftData));
                this.lastSaved.set(key, Date.now());
                
                // Show save indicator
                this.showSaveIndicator(inputElement, 'saved');
                
            } else {
                // Clear empty drafts
                localStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showSaveIndicator(inputElement, 'error');
        }
    }

    /**
     * Load draft from localStorage
     */
    loadDraft(inputElement, key) {
        try {
            const storageKey = this.storagePrefix + key;
            const draftData = localStorage.getItem(storageKey);
            
            if (draftData) {
                const parsed = JSON.parse(draftData);
                
                // Check if draft is recent (not older than 24 hours)
                const age = Date.now() - parsed.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (age < maxAge && parsed.submissionId === this.getCurrentSubmissionId()) {
                    inputElement.value = parsed.content;
                    this.showDraftRestoredNotification(parsed.timestamp);
                    return true;
                } else {
                    // Clean up old draft
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
        return false;
    }

    /**
     * Clear draft from storage
     */
    clearDraft(key) {
        const storageKey = this.storagePrefix + key;
        localStorage.removeItem(storageKey);
        
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        
        this.lastSaved.delete(key);
    }

    /**
     * Handle form show events
     */
    onFormShow(modalId) {
        const submissionId = this.getCurrentSubmissionId();
        
        setTimeout(() => {
            if (modalId === 'responseModal') {
                const messageInput = document.getElementById('responseMessage');
                if (messageInput) {
                    const key = `response_${submissionId}`;
                    this.loadDraft(messageInput, key);
                }
            } else if (modalId === 'statusModal') {
                const notesInput = document.getElementById('statusNotes');
                if (notesInput) {
                    const key = `status_${submissionId}`;
                    this.loadDraft(notesInput, key);
                }
            }
        }, 100); // Small delay to ensure DOM is ready
    }

    /**
     * Handle form hide events
     */
    onFormHide(modalId) {
        // Continue auto-saving even when modal is hidden
        // Drafts will be cleared only when successfully submitted
    }

    /**
     * Bind successful submission events to clean up drafts
     */
    bindSuccessfulSubmissions() {
        // Listen for successful API responses
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            
            // Check if this was a successful form submission
            if (response.ok && args[0].includes('admin-dashboard')) {
                try {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();
                    
                    if (data.success && (data.response || data.submission)) {
                        const submissionId = this.getCurrentSubmissionId();
                        this.clearDraft(`response_${submissionId}`);
                        this.clearDraft(`status_${submissionId}`);
                    }
                } catch (error) {
                    // Ignore JSON parsing errors
                }
            }
            
            return response;
        };
    }

    /**
     * Get form type from input element
     */
    getFormType(inputElement) {
        if (inputElement.id === 'responseMessage') return 'response';
        if (inputElement.id === 'statusNotes') return 'status';
        return 'unknown';
    }

    /**
     * Get current submission ID
     */
    getCurrentSubmissionId() {
        return window.dashboard?.uiManager?.getCurrentSubmissionId() || 'unknown';
    }

    /**
     * Show save indicator
     */
    showSaveIndicator(inputElement, status) {
        // Remove existing indicators
        const existingIndicator = inputElement.parentElement.querySelector('.save-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'save-indicator absolute right-2 top-1/2 transform -translate-y-1/2 text-xs flex items-center';
        
        if (status === 'saved') {
            indicator.innerHTML = '<i class="fas fa-check text-green-500 mr-1"></i><span class="text-green-600">Saved</span>';
        } else if (status === 'saving') {
            indicator.innerHTML = '<i class="fas fa-spinner fa-spin text-blue-500 mr-1"></i><span class="text-blue-600">Saving...</span>';
        } else if (status === 'error') {
            indicator.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 mr-1"></i><span class="text-red-600">Error</span>';
        }

        // Position relative to input
        if (inputElement.parentElement.style.position !== 'relative') {
            inputElement.parentElement.style.position = 'relative';
        }
        
        inputElement.parentElement.appendChild(indicator);

        // Remove indicator after 2 seconds
        setTimeout(() => {
            if (indicator.parentElement) {
                indicator.remove();
            }
        }, 2000);
    }

    /**
     * Show draft restored notification
     */
    showDraftRestoredNotification(timestamp) {
        const timeAgo = this.getTimeAgo(timestamp);
        Toast.info(`Draft restored from ${timeAgo} ago`, { 
            duration: 4000,
            icon: '📝'
        });
    }

    /**
     * Get human readable time ago
     */
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'moments';
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
        return `${days} day${days === 1 ? '' : 's'}`;
    }

    /**
     * Get all saved drafts (for debugging)
     */
    getAllDrafts() {
        const drafts = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.storagePrefix)) {
                try {
                    drafts[key] = JSON.parse(localStorage.getItem(key));
                } catch (error) {
                    drafts[key] = localStorage.getItem(key);
                }
            }
        }
        return drafts;
    }

    /**
     * Clean up old drafts (call periodically)
     */
    cleanupOldDrafts() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const now = Date.now();
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                try {
                    const draftData = JSON.parse(localStorage.getItem(key));
                    if (draftData.timestamp && (now - draftData.timestamp) > maxAge) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    // Remove invalid entries
                    localStorage.removeItem(key);
                }
            }
        }
    }

    /**
     * Destroy auto-save manager
     */
    destroy() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.lastSaved.clear();
        
        // Clean up old drafts
        this.cleanupOldDrafts();
    }
}