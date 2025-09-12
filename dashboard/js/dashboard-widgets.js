/**
 * Dashboard Widgets Manager - Provides quick insights and analytics widgets
 */
class DashboardWidgets {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.widgets = new Map();
        this.refreshInterval = 60000; // 1 minute
        this.refreshTimer = null;
        
        this.initializeWidgets();
    }

    /**
     * Initialize all dashboard widgets
     */
    initializeWidgets() {
        // Register available widgets
        this.registerWidget('responseTime', this.createResponseTimeWidget.bind(this));
        this.registerWidget('topCustomers', this.createTopCustomersWidget.bind(this));
        this.registerWidget('formTypeBreakdown', this.createFormTypeBreakdownWidget.bind(this));
        this.registerWidget('recentActivity', this.createRecentActivityWidget.bind(this));
        this.registerWidget('performanceMetrics', this.createPerformanceMetricsWidget.bind(this));
        this.registerWidget('quickActions', this.createQuickActionsWidget.bind(this));

        // Create widget container
        this.createWidgetContainer();
        
        // Start auto-refresh
        this.startAutoRefresh();
    }

    /**
     * Register a widget
     */
    registerWidget(name, factory) {
        this.widgets.set(name, factory);
    }

    /**
     * Create widget container in the dashboard
     */
    createWidgetContainer() {
        const dashboardContent = document.querySelector('.max-w-7xl.mx-auto.py-6');
        if (!dashboardContent) return;

        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'dashboardWidgets';
        widgetContainer.className = 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8';

        // Insert after the main stats cards
        const statsContainer = dashboardContent.querySelector('.grid.grid-cols-1.md\\:grid-cols-4');
        if (statsContainer && statsContainer.nextElementSibling) {
            dashboardContent.insertBefore(widgetContainer, statsContainer.nextElementSibling);
        }

        // Create initial widgets
        this.renderAllWidgets();
    }

    /**
     * Render all widgets
     */
    renderAllWidgets() {
        const container = document.getElementById('dashboardWidgets');
        if (!container) return;

        // Clear existing widgets
        container.innerHTML = '';

        // Render each widget
        const widgetsToRender = ['quickActions', 'responseTime', 'formTypeBreakdown', 'topCustomers', 'recentActivity', 'performanceMetrics'];
        
        widgetsToRender.forEach(widgetName => {
            const factory = this.widgets.get(widgetName);
            if (factory) {
                const widget = factory();
                if (widget) {
                    container.appendChild(widget);
                }
            }
        });
    }

    /**
     * Create Response Time Analysis Widget
     */
    createResponseTimeWidget() {
        const widget = this.createBaseWidget('response-time', 'Response Time Analysis', 'fas fa-clock');

        const content = document.createElement('div');
        content.className = 'space-y-4';
        content.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-600">Avg Response Time</p>
                    <p id="avgResponseTime" class="text-2xl font-bold text-blue-600">--</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-600">This Week</p>
                    <p id="weeklyResponse" class="text-sm font-medium text-gray-900">--</p>
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">< 1 hour</span>
                    <span id="fastResponses" class="font-medium">--</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">1-24 hours</span>
                    <span id="mediumResponses" class="font-medium">--</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">> 24 hours</span>
                    <span id="slowResponses" class="font-medium">--</span>
                </div>
            </div>
        `;

        widget.appendChild(content);
        this.loadResponseTimeData(widget);
        return widget;
    }

    /**
     * Create Top Customers Widget
     */
    createTopCustomersWidget() {
        const widget = this.createBaseWidget('top-customers', 'Top Customers', 'fas fa-users');

        const content = document.createElement('div');
        content.className = 'space-y-3';
        content.innerHTML = `
            <div id="customersList" class="space-y-2">
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-200 rounded mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
            <div class="text-center">
                <button onclick="window.dashboard.viewAllCustomers()" class="text-sm text-blue-600 hover:text-blue-800">
                    View All Customers
                </button>
            </div>
        `;

        widget.appendChild(content);
        this.loadTopCustomersData(widget);
        return widget;
    }

    /**
     * Create Form Type Breakdown Widget
     */
    createFormTypeBreakdownWidget() {
        const widget = this.createBaseWidget('form-breakdown', 'Form Types', 'fas fa-chart-pie');

        const content = document.createElement('div');
        content.className = 'space-y-4';
        content.innerHTML = `
            <div id="formTypeChart" class="space-y-2">
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-200 rounded mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
        `;

        widget.appendChild(content);
        this.loadFormTypeData(widget);
        return widget;
    }

    /**
     * Create Recent Activity Widget
     */
    createRecentActivityWidget() {
        const widget = this.createBaseWidget('recent-activity', 'Recent Activity', 'fas fa-history');

        const content = document.createElement('div');
        content.className = 'space-y-3';
        content.innerHTML = `
            <div id="activityFeed" class="space-y-2 max-h-48 overflow-y-auto">
                <div class="animate-pulse">
                    <div class="h-3 bg-gray-200 rounded mb-2"></div>
                    <div class="h-3 bg-gray-200 rounded mb-2"></div>
                    <div class="h-3 bg-gray-200 rounded"></div>
                </div>
            </div>
        `;

        widget.appendChild(content);
        this.loadRecentActivityData(widget);
        return widget;
    }

    /**
     * Create Performance Metrics Widget
     */
    createPerformanceMetricsWidget() {
        const widget = this.createBaseWidget('performance', 'Performance', 'fas fa-tachometer-alt');

        const content = document.createElement('div');
        content.className = 'space-y-4';
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p class="text-xs text-gray-500">Completion Rate</p>
                    <p id="completionRate" class="text-lg font-bold text-green-600">--</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500">Avg. Resolution</p>
                    <p id="avgResolution" class="text-lg font-bold text-blue-600">--</p>
                </div>
            </div>
            <div class="border-t pt-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-500">This Month</span>
                    <span id="monthlyTrend" class="text-xs font-medium">--</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div id="monthlyProgress" class="bg-green-500 h-2 rounded-full" style="width: 0%"></div>
                </div>
            </div>
        `;

        widget.appendChild(content);
        this.loadPerformanceData(widget);
        return widget;
    }

    /**
     * Create Quick Actions Widget
     */
    createQuickActionsWidget() {
        const widget = this.createBaseWidget('quick-actions', 'Quick Actions', 'fas fa-bolt');

        const content = document.createElement('div');
        content.className = 'space-y-3';
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                <button onclick="window.dashboard.createNewResponse()" class="flex items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-reply mr-2"></i>
                    New Response
                </button>
                <button onclick="window.dashboard.exportSubmissions('csv')" class="flex items-center justify-center p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-download mr-2"></i>
                    Export CSV
                </button>
                <button onclick="window.dashboard.bulkStatusUpdate()" class="flex items-center justify-center p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-edit mr-2"></i>
                    Bulk Update
                </button>
                <button onclick="window.dashboard.refreshDashboard()" class="flex items-center justify-center p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-sm font-medium transition-colors">
                    <i class="fas fa-sync-alt mr-2"></i>
                    Refresh
                </button>
            </div>
            <div class="border-t pt-3">
                <p class="text-xs text-gray-500 mb-2">Keyboard Shortcuts:</p>
                <div class="text-xs text-gray-600 space-y-1">
                    <div class="flex justify-between">
                        <span>Search</span>
                        <kbd class="px-1 bg-gray-100 border rounded">/ </kbd>
                    </div>
                    <div class="flex justify-between">
                        <span>Refresh</span>
                        <kbd class="px-1 bg-gray-100 border rounded">Ctrl+R</kbd>
                    </div>
                </div>
            </div>
        `;

        widget.appendChild(content);
        return widget;
    }

    /**
     * Create base widget structure
     */
    createBaseWidget(id, title, iconClass) {
        const widget = document.createElement('div');
        widget.id = `widget-${id}`;
        widget.className = 'bg-white rounded-lg shadow p-6';

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-4';
        header.innerHTML = `
            <div class="flex items-center">
                <i class="${iconClass} text-gray-400 mr-2"></i>
                <h3 class="text-lg font-medium text-gray-900">${title}</h3>
            </div>
            <button onclick="dashboardWidgets.refreshWidget('${id}')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-sync-alt text-sm"></i>
            </button>
        `;

        widget.appendChild(header);
        return widget;
    }

    /**
     * Load data methods
     */
    async loadResponseTimeData(widget) {
        try {
            // Mock data for now - in production, this would come from the API
            const data = {
                avgTime: '2.3h',
                weeklyAvg: '1.8h',
                fast: '68%',
                medium: '25%',
                slow: '7%'
            };

            widget.querySelector('#avgResponseTime').textContent = data.avgTime;
            widget.querySelector('#weeklyResponse').textContent = data.weeklyAvg;
            widget.querySelector('#fastResponses').textContent = data.fast;
            widget.querySelector('#mediumResponses').textContent = data.medium;
            widget.querySelector('#slowResponses').textContent = data.slow;
        } catch (error) {
            console.error('Error loading response time data:', error);
        }
    }

    async loadTopCustomersData(widget) {
        try {
            // Mock data - replace with real API call
            const customers = [
                { name: 'ABC Construction', submissions: 12 },
                { name: 'Metro Electric', submissions: 8 },
                { name: 'Smith Residential', submissions: 6 }
            ];

            const listContainer = widget.querySelector('#customersList');
            listContainer.innerHTML = customers.map(customer => `
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-900">${customer.name}</span>
                    <span class="text-sm text-gray-500">${customer.submissions} submissions</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading top customers data:', error);
        }
    }

    async loadFormTypeData(widget) {
        try {
            const formTypes = [
                { type: 'Estimates', count: 45, color: 'bg-blue-500' },
                { type: 'Scheduling', count: 32, color: 'bg-green-500' },
                { type: 'Inquiries', count: 23, color: 'bg-yellow-500' }
            ];

            const total = formTypes.reduce((sum, type) => sum + type.count, 0);
            
            const chartContainer = widget.querySelector('#formTypeChart');
            chartContainer.innerHTML = formTypes.map(type => {
                const percentage = Math.round((type.count / total) * 100);
                return `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-3 h-3 ${type.color} rounded-full mr-2"></div>
                            <span class="text-sm text-gray-700">${type.type}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-medium">${type.count}</span>
                            <span class="text-xs text-gray-500 ml-1">(${percentage}%)</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading form type data:', error);
        }
    }

    async loadRecentActivityData(widget) {
        try {
            const activities = [
                { action: 'New estimate request', customer: 'John Doe', time: '5 min ago' },
                { action: 'Status updated to completed', customer: 'ABC Corp', time: '12 min ago' },
                { action: 'Response sent', customer: 'Metro Electric', time: '25 min ago' },
                { action: 'New inquiry received', customer: 'Smith Homes', time: '1 hour ago' }
            ];

            const feedContainer = widget.querySelector('#activityFeed');
            feedContainer.innerHTML = activities.map(activity => `
                <div class="text-xs text-gray-600 border-l-2 border-gray-200 pl-3">
                    <p class="font-medium">${activity.action}</p>
                    <p class="text-gray-500">${activity.customer} • ${activity.time}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent activity data:', error);
        }
    }

    async loadPerformanceData(widget) {
        try {
            const data = {
                completionRate: '94%',
                avgResolution: '1.2 days',
                monthlyTrend: '+12%',
                monthlyProgress: 78
            };

            widget.querySelector('#completionRate').textContent = data.completionRate;
            widget.querySelector('#avgResolution').textContent = data.avgResolution;
            widget.querySelector('#monthlyTrend').textContent = data.monthlyTrend;
            widget.querySelector('#monthlyProgress').style.width = `${data.monthlyProgress}%`;
        } catch (error) {
            console.error('Error loading performance data:', error);
        }
    }

    /**
     * Refresh a specific widget
     */
    async refreshWidget(widgetName) {
        const widget = document.getElementById(`widget-${widgetName}`);
        if (!widget) return;

        // Add loading indicator
        const refreshButton = widget.querySelector('button[onclick*="refreshWidget"]');
        if (refreshButton) {
            const icon = refreshButton.querySelector('i');
            icon.classList.add('fa-spin');
        }

        try {
            // Reload widget data based on type
            switch (widgetName) {
                case 'response-time':
                    await this.loadResponseTimeData(widget);
                    break;
                case 'top-customers':
                    await this.loadTopCustomersData(widget);
                    break;
                case 'form-breakdown':
                    await this.loadFormTypeData(widget);
                    break;
                case 'recent-activity':
                    await this.loadRecentActivityData(widget);
                    break;
                case 'performance':
                    await this.loadPerformanceData(widget);
                    break;
            }
        } catch (error) {
            console.error(`Error refreshing widget ${widgetName}:`, error);
        } finally {
            // Remove loading indicator
            if (refreshButton) {
                const icon = refreshButton.querySelector('i');
                icon.classList.remove('fa-spin');
            }
        }
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            // Refresh specific widgets that need frequent updates
            this.refreshWidget('recent-activity');
            this.refreshWidget('performance');
        }, this.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Destroy widgets
     */
    destroy() {
        this.stopAutoRefresh();
        const container = document.getElementById('dashboardWidgets');
        if (container) {
            container.remove();
        }
        this.widgets.clear();
    }
}