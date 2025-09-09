class AdminDashboard {
    constructor() {
        this.authToken = localStorage.getItem('adminToken');
        this.currentPage = 1;
        this.currentFilters = {};
        this.currentSubmissionId = null;
        this.eventSource = null;
        this.lastNotificationCheck = new Date().toISOString();
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        // Check if user is already logged in
        if (this.authToken) {
            this.verifyToken();
        } else {
            this.showLoginScreen();
        }
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutButton').addEventListener('click', () => {
            this.logout();
        });

        // Filter controls
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Response modal
        document.getElementById('respondBtn').addEventListener('click', () => {
            this.showResponseModal();
        });

        document.getElementById('closeResponseModal').addEventListener('click', () => {
            this.closeResponseModal();
        });

        document.getElementById('cancelResponse').addEventListener('click', () => {
            this.closeResponseModal();
        });

        document.getElementById('responseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendResponse();
        });

        // Status modal
        document.getElementById('updateStatusBtn').addEventListener('click', () => {
            this.showStatusModal();
        });

        document.getElementById('closeStatusModal').addEventListener('click', () => {
            this.closeStatusModal();
        });

        document.getElementById('cancelStatus').addEventListener('click', () => {
            this.closeStatusModal();
        });

        document.getElementById('statusForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStatus();
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = document.getElementById('loginButton');
        const loginError = document.getElementById('loginError');

        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';
            loginError.classList.add('hidden');

            const response = await fetch('/.netlify/functions/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                this.authToken = data.token;
                localStorage.setItem('adminToken', this.authToken);
                this.showDashboard(data.admin);
            } else {
                this.showError('loginError', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginError', 'Login failed. Please try again.');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Sign in';
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/.netlify/functions/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify',
                    token: this.authToken
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showDashboard(data.admin);
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.logout();
        }
    }

    logout() {
        this.authToken = null;
        localStorage.removeItem('adminToken');
        this.stopNotifications();
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('dashboardScreen').classList.add('hidden');
    }

    showDashboard(admin) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('adminName').textContent = admin.name || admin.email;
        
        this.loadDashboardData();
        this.requestNotificationPermission();
        this.startNotifications();
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/.netlify/functions/admin-dashboard', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                }
            });

            const data = await response.json();

            if (data.success) {
                this.updateDashboardStats(data.stats);
                this.renderSubmissions(data.submissions);
                this.updatePagination(data.pagination);
            } else {
                console.error('Failed to load dashboard data:', data.message);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardStats(stats) {
        const statusCounts = stats.statusCounts || {};
        
        document.getElementById('totalSubmissions').textContent = 
            (statusCounts.new || 0) + (statusCounts.in_progress || 0) + 
            (statusCounts.completed || 0) + (statusCounts.closed || 0);
        
        document.getElementById('pendingSubmissions').textContent = statusCounts.new || 0;
        document.getElementById('inProgressSubmissions').textContent = statusCounts.in_progress || 0;
        document.getElementById('completedSubmissions').textContent = statusCounts.completed || 0;
    }

    renderSubmissions(submissions) {
        const container = document.getElementById('submissionsList');
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        loadingSpinner.classList.add('hidden');
        container.classList.remove('hidden');

        if (!submissions || submissions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500">No submissions found</p>
                </div>
            `;
            return;
        }

        const submissionsHTML = submissions.map(submission => `
            <div class="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="dashboard.showSubmissionDetail(${submission.id})">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-4">
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium form-${submission.form_type}">
                                    ${this.formatFormType(submission.form_type)}
                                </span>
                            </div>
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${submission.status}">
                                    ${this.formatStatus(submission.status)}
                                </span>
                            </div>
                        </div>
                        <div class="mt-2">
                            <h4 class="text-sm font-medium text-gray-900">${submission.subject || 'No Subject'}</h4>
                            <p class="text-sm text-gray-600">${submission.customer_name} - ${submission.customer_email}</p>
                            <p class="text-xs text-gray-500 mt-1">${this.formatDate(submission.created_at)}</p>
                        </div>
                    </div>
                    <div class="flex items-center text-gray-400">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = submissionsHTML;
    }

    async showSubmissionDetail(submissionId) {
        this.currentSubmissionId = submissionId;
        
        try {
            const response = await fetch(`/.netlify/functions/admin-dashboard?action=customer-history&customerId=${submissionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                }
            });

            const data = await response.json();

            if (data.success && data.history && data.history.length > 0) {
                const submission = data.history[0]; // Most recent submission
                this.renderSubmissionDetail(submission, data.history);
                document.getElementById('submissionModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading submission detail:', error);
        }
    }

    renderSubmissionDetail(submission, history) {
        document.getElementById('modalTitle').textContent = 
            `${this.formatFormType(submission.form_type)} - ${submission.subject || 'No Subject'}`;

        const modalContent = document.getElementById('modalContent');
        
        let attachmentsHTML = '';
        if (submission.attachments && submission.attachments.length > 0) {
            attachmentsHTML = `
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
                    <div class="space-y-2">
                        ${submission.attachments.map(att => `
                            <a href="${att.file_url}" target="_blank" class="block text-sm text-blue-600 hover:text-blue-800">
                                <i class="fas fa-paperclip mr-1"></i> ${att.original_filename}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        let historyHTML = '';
        if (history && history.length > 1) {
            historyHTML = `
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-900 mb-2">Customer History</h4>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${history.slice(1).map(item => `
                            <div class="text-sm text-gray-600 border-l-2 border-gray-200 pl-3">
                                <span class="form-${item.form_type} inline-flex items-center px-2 py-0.5 rounded text-xs">
                                    ${this.formatFormType(item.form_type)}
                                </span>
                                <span class="text-gray-500">- ${this.formatDate(item.created_at)}</span>
                                <p class="text-xs mt-1">${item.subject || 'No Subject'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-900">Customer Information</h4>
                        <div class="mt-2 text-sm text-gray-600">
                            <p><strong>Name:</strong> ${submission.customer_name}</p>
                            <p><strong>Email:</strong> ${submission.customer_email}</p>
                            ${submission.customer_phone ? `<p><strong>Phone:</strong> ${submission.customer_phone}</p>` : ''}
                            ${submission.service_location ? `<p><strong>Location:</strong> ${submission.service_location}</p>` : ''}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-900">Submission Details</h4>
                        <div class="mt-2 text-sm text-gray-600">
                            <p><strong>Status:</strong> <span class="status-${submission.status} inline-flex items-center px-2 py-0.5 rounded text-xs">${this.formatStatus(submission.status)}</span></p>
                            <p><strong>Type:</strong> <span class="form-${submission.form_type} inline-flex items-center px-2 py-0.5 rounded text-xs">${this.formatFormType(submission.form_type)}</span></p>
                            <p><strong>Date:</strong> ${this.formatDate(submission.created_at)}</p>
                            ${submission.urgency ? `<p><strong>Urgency:</strong> ${submission.urgency}</p>` : ''}
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-900">Message</h4>
                    <div class="mt-2 p-4 bg-gray-50 rounded-lg">
                        <p class="text-sm text-gray-700">${submission.message || 'No message provided'}</p>
                    </div>
                </div>

                ${attachmentsHTML}
                ${historyHTML}
            </div>
        `;
    }

    showResponseModal() {
        document.getElementById('responseModal').classList.remove('hidden');
    }

    closeResponseModal() {
        document.getElementById('responseModal').classList.add('hidden');
        document.getElementById('responseMessage').value = '';
        document.getElementById('sendEmail').checked = false;
    }

    async sendResponse() {
        const message = document.getElementById('responseMessage').value;
        const sendEmail = document.getElementById('sendEmail').checked;

        try {
            const response = await fetch('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                },
                body: JSON.stringify({
                    action: 'respond',
                    submissionId: this.currentSubmissionId,
                    message,
                    sendEmail
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeResponseModal();
                this.closeModal();
                this.showAlert('Response sent successfully!', 'success');
                this.loadDashboardData();
            } else {
                this.showAlert(data.message || 'Failed to send response', 'error');
            }
        } catch (error) {
            console.error('Error sending response:', error);
            this.showAlert('Failed to send response', 'error');
        }
    }

    showStatusModal() {
        document.getElementById('statusModal').classList.remove('hidden');
    }

    closeStatusModal() {
        document.getElementById('statusModal').classList.add('hidden');
        document.getElementById('statusNotes').value = '';
    }

    async updateStatus() {
        const status = document.getElementById('newStatus').value;
        const notes = document.getElementById('statusNotes').value;

        try {
            const response = await fetch('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                },
                body: JSON.stringify({
                    action: 'update-status',
                    submissionId: this.currentSubmissionId,
                    status,
                    notes
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeStatusModal();
                this.closeModal();
                this.showAlert('Status updated successfully!', 'success');
                this.loadDashboardData();
            } else {
                this.showAlert(data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showAlert('Failed to update status', 'error');
        }
    }

    closeModal() {
        document.getElementById('submissionModal').classList.add('hidden');
        this.currentSubmissionId = null;
    }

    applyFilters() {
        const status = document.getElementById('statusFilter').value;
        const formType = document.getElementById('formTypeFilter').value;
        
        this.currentFilters = { status, formType };
        this.currentPage = 1;
        this.loadFilteredData();
    }

    async loadFilteredData() {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('action', 'submissions');
            queryParams.append('page', this.currentPage);
            
            if (this.currentFilters.status) {
                queryParams.append('status', this.currentFilters.status);
            }
            if (this.currentFilters.formType) {
                queryParams.append('formType', this.currentFilters.formType);
            }

            const response = await fetch(`/.netlify/functions/admin-dashboard?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                }
            });

            const data = await response.json();

            if (data.success) {
                this.renderSubmissions(data.submissions);
                this.updatePagination(data.pagination);
            }
        } catch (error) {
            console.error('Error loading filtered data:', error);
        }
    }

    updatePagination(pagination) {
        if (!pagination || pagination.pages <= 1) {
            document.getElementById('paginationContainer').classList.add('hidden');
            return;
        }

        document.getElementById('paginationContainer').classList.remove('hidden');
        document.getElementById('showingFrom').textContent = ((pagination.page - 1) * pagination.limit) + 1;
        document.getElementById('showingTo').textContent = Math.min(pagination.page * pagination.limit, pagination.total);
        document.getElementById('totalResults').textContent = pagination.total;

        // Generate pagination buttons
        const buttonsContainer = document.getElementById('paginationButtons');
        let buttonsHTML = '';

        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                buttonsHTML += `<button class="relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-blue-600 text-sm font-medium">${i}</button>`;
            } else {
                buttonsHTML += `<button onclick="dashboard.goToPage(${i})" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 text-sm font-medium">${i}</button>`;
            }
        }

        buttonsContainer.innerHTML = buttonsHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadFilteredData();
    }

    formatFormType(type) {
        const types = {
            'estimate': 'Estimate',
            'schedule': 'Schedule',
            'inquiry': 'Inquiry'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        const statuses = {
            'new': 'New',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'closed': 'Closed'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.classList.remove('hidden');
    }

    showAlert(message, type = 'info') {
        // Simple alert for now - could be enhanced with a toast system
        alert(message);
    }

    startNotifications() {
        if (!this.authToken) return;
        
        // Close existing connection
        this.stopNotifications();
        
        try {
            const url = `/.netlify/functions/admin-notifications?lastCheck=${encodeURIComponent(this.lastNotificationCheck)}`;
            this.eventSource = new EventSource(url);
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNotification(data);
                } catch (error) {
                    console.error('Error parsing notification:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('EventSource failed:', error);
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    if (this.authToken) {
                        this.startNotifications();
                    }
                }, 5000);
            };

            console.log('Real-time notifications started');
        } catch (error) {
            console.error('Error starting notifications:', error);
            // Fallback to polling every 30 seconds
            this.startPolling();
        }
    }

    stopNotifications() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    startPolling() {
        // Fallback polling mechanism
        this.pollingInterval = setInterval(() => {
            this.checkForNewSubmissions();
        }, 30000); // Check every 30 seconds
    }

    async checkForNewSubmissions() {
        try {
            const response = await fetch(`/.netlify/functions/admin-notifications?lastCheck=${encodeURIComponent(this.lastNotificationCheck)}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                }
            });

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
        }
    }

    handleNotification(data) {
        switch (data.type) {
            case 'new_submissions':
                if (data.data && data.data.length > 0) {
                    this.handleNewSubmissions(data.data);
                }
                break;
            case 'heartbeat':
                // Update last check time
                this.lastNotificationCheck = data.timestamp;
                break;
            default:
                console.log('Unknown notification type:', data.type);
        }
    }

    handleNewSubmissions(submissions) {
        // Show desktop notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            const count = submissions.length;
            const title = count === 1 ? 'New Form Submission' : `${count} New Form Submissions`;
            const body = count === 1 
                ? `${submissions[0].form_type} from ${submissions[0].customer_name}`
                : `You have ${count} new form submissions`;

            new Notification(title, {
                body: body,
                icon: '../images/logo.png',
                badge: '../images/logo.png'
            });
        }

        // Show in-page notification
        this.showNotificationBanner(submissions);
        
        // Refresh dashboard data
        this.loadDashboardData();
    }

    showNotificationBanner(submissions) {
        const count = submissions.length;
        const message = count === 1 
            ? `New ${submissions[0].form_type} submission from ${submissions[0].customer_name}`
            : `${count} new form submissions received`;

        // Create notification banner
        const banner = document.createElement('div');
        banner.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
        banner.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium">${message}</p>
                    <p class="text-xs opacity-90">Click to refresh</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add click handler to refresh
        banner.addEventListener('click', () => {
            this.loadDashboardData();
            banner.remove();
        });

        document.body.appendChild(banner);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (banner.parentElement) {
                banner.remove();
            }
        }, 10000);
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
}

// Initialize dashboard
const dashboard = new AdminDashboard();