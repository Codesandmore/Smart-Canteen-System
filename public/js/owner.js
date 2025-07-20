// Owner Dashboard JavaScript

let currentUser = null;
let ordersData = [];
let paymentsData = [];
let analyticsData = {};
let currentSection = 'dashboard';
let selectedOrderId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(userData);
    if (currentUser.role !== 'owner') {
        window.location.href = '/';
        return;
    }
    
    // Enhanced session management for admin
    if (currentUser.sessionTimeout) {
        if (Date.now() > currentUser.sessionTimeout) {
            alert('Your admin session has expired for security reasons. Please log in again.');
            localStorage.removeItem('user');
            window.location.href = '/';
            return;
        }
        
        // Set up session timeout warning
        const timeRemaining = currentUser.sessionTimeout - Date.now();
        if (timeRemaining < 5 * 60 * 1000) { // Less than 5 minutes remaining
            showSessionWarning(timeRemaining);
        }
        
        // Auto-logout when session expires
        setTimeout(() => {
            alert('Your admin session has expired for security reasons.');
            localStorage.removeItem('user');
            window.location.href = '/';
        }, timeRemaining);
    }
    
    // Display admin access info if available
    if (currentUser.accessReason) {
        console.log(`Admin session: ${currentUser.accessReason} - Login time: ${currentUser.loginTime}`);
    }
    
    initializeApp();
    setupEventListeners();
    
    // Auto-refresh data every 30 seconds
    setInterval(() => {
        refreshDashboardData();
        if (currentSection === 'orders') {
            loadOrders();
        }
    }, 30000);
});

function initializeApp() {
    // Set user information
    document.getElementById('ownerName').textContent = currentUser.name;
    
    // Show dashboard by default
    showSection('dashboard');
    
    // Load initial data
    loadDashboardData();
    
    // Setup navigation
    setupNavigation();
}

function setupEventListeners() {
    // Auto-refresh on visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            refreshDashboardData();
        }
    });
}

function setupNavigation() {
    console.log('Setting up navigation...');
    const navLinks = document.querySelectorAll('.nav-links a');
    console.log('Found nav links:', navLinks.length);
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('href').substring(1);
            console.log('Nav clicked:', section);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    console.log('Switching to section:', sectionName);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        console.log('Section found and displayed:', sectionName);
    } else {
        console.error('Section not found:', sectionName);
    }
    
    // Update navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionName}"]`).classList.add('active');
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'orders':
            loadOrders();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'menu':
            loadMenuManagement();
            break;
        case 'inventory':
            loadInventory();
            break;
    }
}

async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        await Promise.all([
            loadAnalytics(),
            loadOrders(),
            loadPayments()
        ]);
        updateDashboardStats();
        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Dashboard loading error:', error);
        showMessage(`Failed to load dashboard data: ${error.message}`, 'error');
    }
}

async function refreshDashboardData() {
    if (currentSection === 'dashboard') {
        await loadDashboardData();
    }
}

async function loadMenuManagement() {
    try {
        const response = await fetch('/api/menu');
        const menuItems = await response.json();
        displayMenuManagement(menuItems);
    } catch (error) {
        console.error('Failed to load menu:', error);
        showMessage('Failed to load menu items', 'error');
    }
}

function displayMenuManagement(menuItems) {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = `
        <div class="menu-management-header">
            <h3>Menu Management</h3>
            <button class="btn btn-success" onclick="showAddMenuForm()">+ Add New Item</button>
        </div>
        
        <div id="addMenuForm" class="card mt-3" style="display: none;">
            <div class="card-header">
                <h4>Add New Menu Item</h4>
            </div>
            <form id="menuItemForm" onsubmit="submitMenuForm(event)">
                <div class="form-group">
                    <label for="itemName">Item Name</label>
                    <input type="text" id="itemName" required placeholder="Enter item name">
                </div>
                <div class="form-group">
                    <label for="itemPrice">Price (₹)</label>
                    <input type="number" id="itemPrice" step="0.01" min="0" required placeholder="Enter price">
                </div>
                <div class="form-group">
                    <label for="itemCategory">Category</label>
                    <select id="itemCategory" required>
                        <option value="">Select category</option>
                        <option value="snacks">Snacks</option>
                        <option value="beverages">Beverages</option>
                        <option value="meals">Meals</option>
                        <option value="desserts">Desserts</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="itemDescription">Description</label>
                    <textarea id="itemDescription" rows="3" placeholder="Enter description (optional)"></textarea>
                </div>
                <div class="form-group">
                    <label for="preparationTime">Preparation Time (minutes)</label>
                    <input type="number" id="preparationTime" min="1" max="60" value="15" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-success">Add Item</button>
                    <button type="button" class="btn btn-secondary" onclick="hideAddMenuForm()">Cancel</button>
                </div>
            </form>
        </div>
        
        <div class="menu-items-grid">
            ${menuItems.map(item => `
                <div class="menu-item-card" data-item-id="${item.id}">
                    <div class="item-header">
                        <h4>${item.name}</h4>
                        <span class="price">₹${item.price}</span>
                    </div>
                    <div class="item-details">
                        <p class="category">${item.category}</p>
                        <p class="description">${item.description || 'No description'}</p>
                        <p class="prep-time">⏱️ ${item.preparation_time} minutes</p>
                        <p class="availability ${item.available ? 'available' : 'unavailable'}">
                            ${item.available ? '✅ Available' : '❌ Unavailable'}
                        </p>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-warning btn-sm" onclick="editMenuItem(${item.id})">Edit</button>
                        <button class="btn ${item.available ? 'btn-danger' : 'btn-success'} btn-sm" 
                                onclick="toggleItemAvailability(${item.id}, ${!item.available})">
                            ${item.available ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddMenuForm() {
    document.getElementById('addMenuForm').style.display = 'block';
    document.getElementById('itemName').focus();
}

function hideAddMenuForm() {
    document.getElementById('addMenuForm').style.display = 'none';
    document.getElementById('menuItemForm').reset();
}

async function submitMenuForm(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('itemName').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        category: document.getElementById('itemCategory').value,
        description: document.getElementById('itemDescription').value,
        preparationTime: parseInt(document.getElementById('preparationTime').value)
    };
    
    try {
        const response = await fetch('/api/menu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Menu item added successfully!', 'success');
            hideAddMenuForm();
            loadMenuManagement(); // Refresh the menu
        } else {
            showMessage(result.message || 'Failed to add menu item', 'error');
        }
    } catch (error) {
        console.error('Add menu item error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function toggleItemAvailability(itemId, newAvailability) {
    try {
        const response = await fetch(`/api/menu/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: newAvailability })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`Item ${newAvailability ? 'enabled' : 'disabled'} successfully!`, 'success');
            loadMenuManagement(); // Refresh the menu
        } else {
            showMessage(result.message || 'Failed to update item', 'error');
        }
    } catch (error) {
        console.error('Update item error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function loadAnalytics() {
    try {
        console.log('Loading analytics...');
        const response = await fetch('/api/analytics');
        if (!response.ok) {
            throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
        }
        analyticsData = await response.json();
        
        if (currentSection === 'dashboard') {
            updateDashboardStats();
        } else if (currentSection === 'analytics') {
            displayAnalytics();
        }
        
        return analyticsData;
    } catch (error) {
        console.error('Failed to load analytics:', error);
        throw error; // Re-throw to be caught by loadDashboardData
    }
}

async function loadOrders() {
    try {
        console.log('Loading orders...');
        const response = await fetch('/api/orders');
        if (!response.ok) {
            throw new Error(`Orders API error: ${response.status} ${response.statusText}`);
        }
        const newOrdersData = await response.json();
        
        // Check for new orders and show notifications
        checkForNewOrders(newOrdersData);
        
        ordersData = newOrdersData;
        
        if (currentSection === 'dashboard') {
            displayRecentOrders();
        } else if (currentSection === 'orders') {
            displayAllOrders();
        }
        
        return ordersData;
    } catch (error) {
        console.error('Failed to load orders:', error);
        throw error; // Re-throw to be caught by loadDashboardData
    }
}

// Track order count for new order notifications
let previousOrderCount = 0;

function checkForNewOrders(newOrdersData) {
    const currentOrderCount = newOrdersData.length;
    
    // If we have more orders than before, show notification
    if (previousOrderCount > 0 && currentOrderCount > previousOrderCount) {
        const newOrdersCount = currentOrderCount - previousOrderCount;
        showMessage(`🔔 ${newOrdersCount} new order(s) received!`, 'success');
        
        // Play notification sound (if available)
        playNotificationSound();
    }
    
    previousOrderCount = currentOrderCount;
}

function playNotificationSound() {
    // Create a simple notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio notification not available');
    }
}

async function loadPayments() {
    try {
        console.log('Loading payments...');
        const response = await fetch('/api/payments');
        if (!response.ok) {
            throw new Error(`Payments API error: ${response.status} ${response.statusText}`);
        }
        paymentsData = await response.json();
        
        if (currentSection === 'payments') {
            displayPayments();
            displayPendingCashPayments();
        }
        
        return paymentsData;
    } catch (error) {
        console.error('Failed to load payments:', error);
        throw error; // Re-throw to be caught by loadDashboardData
    }
}

function updateDashboardStats() {
    if (!analyticsData.dailyStats) return;
    
    const stats = analyticsData.dailyStats;
    document.getElementById('todayOrders').textContent = stats.total_orders || 0;
    document.getElementById('todayRevenue').textContent = `₹${(stats.total_revenue || 0).toFixed(2)}`;
    document.getElementById('totalRevenue').textContent = `₹${(analyticsData.totalRevenue || 0).toFixed(2)}`;
    
    const pendingCount = ordersData.filter(order => order.orderStatus === 'Pending' || order.orderStatus === 'Preparing' || order.orderStatus === 'Ready').length;
    document.getElementById('pendingOrders').textContent = pendingCount;
}

function displayRecentOrders() {
    const container = document.getElementById('recentOrdersTable');
    const recentOrders = ordersData.slice(0, 5); // Show only last 5 orders
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No orders found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${recentOrders.map(order => `
                    <tr>
                        <td>${order.id.slice(-8)}</td>
                        <td>${order.userName}</td>
                        <td>
                            ${order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                        </td>
                        <td>₹${order.totalAmount}</td>
                        <td>
                            <span class="status-badge ${order.paymentStatus === 'Paid' ? 'status-completed' : 'status-pending'}">
                                ${order.paymentStatus}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge status-${(order.orderStatus || 'unknown').toLowerCase()}">
                                ${order.orderStatus || 'Unknown'}
                            </span>
                        </td>
                        <td>${order.orderTime ? new Date(order.orderTime).toLocaleString() : 'N/A'}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-info" onclick="viewOrderDetails('${order.id}')">View</button>
                                ${order.orderStatus === 'Pending' ? `
                                    <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'Confirmed', '${order.orderStatus}')">Accept</button>
                                    <button class="btn btn-danger" onclick="updateOrderStatus('${order.id}', 'Cancelled', '${order.orderStatus}')">Reject</button>
                                ` : ''}
                                ${order.orderStatus === 'Confirmed' ? `
                                    <button class="btn btn-warning" onclick="updateOrderStatus('${order.id}', 'Preparing', '${order.orderStatus}')">Start Preparing</button>
                                ` : ''}
                                ${order.orderStatus === 'Preparing' ? `
                                    <button class="btn btn-info" onclick="updateOrderStatus('${order.id}', 'Ready', '${order.orderStatus}')">Mark Ready</button>
                                ` : ''}
                                ${order.orderStatus === 'Ready' ? `
                                    <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'Completed', '${order.orderStatus}')">Complete</button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayAllOrders() {
    const container = document.getElementById('ordersTable');
    
    if (ordersData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No orders found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${ordersData.map(order => `
                    <tr data-status="${order.orderStatus}" data-date="${new Date(order.orderTime).toDateString()}">
                        <td>${order.id.slice(-8)}</td>
                        <td>${order.userName}</td>
                        <td>
                            ${order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                        </td>
                        <td>₹${order.totalAmount}</td>
                        <td>${order.paymentMethod}</td>
                        <td>
                            <span class="status-badge ${order.paymentStatus === 'Paid' ? 'status-completed' : 'status-pending'}">
                                ${order.paymentStatus}
                            </span>
                            ${order.paymentMethod === 'cash' && order.paymentStatus === 'Pending' ? `
                                <button class="btn btn-success" onclick="showCashPaymentModal('${order.id}', ${order.totalAmount})">Record Payment</button>
                            ` : ''}
                        </td>
                        <td>
                            <div class="order-status-controls">
                                <select onchange="updateOrderStatus('${order.id}', this.value, '${order.orderStatus}')" 
                                        ${order.orderStatus === 'Completed' || order.orderStatus === 'Cancelled' ? 'disabled' : ''}>
                                    <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                                    <option value="Confirmed" ${order.orderStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="Preparing" ${order.orderStatus === 'Preparing' ? 'selected' : ''}>Preparing</option>
                                    <option value="Ready" ${order.orderStatus === 'Ready' ? 'selected' : ''}>Ready</option>
                                    <option value="Completed" ${order.orderStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                                <span class="status-badge status-${(order.orderStatus || 'unknown').toLowerCase()}">${order.orderStatus || 'Unknown'}</span>
                                
                                ${order.orderStatus === 'Pending' ? `
                                    <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order.id}', 'Confirmed', '${order.orderStatus}')">
                                        ✅ Accept Order
                                    </button>
                                ` : ''}
                                
                                ${order.orderStatus === 'Confirmed' ? `
                                    <button class="btn btn-info btn-sm" onclick="updateOrderStatus('${order.id}', 'Preparing', '${order.orderStatus}')">
                                        👨‍🍳 Start Preparing
                                    </button>
                                ` : ''}
                                
                                ${order.orderStatus === 'Preparing' ? `
                                    <button class="btn btn-warning btn-sm" onclick="updateOrderStatus('${order.id}', 'Ready', '${order.orderStatus}')">
                                        🔔 Mark Ready
                                    </button>
                                ` : ''}
                                
                                ${order.orderStatus === 'Ready' ? `
                                    <button class="btn btn-success btn-sm" onclick="markOrderCompleted('${order.id}')">
                                        ✅ Mark Completed
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                        <td>${order.orderTime ? new Date(order.orderTime).toLocaleString() : 'N/A'}</td>
                        <td>
                            <button class="btn btn-info" onclick="viewOrderDetails('${order.id}')">View Details</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayPayments() {
    const container = document.getElementById('paymentsTable');
    
    if (paymentsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No payments found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Payment ID</th>
                    <th>Order ID</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${paymentsData.map(payment => `
                    <tr data-status="${payment.status}">
                        <td>${payment.id ? payment.id.slice(-8) : 'N/A'}</td>
                        <td>${payment.orderId ? payment.orderId.slice(-8) : 'N/A'}</td>
                        <td>${payment.userName || payment.userId || 'Unknown User'}</td>
                        <td>₹${payment.amount}</td>
                        <td>${payment.method}</td>
                        <td>
                            <span class="status-badge status-${(payment.status || 'unknown').toLowerCase()}">
                                ${payment.status || 'Unknown'}
                            </span>
                        </td>
                        <td>${payment.timestamp ? new Date(payment.timestamp).toLocaleString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayPendingCashPayments() {
    const container = document.getElementById('pendingCashPayments');
    const pendingCashOrders = ordersData.filter(order => 
        order.paymentMethod === 'cash' && order.paymentStatus === 'Pending'
    );
    
    if (pendingCashOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No pending cash payments</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Order Time</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${pendingCashOrders.map(order => `
                    <tr>
                        <td>${order.id.slice(-8)}</td>
                        <td>${order.userName}</td>
                        <td>₹${order.totalAmount}</td>
                        <td>${new Date(order.orderTime).toLocaleString()}</td>
                        <td>
                            <button class="btn btn-success" onclick="showCashPaymentModal('${order.id}', ${order.totalAmount})">
                                Record Payment
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayAnalytics() {
    if (!analyticsData.topSellingItems) return;
    
    // Display demand predictions
    const predictionsGrid = document.getElementById('predictionsGrid');
    const predictions = analyticsData.demandPredictions || {};
    
    if (Object.keys(predictions).length === 0) {
        predictionsGrid.innerHTML = '<p style="text-align: center; color: #666;">No prediction data available</p>';
    } else {
        predictionsGrid.innerHTML = Object.entries(predictions).map(([itemId, demand]) => {
            // Find menu item name (you'll need to load menu data)
            const itemName = `Item ${itemId}`; // Placeholder
            return `
                <div class="prediction-item fade-in">
                    <h4>${itemName}</h4>
                    <div class="prediction-value">${demand}</div>
                    <small>Expected orders</small>
                </div>
            `;
        }).join('');
    }
    
    // Display top selling items
    const topItemsChart = document.getElementById('topItemsChart');
    topItemsChart.innerHTML = analyticsData.topSellingItems.map(item => `
        <div class="prediction-item">
            <h4>${item.item ? item.item.name : 'Unknown Item'}</h4>
            <div class="prediction-value">${item.sold}</div>
            <small>Units sold</small>
        </div>
    `).join('');
}

async function updateOrderStatus(orderId, newStatus, currentStatus) {
    console.log('Updating order status:', { orderId, newStatus, currentStatus });
    
    if (newStatus === currentStatus) {
        return; // No change needed
    }
    
    // Show confirmation for critical status changes
    if (newStatus === 'Cancelled') {
        const confirmed = confirm('Are you sure you want to cancel this order? This action cannot be undone.');
        if (!confirmed) {
            // Reset the select to previous value if it exists
            if (event && event.target && event.target.tagName === 'SELECT') {
                event.target.value = currentStatus;
            }
            return;
        }
    }
    
    try {
        console.log('Sending PUT request to:', `/api/orders/${orderId}/status`);
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (response.ok && result.success) {
            showMessage(`Order status updated to ${newStatus}`, 'success');
            await loadOrders(); // Refresh orders to show updated status
        } else {
            showMessage(result.message || 'Failed to update order status', 'error');
            // Reset the select to previous value on error
            if (event && event.target && event.target.tagName === 'SELECT') {
                event.target.value = currentStatus;
            }
        }
    } catch (error) {
        console.error('Update order status error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
        // Reset the select to previous value on error
        if (event && event.target && event.target.tagName === 'SELECT') {
            event.target.value = currentStatus;
        }
    }
}

async function markOrderCompleted(orderId) {
    await updateOrderStatus(orderId, 'Completed', 'Ready');
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;
    
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = `
        <div class="form-group">
            <label>Order ID</label>
            <input type="text" value="${order.id}" readonly>
        </div>
        <div class="form-group">
            <label>Customer</label>
            <input type="text" value="${order.userName}" readonly>
        </div>
        <div class="form-group">
            <label>Order Time</label>
            <input type="text" value="${new Date(order.orderTime).toLocaleString()}" readonly>
        </div>
        <div class="form-group">
            <label>Status</label>
            <input type="text" value="${order.status}" readonly>
        </div>
        <div class="form-group">
            <label>Payment Method</label>
            <input type="text" value="${order.paymentMethod}" readonly>
        </div>
        <div class="form-group">
            <label>Payment Status</label>
            <input type="text" value="${order.paymentStatus}" readonly>
        </div>
        <div class="form-group">
            <label>Items</label>
            <div>
                ${order.items.map(item => `
                    <div class="cart-item">
                        <span>${item.name}</span>
                        <span>Qty: ${item.quantity}</span>
                        <span>₹${item.price * item.quantity}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="form-group">
            <label>Total Amount</label>
            <input type="text" value="₹${order.totalAmount}" readonly>
        </div>
    `;
    
    document.getElementById('orderModal').classList.remove('hidden');
}

function hideOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
}

function showCashPaymentModal(orderId, amount) {
    selectedOrderId = orderId;
    document.getElementById('cashAmount').value = amount;
    document.getElementById('cashPaymentModal').classList.remove('hidden');
}

function hideCashPaymentModal() {
    document.getElementById('cashPaymentModal').classList.add('hidden');
    selectedOrderId = null;
}

async function recordCashPayment() {
    if (!selectedOrderId) return;
    
    const amount = parseFloat(document.getElementById('cashAmount').value);
    
    try {
        const response = await fetch('/api/payments/cash', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: selectedOrderId,
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Cash payment recorded successfully', 'success');
            hideCashPaymentModal();
            await Promise.all([loadOrders(), loadPayments()]);
        } else {
            showMessage(result.error || 'Failed to record payment', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function filterOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const dateFilter = document.getElementById('orderDateFilter').value;
    const rows = document.querySelectorAll('#ordersTable tbody tr');
    
    rows.forEach(row => {
        let showRow = true;
        
        if (statusFilter !== 'all') {
            const rowStatus = row.dataset.status;
            if (rowStatus !== statusFilter) {
                showRow = false;
            }
        }
        
        if (dateFilter) {
            const rowDate = row.dataset.date;
            const filterDate = new Date(dateFilter).toDateString();
            if (rowDate !== filterDate) {
                showRow = false;
            }
        }
        
        row.style.display = showRow ? '' : 'none';
    });
}

function filterPayments() {
    const statusFilter = document.getElementById('paymentStatusFilter').value;
    const rows = document.querySelectorAll('#paymentsTable tbody tr');
    
    rows.forEach(row => {
        if (statusFilter === 'all' || row.dataset.status === statusFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function quickFilterOrders() {
    const filter = document.getElementById('quickStatusFilter').value;
    const rows = document.querySelectorAll('#recentOrdersTable tbody tr');
    
    rows.forEach(row => {
        const statusBadge = row.querySelector('.status-badge').textContent.trim();
        if (filter === 'all' || statusBadge === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function refreshOrders() {
    await loadOrders();
    showMessage('Orders refreshed', 'success');
}

async function refreshPredictions() {
    await loadAnalytics();
    showMessage('Predictions updated', 'success');
}

function exportOrders() {
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Order ID,Customer,Items,Amount,Payment Method,Payment Status,Order Status,Time\n" +
        ordersData.map(order => [
            order.id,
            order.userName,
            order.items.map(item => `${item.name}(${item.quantity})`).join(';'),
            order.totalAmount,
            order.paymentMethod,
            order.paymentStatus,
            order.status,
            new Date(order.orderTime).toLocaleString()
        ].join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Inventory Management Functions
let inventoryData = [];

async function loadInventory() {
    try {
        // Update the date display
        const inventoryDateElement = document.getElementById('inventoryDate');
        if (inventoryDateElement) {
            inventoryDateElement.textContent = `Today: ${new Date().toLocaleDateString()}`;
        }
        
        const response = await fetch('/api/inventory');
        if (!response.ok) {
            throw new Error('Failed to fetch inventory');
        }
        inventoryData = await response.json();
        displayInventory();
        updateInventoryStats();
    } catch (error) {
        console.error('Error loading inventory:', error);
        showMessage('Failed to load inventory data', 'error');
    }
}

function displayInventory() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    grid.innerHTML = inventoryData.map(item => `
        <div class="inventory-item ${(item.remaining_quantity || 0) === 0 ? 'out-of-stock' : (item.remaining_quantity || 0) <= 5 ? 'low-stock' : ''}">
            <div class="inventory-info">
                <h4>${item.name}</h4>
                <div class="category">${item.category}</div>
                <div class="inventory-status ${(item.remaining_quantity || 0) === 0 ? 'out-of-stock-text' : (item.remaining_quantity || 0) <= 5 ? 'low-stock' : 'in-stock'}">
                    ${(item.remaining_quantity || 0) === 0 ? 'Out of Stock' : `${item.remaining_quantity || 0} remaining`}
                </div>
            </div>
            <div class="inventory-controls">
                <label>Set Quantity:</label>
                <input type="number" 
                       value="${item.initial_quantity || 50}" 
                       min="0" 
                       max="200" 
                       onchange="updateInventoryQuantity(${item.menu_item_id}, this.value)">
                <div class="sold-info">
                    <small>Sold: ${item.sold_quantity || 0}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function updateInventoryStats() {
    const totalItems = inventoryData.length;
    const availableItems = inventoryData.filter(item => (item.remaining_quantity || 0) > 0).length;
    const outOfStockItems = inventoryData.filter(item => (item.remaining_quantity || 0) === 0).length;
    const totalRemaining = inventoryData.reduce((sum, item) => sum + (item.remaining_quantity || 0), 0);

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('availableItems').textContent = availableItems;
    document.getElementById('outOfStockItems').textContent = outOfStockItems;
    document.getElementById('totalRemaining').textContent = totalRemaining;
}

async function updateInventoryQuantity(itemId, newQuantity) {
    try {
        const response = await fetch(`/api/inventory/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantity: parseInt(newQuantity),
                date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update inventory');
        }

        showMessage('Inventory updated successfully', 'success');
        await loadInventory(); // Refresh the display
    } catch (error) {
        console.error('Error updating inventory:', error);
        showMessage('Failed to update inventory', 'error');
    }
}

async function refreshInventory() {
    await loadInventory();
    showMessage('Inventory refreshed', 'success');
}

// Add inventory to the section switching logic
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'inventory') {
        loadInventory();
    }
};

// Enhanced Security Functions for Admin
function showSessionWarning(timeRemaining) {
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const warningMessage = `⚠️ Security Notice: Your admin session will expire in ${minutes} minute(s). Save your work.`;
    
    // Create warning banner
    const warningBanner = document.createElement('div');
    warningBanner.id = 'sessionWarning';
    warningBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b35;
        color: white;
        padding: 10px;
        text-align: center;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    warningBanner.innerHTML = `
        ${warningMessage}
        <button onclick="extendSession()" style="margin-left: 15px; background: white; color: #ff6b35; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">
            Extend Session
        </button>
        <button onclick="secureLogout()" style="margin-left: 10px; background: #d32f2f; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">
            Logout Now
        </button>
    `;
    
    // Remove existing warning if any
    const existing = document.getElementById('sessionWarning');
    if (existing) existing.remove();
    
    document.body.insertBefore(warningBanner, document.body.firstChild);
}

function extendSession() {
    // In a real application, this would make a server request to validate and extend the session
    const confirmed = confirm('Do you want to extend your admin session? You will need to re-enter your security code.');
    
    if (confirmed) {
        const securityCode = prompt('Please re-enter your security code to extend the session:');
        if (securityCode === 'CANTEEN2025ADMIN') {
            // Extend session by 30 minutes
            currentUser.sessionTimeout = Date.now() + (30 * 60 * 1000);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Remove warning banner
            const warningBanner = document.getElementById('sessionWarning');
            if (warningBanner) warningBanner.remove();
            
            showMessage('Session extended successfully', 'success');
            
            // Set new timeout
            setTimeout(() => {
                alert('Your admin session has expired for security reasons.');
                localStorage.removeItem('user');
                window.location.href = '/';
            }, 30 * 60 * 1000);
        } else {
            alert('Invalid security code. Session will expire as scheduled.');
        }
    }
}

function secureLogout() {
    const confirmed = confirm('Are you sure you want to logout? Any unsaved changes will be lost.');
    if (confirmed) {
        // Clear all stored data
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // Log the logout (in production, send to server)
        console.log(`Admin logout: ${currentUser.name} at ${new Date().toISOString()}`);
        
        // Redirect to login
        window.location.href = '/';
    }
}

// Add logout button to the navigation (you might want to add this to the HTML as well)
document.addEventListener('DOMContentLoaded', function() {
    if (currentUser && currentUser.sessionTimeout) {
        // Add session info to the header
        const ownerNameElement = document.getElementById('ownerName');
        const sessionInfoElement = document.getElementById('sessionInfo');
        
        if (ownerNameElement && currentUser.accessReason) {
            ownerNameElement.title = `Session: ${currentUser.accessReason}`;
        }
        
        if (sessionInfoElement && currentUser.sessionTimeout) {
            const updateSessionInfo = () => {
                const timeRemaining = currentUser.sessionTimeout - Date.now();
                if (timeRemaining > 0) {
                    const minutes = Math.floor(timeRemaining / (1000 * 60));
                    sessionInfoElement.textContent = `Session: ${minutes}m remaining`;
                    sessionInfoElement.style.display = 'inline';
                } else {
                    sessionInfoElement.textContent = 'Session Expired';
                    sessionInfoElement.style.color = 'red';
                }
            };
            
            updateSessionInfo();
            // Update every minute
            setInterval(updateSessionInfo, 60000);
        }
    }
});
