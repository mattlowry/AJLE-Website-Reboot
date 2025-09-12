/**
 * Data Manager - Handles all API calls and data operations
 */
class DataManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.requestCache = new Map(); // Cache for in-flight requests
        this.lastRefresh = null;
        this.refreshInterval = 30 * 1000; // 30 seconds minimum between refreshes
    }

    /**
     * Load dashboard data with enhanced caching
     */
    async loadDashboardData() {
        const cacheKey = 'dashboard-data';
        
        return await this.makeCachedRequest(cacheKey, async () => {
            try {
                // Check cache first
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    return cached;
                }

                const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard', {
                    method: 'GET'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    this.setCache(cacheKey, data);
                    
                    // Perform cache cleanup if needed
                    this.performCacheCleanup();
                    
                    return data;
                } else {
                    throw new Error(data.message || 'Failed to load dashboard data');
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                Toast.error(`Failed to load dashboard: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Load filtered data with pagination and loading states
     */
    async loadFilteredData(filters = {}, page = 1) {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('action', 'submissions');
            queryParams.append('page', page);
            queryParams.append('limit', '20');
            
            // Apply filters
            if (filters.status) {
                queryParams.append('status', filters.status);
            }
            if (filters.formType) {
                queryParams.append('formType', filters.formType);
            }
            if (filters.dateFrom) {
                queryParams.append('dateFrom', filters.dateFrom);
            }
            if (filters.dateTo) {
                queryParams.append('dateTo', filters.dateTo);
            }

            // Show loading skeleton
            if (window.dashboard && window.dashboard.uiManager) {
                window.dashboard.uiManager.showLoadingSkeleton('submissions');
            }

            const response = await this.authManager.apiRequest(
                `/.netlify/functions/admin-dashboard?${queryParams}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Update UI with new data
                if (window.dashboard && window.dashboard.uiManager) {
                    // Small delay to show skeleton briefly for better UX
                    setTimeout(() => {
                        window.dashboard.uiManager.renderSubmissions(data.submissions);
                        if (data.pagination) {
                            window.dashboard.uiManager.updatePagination(data.pagination);
                        }
                    }, 200);
                }
                return data;
            } else {
                throw new Error(data.message || 'Failed to load submissions');
            }
        } catch (error) {
            console.error('Error loading filtered data:', error);
            Toast.error(`Failed to load submissions: ${error.message}`);
            
            // Hide loading states on error
            if (window.dashboard && window.dashboard.uiManager) {
                window.dashboard.uiManager.renderSubmissions([]);
            }
            throw error;
        }
    }

    /**
     * Get submission detail and customer history
     */
    async getSubmissionDetail(submissionId) {
        try {
            const response = await this.authManager.apiRequest(
                `/.netlify/functions/admin-dashboard?action=customer-history&customerId=${submissionId}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.history && data.history.length > 0) {
                return {
                    submission: data.history[0],
                    history: data.history
                };
            } else {
                throw new Error('Submission not found');
            }
        } catch (error) {
            console.error('Error loading submission detail:', error);
            Toast.error(`Failed to load submission: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send response to customer
     */
    async sendResponse(submissionId) {
        try {
            const messageEl = document.getElementById('responseMessage');
            const sendEmailEl = document.getElementById('sendEmail');
            
            if (!messageEl || !messageEl.value.trim()) {
                Toast.warning('Please enter a response message');
                return false;
            }

            // Validate and sanitize response data
            const validationManager = window.dashboardValidation;
            if (validationManager) {
                const responseData = {
                    message: messageEl.value,
                    send_email: sendEmailEl ? sendEmailEl.checked : false
                };
                
                const validationResult = validationManager.validateAdminResponse(responseData);
                if (!validationResult.isValid) {
                    const errors = Object.values(validationResult.fields)
                        .filter(field => !field.isValid)
                        .map(field => field.errors[0].message)
                        .join(', ');
                    Toast.error(`Validation errors: ${errors}`);
                    return false;
                }
                
                // Use sanitized data
                messageEl.value = validationResult.sanitizedData.message;
            }

            const loadingToast = Toast.loading('Sending response...');

            const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'respond',
                    submissionId: submissionId,
                    message: messageEl.value.trim(),
                    sendEmail: sendEmailEl ? sendEmailEl.checked : false
                })
            });

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                Toast.success('Response sent successfully!');
                this.clearCache(); // Clear cache to refresh data
                
                // Close modal and refresh data
                if (window.dashboard && window.dashboard.uiManager) {
                    window.dashboard.uiManager.closeResponseModal();
                    window.dashboard.uiManager.closeModal();
                }
                
                // Refresh dashboard data
                await this.refreshDashboard();
                
                return true;
            } else {
                throw new Error(data.message || 'Failed to send response');
            }
        } catch (error) {
            console.error('Error sending response:', error);
            Toast.error(`Failed to send response: ${error.message}`);
            return false;
        }
    }

    /**
     * Update submission status
     */
    async updateStatus(submissionId) {
        try {
            const statusEl = document.getElementById('newStatus');
            const notesEl = document.getElementById('statusNotes');
            
            if (!statusEl || !statusEl.value) {
                Toast.warning('Please select a status');
                return false;
            }

            const loadingToast = Toast.loading('Updating status...');

            const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'update-status',
                    submissionId: submissionId,
                    status: statusEl.value,
                    notes: notesEl ? notesEl.value.trim() : ''
                })
            });

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                Toast.success('Status updated successfully!');
                this.clearCache(); // Clear cache to refresh data
                
                // Close modal and refresh data
                if (window.dashboard && window.dashboard.uiManager) {
                    window.dashboard.uiManager.closeStatusModal();
                    window.dashboard.uiManager.closeModal();
                }
                
                // Refresh dashboard data
                await this.refreshDashboard();
                
                return true;
            } else {
                throw new Error(data.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Toast.error(`Failed to update status: ${error.message}`);
            return false;
        }
    }

    /**
     * Search submissions
     */
    async searchSubmissions(query, page = 1) {
        try {
            if (!query || query.trim().length < 2) {
                Toast.warning('Please enter at least 2 characters to search');
                return null;
            }

            // Validate and sanitize search query
            const validationManager = window.dashboardValidation;
            if (validationManager) {
                const validationResult = validationManager.validateSearchQuery(query);
                if (!validationResult.isValid) {
                    Toast.error('Invalid search query. Please check your input.');
                    return null;
                }
                // Use sanitized query
                query = validationResult.sanitizedData.q;
            }

            // Show loading skeleton for search results
            if (window.dashboard && window.dashboard.uiManager) {
                window.dashboard.uiManager.showLoadingSkeleton('submissions');
            }

            const queryParams = new URLSearchParams();
            queryParams.append('action', 'search');
            queryParams.append('q', query.trim());
            queryParams.append('page', page);
            queryParams.append('limit', '20');

            // Add any active filters to search
            const uiManager = window.dashboard?.uiManager;
            if (uiManager) {
                const currentFilters = uiManager.getCurrentFilters();
                
                if (currentFilters.status) {
                    queryParams.append('status', currentFilters.status);
                }
                if (currentFilters.formType) {
                    queryParams.append('formType', currentFilters.formType);
                }
                if (currentFilters.dateFrom) {
                    queryParams.append('dateFrom', currentFilters.dateFrom);
                }
                if (currentFilters.dateTo) {
                    queryParams.append('dateTo', currentFilters.dateTo);
                }
            }

            const response = await this.authManager.apiRequest(
                `/.netlify/functions/admin-dashboard?${queryParams}`,
                { method: 'GET' }
            );

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Update UI with search results
                if (window.dashboard && window.dashboard.uiManager) {
                    // Small delay to show skeleton briefly for better UX
                    setTimeout(() => {
                        window.dashboard.uiManager.renderSubmissions(data.submissions);
                        if (data.pagination) {
                            window.dashboard.uiManager.updatePagination(data.pagination);
                        }
                    }, 200);
                }
                return data;
            } else {
                throw new Error(data.message || 'Search failed');
            }
        } catch (error) {
            console.error('Error searching submissions:', error);
            Toast.error(`Search failed: ${error.message}`);
            
            // Hide loading states on error
            if (window.dashboard && window.dashboard.uiManager) {
                window.dashboard.uiManager.renderSubmissions([]);
            }
            throw error;
        }
    }

    /**
     * Bulk update submissions
     */
    async bulkUpdateStatus(submissionIds, status) {
        try {
            if (!submissionIds || submissionIds.length === 0) {
                Toast.warning('No submissions selected');
                return false;
            }

            // Show confirmation dialog
            const uiManager = window.dashboard?.uiManager;
            if (uiManager) {
                const confirmed = await uiManager.showBulkActionConfirmation('update_status', submissionIds.length);
                if (!confirmed) {
                    return false;
                }
            }

            const loadingToast = Toast.loading(`Updating ${submissionIds.length} submissions...`);

            const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'bulk-update',
                    ids: submissionIds,
                    status: status
                })
            });

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                Toast.success(`${submissionIds.length} submissions updated successfully!`);
                this.clearCache();
                await this.refreshDashboard();
                return true;
            } else {
                throw new Error(data.message || 'Bulk update failed');
            }
        } catch (error) {
            console.error('Error in bulk update:', error);
            Toast.error(`Bulk update failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Bulk send responses to submissions
     */
    async bulkSendResponses(submissionIds, message, sendEmail = false) {
        try {
            if (!submissionIds || submissionIds.length === 0) {
                Toast.warning('No submissions selected');
                return false;
            }

            if (!message || !message.trim()) {
                Toast.warning('Please enter a response message');
                return false;
            }

            // Show confirmation dialog
            const uiManager = window.dashboard?.uiManager;
            if (uiManager) {
                const confirmed = await uiManager.showBulkActionConfirmation('bulk_respond', submissionIds.length);
                if (!confirmed) {
                    return false;
                }
            }

            const loadingToast = Toast.loading(`Sending responses to ${submissionIds.length} customers...`);

            const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'bulk-respond',
                    ids: submissionIds,
                    message: message.trim(),
                    sendEmail: sendEmail
                })
            });

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                Toast.success(`Responses sent to ${submissionIds.length} customers successfully!`);
                this.clearCache();
                await this.refreshDashboard();
                return true;
            } else {
                throw new Error(data.message || 'Bulk response failed');
            }
        } catch (error) {
            console.error('Error in bulk response:', error);
            Toast.error(`Bulk response failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Export submissions data
     */
    async exportSubmissions(format = 'csv', filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('action', 'export');
            queryParams.append('format', format);
            
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.formType) queryParams.append('formType', filters.formType);
            if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

            const loadingToast = Toast.loading('Preparing export...');

            const response = await this.authManager.apiRequest(
                `/.netlify/functions/admin-dashboard?${queryParams}`,
                { method: 'GET' }
            );

            Toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submissions_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            Toast.success('Export completed successfully!');
            return true;
        } catch (error) {
            console.error('Error exporting submissions:', error);
            Toast.error(`Export failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Refresh dashboard data with intelligent caching
     */
    async refreshDashboard() {
        try {
            // Check if we should skip refresh due to rate limiting
            if (this.lastRefresh && Date.now() - this.lastRefresh < this.refreshInterval) {
                console.debug('Skipping refresh - too soon since last refresh');
                return this.getFromCache('dashboard-data');
            }

            // Clear relevant caches
            this.clearCache(null, 'dashboard');
            this.clearCache(null, 'submissions');
            
            const data = await this.loadDashboardData();
            
            if (window.dashboard && window.dashboard.uiManager) {
                window.dashboard.uiManager.updateDashboardStats(data.stats);
                window.dashboard.uiManager.renderSubmissions(data.submissions);
                if (data.pagination) {
                    window.dashboard.uiManager.updatePagination(data.pagination);
                }
            }
            
            // Start prefetching data for next time
            setTimeout(() => this.prefetchData(), 1000);
            
            return data;
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            throw error;
        }
    }

    /**
     * Enhanced cache management with intelligent strategies
     */
    setCache(key, data, customTimeout = null) {
        const timeout = customTimeout || this.getCacheTimeout(key);
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            timeout: timeout,
            accessCount: 0,
            lastAccess: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > cached.timeout) {
            this.cache.delete(key);
            return null;
        }

        // Update access statistics
        cached.accessCount++;
        cached.lastAccess = Date.now();

        return cached.data;
    }

    clearCache(key = null, pattern = null) {
        if (key) {
            this.cache.delete(key);
        } else if (pattern) {
            // Clear cache entries matching pattern
            for (const [cacheKey] of this.cache.entries()) {
                if (cacheKey.includes(pattern)) {
                    this.cache.delete(cacheKey);
                }
            }
        } else {
            this.cache.clear();
        }
        
        // Also clear request cache
        this.requestCache.clear();
    }

    /**
     * Get appropriate cache timeout based on data type
     */
    getCacheTimeout(key) {
        if (key.includes('dashboard-data') || key.includes('stats')) {
            return 2 * 60 * 1000; // 2 minutes for dashboard stats
        } else if (key.includes('submissions')) {
            return 1 * 60 * 1000; // 1 minute for submission lists
        } else if (key.includes('submission-detail')) {
            return 5 * 60 * 1000; // 5 minutes for individual submissions
        } else {
            return this.cacheTimeout; // Default timeout
        }
    }

    /**
     * Prevent duplicate API requests with request caching
     */
    async makeCachedRequest(requestKey, requestFn) {
        // Check if request is already in progress
        if (this.requestCache.has(requestKey)) {
            return await this.requestCache.get(requestKey);
        }

        // Make new request and cache the promise
        const requestPromise = requestFn();
        this.requestCache.set(requestKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } catch (error) {
            throw error;
        } finally {
            // Remove from request cache when complete
            this.requestCache.delete(requestKey);
        }
    }

    /**
     * Intelligent cache cleanup - remove least recently used items
     */
    performCacheCleanup() {
        const maxCacheSize = 50; // Maximum number of cache entries
        
        if (this.cache.size <= maxCacheSize) return;

        // Get all cache entries with their access information
        const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
            key,
            lastAccess: value.lastAccess,
            accessCount: value.accessCount
        }));

        // Sort by least recently used and lowest access count
        entries.sort((a, b) => {
            const timeDiff = a.lastAccess - b.lastAccess;
            if (Math.abs(timeDiff) < 60000) { // Within 1 minute
                return a.accessCount - b.accessCount;
            }
            return timeDiff;
        });

        // Remove the least used entries
        const itemsToRemove = this.cache.size - maxCacheSize;
        for (let i = 0; i < itemsToRemove; i++) {
            this.cache.delete(entries[i].key);
        }
    }

    /**
     * Prefetch commonly needed data
     */
    async prefetchData() {
        try {
            // Only prefetch if we're not too close to the last refresh
            if (this.lastRefresh && Date.now() - this.lastRefresh < this.refreshInterval) {
                return;
            }

            // Prefetch dashboard stats (lightweight)
            const statsKey = 'dashboard-stats';
            if (!this.getFromCache(statsKey)) {
                this.makeCachedRequest(statsKey, async () => {
                    const response = await this.authManager.apiRequest('/.netlify/functions/admin-dashboard?action=stats');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            this.setCache(statsKey, data.stats);
                            return data.stats;
                        }
                    }
                    return null;
                }).catch(error => {
                    console.debug('Prefetch stats failed:', error.message);
                });
            }

            this.lastRefresh = Date.now();
        } catch (error) {
            console.debug('Prefetch failed:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Retry logic for failed requests
     */
    async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                console.warn(`Request attempt ${i + 1} failed:`, error.message);
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Handle network errors with user-friendly messages
     */
    handleNetworkError(error) {
        if (!navigator.onLine) {
            Toast.error('You appear to be offline. Please check your internet connection.');
            return;
        }

        if (error.name === 'AbortError') {
            Toast.warning('Request was cancelled due to timeout');
            return;
        }

        if (error.message.includes('Failed to fetch')) {
            Toast.error('Unable to connect to server. Please try again later.');
            return;
        }

        // Default error handling
        Toast.error(`Network error: ${error.message}`);
    }
}