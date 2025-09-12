/**
 * Notification Manager - Handles real-time notifications and updates
 */
class NotificationManager {
    constructor(authManager, dataManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.eventSource = null;
        this.pollingInterval = null;
        this.lastNotificationCheck = new Date().toISOString();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.notificationPermission = null;
        
        this.requestNotificationPermission();
    }

    /**
     * Start real-time notifications
     */
    start() {
        if (!this.authManager.isAuthenticated()) return;
        
        this.stop(); // Clean up any existing connections
        
        if (this.supportsServerSentEvents()) {
            this.startServerSentEvents();
        } else {
            this.startPolling();
        }
    }

    /**
     * Stop all notification mechanisms
     */
    stop() {
        this.stopServerSentEvents();
        this.stopPolling();
        this.reconnectAttempts = 0;
    }

    /**
     * Check if browser supports Server-Sent Events
     */
    supportsServerSentEvents() {
        return typeof EventSource !== 'undefined';
    }

    /**
     * Start Server-Sent Events connection
     */
    startServerSentEvents() {
        try {
            const url = `/.netlify/functions/admin-notifications?lastCheck=${encodeURIComponent(this.lastNotificationCheck)}`;
            this.eventSource = new EventSource(url, { withCredentials: true });
            
            this.eventSource.onopen = () => {
                console.log('Real-time notifications connected');
                this.reconnectAttempts = 0;
                Toast.info('Real-time notifications enabled', { duration: 2000 });
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNotification(data);
                } catch (error) {
                    console.error('Error parsing notification:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                this.handleConnectionError();
            };

        } catch (error) {
            console.error('Error starting Server-Sent Events:', error);
            this.startPolling(); // Fallback to polling
        }
    }

    /**
     * Stop Server-Sent Events connection
     */
    stopServerSentEvents() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    /**
     * Start polling fallback
     */
    startPolling() {
        this.stopPolling(); // Clean up any existing polling
        
        console.log('Starting notification polling (30s intervals)');
        this.pollingInterval = setInterval(() => {
            this.checkForNewSubmissions();
        }, 30000); // Check every 30 seconds

        // Initial check
        this.checkForNewSubmissions();
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Check for new submissions via polling
     */
    async checkForNewSubmissions() {
        try {
            const response = await this.authManager.apiRequest(
                `/.netlify/functions/admin-notifications?lastCheck=${encodeURIComponent(this.lastNotificationCheck)}`,
                { method: 'GET' }
            );

            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n').filter(line => line.startsWith('data: '));
                
                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line.substring(6));
                        this.handleNotification(data);
                    } catch (error) {
                        console.error('Error parsing notification:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Error checking for new submissions:', error);
            // Don't show error toast for polling failures to avoid spam
        }
    }

    /**
     * Handle incoming notifications
     */
    handleNotification(data) {
        switch (data.type) {
            case 'new_submissions':
                if (data.data && data.data.length > 0) {
                    this.handleNewSubmissions(data.data);
                }
                break;
            case 'heartbeat':
                this.lastNotificationCheck = data.timestamp;
                break;
            case 'status_update':
                this.handleStatusUpdate(data.data);
                break;
            case 'admin_response':
                this.handleAdminResponse(data.data);
                break;
            default:
                console.log('Unknown notification type:', data.type);
        }
    }

    /**
     * Handle new form submissions
     */
    handleNewSubmissions(submissions) {
        // Show desktop notification if supported
        this.showDesktopNotification(submissions);
        
        // Show in-page notification banner
        this.showNotificationBanner(submissions);
        
        // Update dashboard counters
        this.updateDashboardCounters(submissions);
        
        // Play notification sound
        this.playNotificationSound();
        
        // Refresh dashboard data to show new submissions
        if (this.dataManager) {
            this.dataManager.refreshDashboard().catch(error => {
                console.error('Error refreshing dashboard after notification:', error);
            });
        }
    }

    /**
     * Handle status updates
     */
    handleStatusUpdate(data) {
        Toast.info(`Submission status updated: ${data.submission_id} is now ${data.status}`);
        
        if (this.dataManager) {
            this.dataManager.clearCache(); // Clear cache to get fresh data
        }
    }

    /**
     * Handle admin responses
     */
    handleAdminResponse(data) {
        Toast.success(`Response sent to ${data.customer_email}`);
    }

    /**
     * Show desktop notification
     */
    showDesktopNotification(submissions) {
        if (!this.hasNotificationPermission()) return;

        const count = submissions.length;
        const title = count === 1 ? 'New Form Submission' : `${count} New Form Submissions`;
        const body = count === 1 
            ? `${this.formatFormType(submissions[0].form_type)} from ${submissions[0].customer_name}`
            : `You have ${count} new form submissions`;

        const notification = new Notification(title, {
            body: body,
            icon: '../images/logo.png',
            badge: '../images/logo.png',
            tag: 'new-submissions',
            requireInteraction: false,
            silent: false
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Focus on the submissions section
            if (this.dataManager) {
                this.dataManager.refreshDashboard();
            }
        };
    }

    /**
     * Show in-page notification banner
     */
    showNotificationBanner(submissions) {
        const count = submissions.length;
        const message = count === 1 
            ? `New ${this.formatFormType(submissions[0].form_type)} submission from ${submissions[0].customer_name}`
            : `${count} new form submissions received`;

        // Remove any existing banners
        this.removePreviousBanners();

        // Create notification banner
        const banner = document.createElement('div');
        banner.className = 'notification-banner fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm transform transition-all duration-300 translate-x-full';
        banner.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas fa-bell text-white mr-2"></i>
                    <div>
                        <p class="text-sm font-medium">${this.escapeHtml(message)}</p>
                        <p class="text-xs opacity-90">Click to view</p>
                    </div>
                </div>
                <button class="banner-close ml-4 text-white hover:text-gray-200 focus:outline-none" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add click handlers
        banner.addEventListener('click', (e) => {
            if (!e.target.closest('.banner-close')) {
                this.dataManager.refreshDashboard();
                banner.remove();
            }
        });

        banner.querySelector('.banner-close').addEventListener('click', () => {
            banner.remove();
        });

        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => {
            banner.classList.remove('translate-x-full');
        });

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (banner.parentElement) {
                banner.classList.add('translate-x-full');
                setTimeout(() => banner.remove(), 300);
            }
        }, 10000);
    }

    /**
     * Remove previous notification banners
     */
    removePreviousBanners() {
        const existing = document.querySelectorAll('.notification-banner');
        existing.forEach(banner => {
            banner.classList.add('translate-x-full');
            setTimeout(() => banner.remove(), 300);
        });
    }

    /**
     * Update dashboard counters
     */
    updateDashboardCounters(submissions) {
        // Count new submissions by status
        const newCount = submissions.filter(s => s.status === 'new').length;
        
        if (newCount > 0) {
            const pendingEl = document.getElementById('pendingSubmissions');
            if (pendingEl) {
                const current = parseInt(pendingEl.textContent) || 0;
                pendingEl.textContent = current + newCount;
            }

            const totalEl = document.getElementById('totalSubmissions');
            if (totalEl) {
                const current = parseInt(totalEl.textContent) || 0;
                totalEl.textContent = current + submissions.length;
            }
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            // Create audio context for modern browsers
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioCtx = AudioContext || webkitAudioContext;
                const audioContext = new AudioCtx();
                
                // Create a simple notification beep
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications');
            return false;
        }

        if (Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission;
                
                if (permission === 'granted') {
                    Toast.success('Desktop notifications enabled', { duration: 3000 });
                } else if (permission === 'denied') {
                    Toast.info('Desktop notifications disabled. You can enable them in browser settings.', { duration: 5000 });
                }
                
                return permission === 'granted';
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                return false;
            }
        }

        this.notificationPermission = Notification.permission;
        return Notification.permission === 'granted';
    }

    /**
     * Check if we have notification permission
     */
    hasNotificationPermission() {
        return 'Notification' in window && Notification.permission === 'granted';
    }

    /**
     * Handle connection errors
     */
    handleConnectionError() {
        this.stopServerSentEvents();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            this.reconnectAttempts++;
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                if (this.authManager.isAuthenticated()) {
                    this.startServerSentEvents();
                }
            }, delay);
        } else {
            console.warn('Max reconnection attempts reached, falling back to polling');
            Toast.warning('Real-time notifications unavailable, using periodic updates', { duration: 5000 });
            this.startPolling();
        }
    }

    /**
     * Format form type for display
     */
    formatFormType(type) {
        const types = {
            'estimate': 'Estimate',
            'schedule': 'Schedule', 
            'inquiry': 'Inquiry'
        };
        return types[type] || type;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Get notification status
     */
    getStatus() {
        return {
            connected: this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN,
            polling: this.pollingInterval !== null,
            permission: this.notificationPermission,
            reconnectAttempts: this.reconnectAttempts,
            lastCheck: this.lastNotificationCheck
        };
    }
}