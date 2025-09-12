/**
 * UI Manager - Handles DOM manipulation and user interface interactions
 */
class UIManager {
    constructor() {
        this.currentSubmissionId = null;
        this.currentPage = 1;
        this.currentFilters = {};
        this.searchTimeout = null;
        
        this.bindEvents();
    }

    /**
     * Bind all UI event handlers
     */
    bindEvents() {
        // Modal controls
        this.bindElement('closeModal', 'click', () => this.closeModal());
        this.bindElement('cancelModal', 'click', () => this.closeModal());

        // Response modal
        this.bindElement('respondBtn', 'click', () => this.showResponseModal());
        this.bindElement('closeResponseModal', 'click', () => this.closeResponseModal());
        this.bindElement('cancelResponse', 'click', () => this.closeResponseModal());
        this.bindElement('responseForm', 'submit', (e) => {
            e.preventDefault();
            this.handleResponseSubmit();
        });

        // Status modal
        this.bindElement('updateStatusBtn', 'click', () => this.showStatusModal());
        this.bindElement('closeStatusModal', 'click', () => this.closeStatusModal());
        this.bindElement('cancelStatus', 'click', () => this.closeStatusModal());
        this.bindElement('statusForm', 'submit', (e) => {
            e.preventDefault();
            this.handleStatusSubmit();
        });

        // Filter controls
        this.bindElement('applyFilters', 'click', () => this.handleFiltersApply());
        this.bindElement('clearFilters', 'click', () => this.handleFiltersClear());
        this.bindElement('advancedFiltersToggle', 'click', () => this.toggleAdvancedFilters());
        this.bindElement('refreshData', 'click', () => this.handleRefreshData());
        
        // Search controls
        this.bindElement('globalSearch', 'input', (e) => this.handleGlobalSearch(e));
        this.bindElement('clearSearch', 'click', () => this.clearGlobalSearch());
        
        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();
    }

    /**
     * Bind event handler with error handling
     */
    bindElement(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, (e) => {
                try {
                    handler(e);
                } catch (error) {
                    console.error(`Error in ${elementId} ${event} handler:`, error);
                    Toast.error('An error occurred. Please try again.');
                }
            });
        }
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        this.show('loginScreen');
        this.hide('dashboardScreen');
        this.clearLoginForm();
    }

    /**
     * Show dashboard screen
     */
    showDashboard(admin) {
        this.hide('loginScreen');
        this.show('dashboardScreen');
        
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = `${admin.first_name} ${admin.last_name}` || admin.email;
        }
    }

    /**
     * Clear login form
     */
    clearLoginForm() {
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const errorEl = document.getElementById('loginError');
        
        if (emailEl) emailEl.value = '';
        if (passwordEl) passwordEl.value = '';
        if (errorEl) this.hide('loginError');
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats(stats) {
        const statusCounts = stats.statusCounts || {};
        
        this.setText('totalSubmissions', 
            (statusCounts.new || 0) + (statusCounts.in_progress || 0) + 
            (statusCounts.completed || 0) + (statusCounts.closed || 0));
        
        this.setText('pendingSubmissions', statusCounts.new || 0);
        this.setText('inProgressSubmissions', statusCounts.in_progress || 0);
        this.setText('completedSubmissions', statusCounts.completed || 0);
    }

    /**
     * Show loading skeleton
     */
    showLoadingSkeleton(type = 'submissions') {
        const container = document.getElementById('submissionsList');
        
        if (type === 'submissions') {
            this.hide('loadingSpinner');
            this.show('submissionsList');
            
            // Generate skeleton rows
            const skeletonRows = Array(5).fill(0).map(() => `
                <div class="border-b border-gray-200 px-6 py-4 animate-pulse">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-4 mb-3">
                                <div class="h-6 w-20 bg-gray-300 rounded-full"></div>
                                <div class="h-6 w-24 bg-gray-300 rounded-full"></div>
                            </div>
                            <div class="space-y-2">
                                <div class="h-4 w-3/4 bg-gray-300 rounded"></div>
                                <div class="h-3 w-1/2 bg-gray-300 rounded"></div>
                                <div class="h-3 w-1/4 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                        <div class="h-4 w-4 bg-gray-300 rounded"></div>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="skeleton-container">${skeletonRows}</div>`;
        }
    }

    /**
     * Show loading state for dashboard stats
     */
    showStatsLoading() {
        const statsElements = ['totalSubmissions', 'pendingSubmissions', 'inProgressSubmissions', 'completedSubmissions'];
        
        statsElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = '<div class="h-6 w-8 bg-gray-300 animate-pulse rounded"></div>';
            }
        });
    }

    /**
     * Render form submissions
     */
    renderSubmissions(submissions) {
        const container = document.getElementById('submissionsList');
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        // Hide all loading states
        this.hide('loadingSpinner');
        
        // Remove skeleton if present
        const skeleton = container.querySelector('.skeleton-container');
        if (skeleton) {
            skeleton.remove();
        }
        
        this.show('submissionsList');

        if (!submissions || submissions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500">No submissions found</p>
                </div>
            `;
            return;
        }

        const submissionsHTML = submissions.map(submission => this.renderSubmissionRow(submission)).join('');
        container.innerHTML = submissionsHTML;
    }

    /**
     * Render a single submission row
     */
    renderSubmissionRow(submission) {
        return `
            <div class="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="window.dashboard.showSubmissionDetail(${submission.id})">
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
                            <h4 class="text-sm font-medium text-gray-900">${this.escapeHtml(submission.subject || 'No Subject')}</h4>
                            <p class="text-sm text-gray-600">${this.escapeHtml(submission.customer_name)} - ${this.escapeHtml(submission.customer_email)}</p>
                            <p class="text-xs text-gray-500 mt-1">${this.formatDate(submission.created_at)}</p>
                        </div>
                    </div>
                    <div class="flex items-center text-gray-400">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show submission detail modal
     */
    renderSubmissionDetail(submission, history) {
        this.setText('modalTitle', 
            `${this.formatFormType(submission.form_type)} - ${submission.subject || 'No Subject'}`);

        const modalContent = document.getElementById('modalContent');
        
        let attachmentsHTML = '';
        if (submission.attachments && submission.attachments.length > 0) {
            attachmentsHTML = this.renderAttachments(submission.attachments);
        }

        let historyHTML = '';
        if (history && history.length > 1) {
            historyHTML = this.renderCustomerHistory(history.slice(1));
        }

        modalContent.innerHTML = `
            <div class="space-y-6">
                ${this.renderCustomerInfo(submission)}
                ${this.renderSubmissionInfo(submission)}
                ${this.renderMessage(submission)}
                ${attachmentsHTML}
                ${historyHTML}
            </div>
        `;

        this.currentSubmissionId = submission.id;
        this.show('submissionModal');
    }

    /**
     * Render customer information section
     */
    renderCustomerInfo(submission) {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-900">Customer Information</h4>
                    <div class="mt-2 text-sm text-gray-600">
                        <p><strong>Name:</strong> ${this.escapeHtml(submission.customer_name)}</p>
                        <p><strong>Email:</strong> ${this.escapeHtml(submission.customer_email)}</p>
                        ${submission.customer_phone ? `<p><strong>Phone:</strong> ${this.escapeHtml(submission.customer_phone)}</p>` : ''}
                        ${submission.service_location ? `<p><strong>Location:</strong> ${this.escapeHtml(submission.service_location)}</p>` : ''}
                    </div>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-900">Submission Details</h4>
                    <div class="mt-2 text-sm text-gray-600">
                        <p><strong>Status:</strong> <span class="status-${submission.status} inline-flex items-center px-2 py-0.5 rounded text-xs">${this.formatStatus(submission.status)}</span></p>
                        <p><strong>Type:</strong> <span class="form-${submission.form_type} inline-flex items-center px-2 py-0.5 rounded text-xs">${this.formatFormType(submission.form_type)}</span></p>
                        <p><strong>Date:</strong> ${this.formatDate(submission.created_at)}</p>
                        ${submission.urgency ? `<p><strong>Urgency:</strong> ${this.escapeHtml(submission.urgency)}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render submission information
     */
    renderSubmissionInfo(submission) {
        return `
            <div>
                <h4 class="text-sm font-medium text-gray-900">Message</h4>
                <div class="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p class="text-sm text-gray-700">${this.escapeHtml(submission.message || 'No message provided')}</p>
                </div>
            </div>
        `;
    }

    /**
     * Render message section
     */
    renderMessage(submission) {
        return this.renderSubmissionInfo(submission);
    }

    /**
     * Render attachments section
     */
    renderAttachments(attachments) {
        return `
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
                <div class="space-y-2">
                    ${attachments.map(att => `
                        <a href="${att.file_url}" target="_blank" class="block text-sm text-blue-600 hover:text-blue-800">
                            <i class="fas fa-paperclip mr-1"></i> ${this.escapeHtml(att.original_filename)}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render customer history section
     */
    renderCustomerHistory(history) {
        return `
            <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Customer History</h4>
                <div class="space-y-2 max-h-32 overflow-y-auto">
                    ${history.map(item => `
                        <div class="text-sm text-gray-600 border-l-2 border-gray-200 pl-3">
                            <span class="form-${item.form_type} inline-flex items-center px-2 py-0.5 rounded text-xs">
                                ${this.formatFormType(item.form_type)}
                            </span>
                            <span class="text-gray-500">- ${this.formatDate(item.created_at)}</span>
                            <p class="text-xs mt-1">${this.escapeHtml(item.subject || 'No Subject')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Update pagination display
     */
    updatePagination(pagination) {
        if (!pagination || pagination.pages <= 1) {
            this.hide('paginationContainer');
            return;
        }

        this.show('paginationContainer');
        this.setText('showingFrom', ((pagination.page - 1) * pagination.limit) + 1);
        this.setText('showingTo', Math.min(pagination.page * pagination.limit, pagination.total));
        this.setText('totalResults', pagination.total);

        // Generate pagination buttons
        const buttonsContainer = document.getElementById('paginationButtons');
        if (buttonsContainer) {
            buttonsContainer.innerHTML = this.generatePaginationButtons(pagination);
        }
    }

    /**
     * Generate pagination buttons HTML
     */
    generatePaginationButtons(pagination) {
        let buttonsHTML = '';

        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                buttonsHTML += `<button class="relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-blue-600 text-sm font-medium">${i}</button>`;
            } else {
                buttonsHTML += `<button onclick="window.dashboard.goToPage(${i})" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 text-sm font-medium">${i}</button>`;
            }
        }

        return buttonsHTML;
    }

    /**
     * Show response modal
     */
    showResponseModal() {
        this.show('responseModal');
    }

    /**
     * Close response modal
     */
    closeResponseModal() {
        this.hide('responseModal');
        this.clearForm('responseForm');
    }

    /**
     * Show status modal
     */
    showStatusModal() {
        this.show('statusModal');
    }

    /**
     * Close status modal
     */
    closeStatusModal() {
        this.hide('statusModal');
        this.clearForm('statusForm');
    }

    /**
     * Close main modal
     */
    closeModal() {
        this.hide('submissionModal');
        this.currentSubmissionId = null;
    }

    /**
     * Handle response form submission
     */
    async handleResponseSubmit() {
        if (window.dashboard && window.dashboard.dataManager) {
            await window.dashboard.dataManager.sendResponse(this.currentSubmissionId);
        }
    }

    /**
     * Handle status form submission
     */
    async handleStatusSubmit() {
        if (window.dashboard && window.dashboard.dataManager) {
            await window.dashboard.dataManager.updateStatus(this.currentSubmissionId);
        }
    }

    /**
     * Handle filters apply
     */
    handleFiltersApply() {
        const status = this.getValue('statusFilter');
        const formType = this.getValue('formTypeFilter');
        const dateFrom = this.getValue('dateFromFilter');
        const dateTo = this.getValue('dateToFilter');
        
        this.currentFilters = { 
            status: status || null, 
            formType: formType || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null
        };
        this.currentPage = 1;
        
        if (window.dashboard && window.dashboard.dataManager) {
            window.dashboard.dataManager.loadFilteredData(this.currentFilters, this.currentPage);
        }
    }

    /**
     * Handle filters clear
     */
    handleFiltersClear() {
        // Clear all filter inputs
        const filterInputs = ['statusFilter', 'formTypeFilter', 'dateFromFilter', 'dateToFilter'];
        filterInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) element.value = '';
        });

        // Clear global search
        this.clearGlobalSearch();

        // Reset filters and reload data
        this.currentFilters = {};
        this.currentPage = 1;
        
        if (window.dashboard && window.dashboard.dataManager) {
            window.dashboard.dataManager.loadFilteredData(this.currentFilters, this.currentPage);
        }
    }

    /**
     * Toggle advanced filters visibility
     */
    toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        const toggleButton = document.getElementById('advancedFiltersToggle');
        
        if (advancedFilters && toggleButton) {
            const isHidden = advancedFilters.classList.contains('hidden');
            
            if (isHidden) {
                advancedFilters.classList.remove('hidden');
                toggleButton.innerHTML = '<i class="fas fa-chevron-up mr-2"></i>Hide Advanced Filters';
            } else {
                advancedFilters.classList.add('hidden');
                toggleButton.innerHTML = '<i class="fas fa-sliders-h mr-2"></i>Advanced Filters';
            }
        }
    }

    /**
     * Handle refresh data
     */
    async handleRefreshData() {
        try {
            if (window.dashboard && window.dashboard.dataManager) {
                await window.dashboard.dataManager.refreshDashboard();
                Toast.success('Data refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            Toast.error('Failed to refresh data');
        }
    }

    /**
     * Handle global search
     */
    handleGlobalSearch(event) {
        const query = event.target.value.trim();
        const clearButton = document.getElementById('clearSearch');
        
        // Show/hide clear button
        if (clearButton) {
            if (query) {
                clearButton.classList.remove('hidden');
            } else {
                clearButton.classList.add('hidden');
            }
        }

        // Perform search if query is long enough
        if (query.length >= 2) {
            this.performGlobalSearch(query);
        } else if (query.length === 0) {
            // If search is cleared, reload default data
            this.handleRefreshData();
        }
    }

    /**
     * Perform global search with debouncing
     */
    performGlobalSearch(query) {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Set new timeout for debounced search
        this.searchTimeout = setTimeout(() => {
            if (window.dashboard && window.dashboard.dataManager) {
                window.dashboard.dataManager.searchSubmissions(query);
            }
        }, 300); // 300ms debounce
    }

    /**
     * Clear global search
     */
    clearGlobalSearch() {
        const searchInput = document.getElementById('globalSearch');
        const clearButton = document.getElementById('clearSearch');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (clearButton) {
            clearButton.classList.add('hidden');
        }

        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Show keyboard shortcuts help on first load
        this.showKeyboardShortcutsHelp();
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Don't trigger shortcuts when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            // Allow Escape to blur input fields
            if (event.key === 'Escape') {
                event.target.blur();
                return;
            }
            return;
        }

        // Check for modifier keys
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

        try {
            switch (event.key.toLowerCase()) {
                case '/':
                    // Focus search bar
                    event.preventDefault();
                    this.focusGlobalSearch();
                    break;

                case 'r':
                    if (ctrlKey) {
                        // Refresh data (Ctrl/Cmd + R)
                        event.preventDefault();
                        this.handleRefreshData();
                    }
                    break;

                case 'f':
                    if (ctrlKey && event.shiftKey) {
                        // Toggle advanced filters (Ctrl/Cmd + Shift + F)
                        event.preventDefault();
                        this.toggleAdvancedFilters();
                    }
                    break;

                case 'a':
                    if (ctrlKey && event.shiftKey) {
                        // Select all submissions (Ctrl/Cmd + Shift + A)
                        event.preventDefault();
                        this.toggleSelectAll();
                    }
                    break;

                case 'e':
                    if (ctrlKey) {
                        // Export data (Ctrl/Cmd + E)
                        event.preventDefault();
                        this.handleExport();
                    }
                    break;

                case 'c':
                    if (ctrlKey && event.shiftKey) {
                        // Clear all filters (Ctrl/Cmd + Shift + C)
                        event.preventDefault();
                        this.handleFiltersClear();
                    }
                    break;

                case 'escape':
                    // Close modals or clear selections
                    this.handleEscapeKey();
                    break;

                case '?':
                    if (event.shiftKey) {
                        // Show keyboard shortcuts help (Shift + ?)
                        event.preventDefault();
                        this.showKeyboardShortcutsModal();
                    }
                    break;

                case '1':
                case '2':
                case '3':
                case '4':
                    if (event.altKey) {
                        // Quick filter by status (Alt + 1-4)
                        event.preventDefault();
                        this.quickFilterByStatus(parseInt(event.key) - 1);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling keyboard shortcut:', error);
        }
    }

    /**
     * Focus the global search input
     */
    focusGlobalSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Toggle select all functionality
     */
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.click();
        }
    }

    /**
     * Handle export shortcut
     */
    handleExport() {
        const exportButton = document.getElementById('exportBtn');
        if (exportButton) {
            exportButton.click();
        }
    }

    /**
     * Handle escape key actions
     */
    handleEscapeKey() {
        // Close any open modals
        const modals = ['submissionModal', 'responseModal', 'statusModal'];
        let modalClosed = false;

        for (const modalId of modals) {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                this.hide(modalId);
                modalClosed = true;
                break;
            }
        }

        // If no modal was closed, clear selections
        if (!modalClosed) {
            this.clearSelections();
        }
    }

    /**
     * Clear all selections
     */
    clearSelections() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-submission-id]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
            }
        });

        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

        this.updateSelectionInfo();
    }

    /**
     * Quick filter by status using keyboard
     */
    quickFilterByStatus(statusIndex) {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter && statusFilter.options[statusIndex]) {
            statusFilter.selectedIndex = statusIndex;
            this.handleFiltersApply();
        }
    }

    /**
     * Update selection information display
     */
    updateSelectionInfo() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-submission-id]:checked');
        const selectedCount = checkboxes.length;
        const selectionInfo = document.getElementById('selectionInfo');
        const selectedCountEl = document.getElementById('selectedCount');

        if (selectionInfo && selectedCountEl) {
            selectedCountEl.textContent = selectedCount;
            if (selectedCount > 0) {
                selectionInfo.classList.remove('hidden');
            } else {
                selectionInfo.classList.add('hidden');
            }
        }
    }

    /**
     * Show keyboard shortcuts help tooltip
     */
    showKeyboardShortcutsHelp() {
        // Only show once per session
        if (sessionStorage.getItem('keyboardShortcutsShown')) {
            return;
        }

        setTimeout(() => {
            Toast.info('💡 Press Shift + ? to see keyboard shortcuts', { 
                duration: 5000,
                persistent: false 
            });
            sessionStorage.setItem('keyboardShortcutsShown', 'true');
        }, 3000);
    }

    /**
     * Show keyboard shortcuts modal
     */
    showKeyboardShortcutsModal() {
        const shortcuts = [
            { keys: '/', description: 'Focus search bar' },
            { keys: 'Ctrl/Cmd + R', description: 'Refresh data' },
            { keys: 'Ctrl/Cmd + Shift + F', description: 'Toggle advanced filters' },
            { keys: 'Ctrl/Cmd + Shift + A', description: 'Select all submissions' },
            { keys: 'Ctrl/Cmd + E', description: 'Export data' },
            { keys: 'Ctrl/Cmd + Shift + C', description: 'Clear all filters' },
            { keys: 'Escape', description: 'Close modals or clear selections' },
            { keys: 'Alt + 1-4', description: 'Quick filter by status' },
            { keys: 'Shift + ?', description: 'Show this help' }
        ];

        const shortcutsHTML = shortcuts.map(shortcut => `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span class="text-sm text-gray-600">${shortcut.description}</span>
                <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">${shortcut.keys}</kbd>
            </div>
        `).join('');

        this.showConfirmationDialog(
            'Keyboard Shortcuts',
            `<div class="text-left max-h-96 overflow-y-auto">${shortcutsHTML}</div>`,
            'Got it',
            'bg-blue-600 hover:bg-blue-700'
        );
    }

    /**
     * Show confirmation dialog
     */
    showConfirmationDialog(title, message, confirmText = 'Confirm', confirmClass = 'bg-blue-600 hover:bg-blue-700', onConfirm = null) {
        return new Promise((resolve) => {
            const dialogId = 'confirmationDialog';
            
            // Remove any existing dialog
            const existing = document.getElementById(dialogId);
            if (existing) {
                existing.remove();
            }

            // Create confirmation dialog
            const dialog = document.createElement('div');
            dialog.id = dialogId;
            dialog.className = 'fixed inset-0 z-50 overflow-y-auto';
            dialog.innerHTML = `
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <!-- Background overlay -->
                    <div class="fixed inset-0 transition-opacity" aria-hidden="true">
                        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
                    </div>

                    <!-- Dialog panel -->
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                                </div>
                                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        ${this.escapeHtml(title)}
                                    </h3>
                                    <div class="mt-2">
                                        <p class="text-sm text-gray-500">
                                            ${this.escapeHtml(message)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button type="button" id="confirmBtn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${confirmClass} sm:ml-3 sm:w-auto sm:text-sm">
                                ${this.escapeHtml(confirmText)}
                            </button>
                            <button type="button" id="cancelBtn" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // Handle confirm
            dialog.querySelector('#confirmBtn').addEventListener('click', () => {
                dialog.remove();
                if (onConfirm) onConfirm();
                resolve(true);
            });

            // Handle cancel
            dialog.querySelector('#cancelBtn').addEventListener('click', () => {
                dialog.remove();
                resolve(false);
            });

            // Handle background click
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog || e.target.classList.contains('bg-gray-500')) {
                    dialog.remove();
                    resolve(false);
                }
            });

            // Handle escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    dialog.remove();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    /**
     * Show bulk action confirmation
     */
    async showBulkActionConfirmation(action, itemCount, itemType = 'submissions') {
        const actionMessages = {
            'update_status': {
                title: 'Confirm Status Update',
                message: `Are you sure you want to update the status of ${itemCount} ${itemType}? This action cannot be undone.`,
                confirmText: 'Update Status',
                confirmClass: 'bg-blue-600 hover:bg-blue-700'
            },
            'bulk_respond': {
                title: 'Send Bulk Response',
                message: `Are you sure you want to send a response to ${itemCount} ${itemType}? This will send emails to all selected customers.`,
                confirmText: 'Send Responses',
                confirmClass: 'bg-green-600 hover:bg-green-700'
            },
            'delete': {
                title: 'Confirm Delete',
                message: `Are you sure you want to delete ${itemCount} ${itemType}? This action cannot be undone and will permanently remove all data.`,
                confirmText: 'Delete',
                confirmClass: 'bg-red-600 hover:bg-red-700'
            },
            'archive': {
                title: 'Confirm Archive',
                message: `Are you sure you want to archive ${itemCount} ${itemType}? They will be moved to the archived section.`,
                confirmText: 'Archive',
                confirmClass: 'bg-yellow-600 hover:bg-yellow-700'
            }
        };

        const config = actionMessages[action] || {
            title: 'Confirm Action',
            message: `Are you sure you want to perform this action on ${itemCount} ${itemType}?`,
            confirmText: 'Confirm',
            confirmClass: 'bg-blue-600 hover:bg-blue-700'
        };

        return await this.showConfirmationDialog(
            config.title,
            config.message,
            config.confirmText,
            config.confirmClass
        );
    }

    /**
     * Show destructive action confirmation with additional warnings
     */
    async showDestructiveActionConfirmation(action, details = {}) {
        const { itemCount = 1, itemType = 'item', itemNames = [], additionalWarning = '' } = details;
        
        let message = '';
        if (itemNames.length > 0 && itemNames.length <= 3) {
            message = `Are you sure you want to ${action} the following ${itemType}(s)?\n\n• ${itemNames.join('\n• ')}\n\n`;
        } else {
            message = `Are you sure you want to ${action} ${itemCount} ${itemType}(s)?\n\n`;
        }
        
        if (additionalWarning) {
            message += `⚠️ Warning: ${additionalWarning}\n\n`;
        }
        
        message += 'This action cannot be undone.';

        return await this.showConfirmationDialog(
            `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            message,
            action.charAt(0).toUpperCase() + action.slice(1),
            'bg-red-600 hover:bg-red-700'
        );
    }

    /**
     * Utility methods
     */
    show(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.classList.remove('hidden');
    }

    hide(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.classList.add('hidden');
    }

    setText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
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

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getCurrentSubmissionId() {
        return this.currentSubmissionId;
    }

    getCurrentFilters() {
        return this.currentFilters;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    setCurrentPage(page) {
        this.currentPage = page;
    }
}