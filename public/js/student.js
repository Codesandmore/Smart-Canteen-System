// Student Portal JavaScript

let currentUser = null;
let menuData = [];
let cart = [];
let currentSection = 'menu';
let selectedPaymentMethod = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(userData);
    if (currentUser.role !== 'student') {
        window.location.href = '/';
        return;
    }
    
    initializeApp();
    setupEventListeners();
    
    // Auto-refresh orders every 30 seconds for real-time updates
    setInterval(() => {
        if (currentSection === 'orders') {
            loadUserOrders();
        }
    }, 30000);
    
    // Auto-refresh user balance every 60 seconds
    setInterval(loadUserFinancialData, 60000);
});

function initializeApp() {
    // Set user information
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userBalance').textContent = currentUser.balance || 0;
    document.getElementById('studentName').value = currentUser.name;
    document.getElementById('studentId').value = currentUser.id;
    
    // Load initial data
    loadMenu();
    loadUserFinancialData();
    updateCartDisplay();
    
    // Setup navigation
    setupNavigation();
}

function setupEventListeners() {
    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            selectedPaymentMethod = this.dataset.method;
            document.getElementById('placeOrderBtn').disabled = false;
        });
    });

    // Change password form handler - check if form exists
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await changePassword();
        });
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('href').substring(1);
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
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
            loadUserOrders();
            break;
        case 'wallet':
            loadUserFinancialData();
            break;
    }
}

async function loadMenu() {
    try {
        const response = await fetch('/api/menu');
        menuData = await response.json();
        displayMenu();
    } catch (error) {
        showMessage('Failed to load menu', 'error');
    }
}

function displayMenu() {
    const menuGrid = document.getElementById('menuGrid');
    const categories = [...new Set(menuData.map(item => item.category))];
    
    menuGrid.innerHTML = '';
    
    categories.forEach(category => {
        const categoryItems = menuData.filter(item => item.category === category);
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'menu-category fade-in';
        
        categoryDiv.innerHTML = `
            <div class="category-header">
                <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                <div class="category-stats">
                    <span class="prediction-badge">Available: ${categoryItems.filter(item => (item.remaining_quantity || 0) > 0).length}/${categoryItems.length} items</span>
                    <span class="items-count">Total: ${categoryItems.reduce((sum, item) => sum + (item.remaining_quantity || 0), 0)} left</span>
                </div>
            </div>
            <div class="category-items">
                ${categoryItems.map(item => `
                    <div class="menu-item ${(item.remaining_quantity || 0) === 0 ? 'out-of-stock' : ''}" data-category="${category}">
                        <div class="item-info">
                            <h4>${item.name}</h4>
                            <div class="item-details">
                                <span class="item-price">₹${item.price}</span>
                                <span class="remaining-qty ${(item.remaining_quantity || 0) === 0 ? 'out-of-stock-text' : (item.remaining_quantity || 0) <= 5 ? 'low-stock' : 'in-stock'}">
                                    ${(item.remaining_quantity || 0) === 0 ? 'Not Available' : `${item.remaining_quantity || 0} left`}
                                </span>
                            </div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-control">
                                <button class="quantity-btn" onclick="decrementQuantity(${item.id})" ${getCartQuantity(item.id) === 0 ? 'disabled' : ''}>-</button>
                                <span class="quantity-display">${getCartQuantity(item.id)}</span>
                                <button class="quantity-btn" onclick="incrementQuantity(${item.id})" ${(item.remaining_quantity || 0) === 0 || getCartQuantity(item.id) >= (item.remaining_quantity || 0) ? 'disabled' : ''}>+</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        menuGrid.appendChild(categoryDiv);
    });
}function filterMenu() {
    const filter = document.getElementById('categoryFilter').value;
    const menuCategories = document.querySelectorAll('.menu-category');
    
    menuCategories.forEach(categoryDiv => {
        const categoryItems = categoryDiv.querySelectorAll('.menu-item');
        let hasVisibleItems = false;
        
        categoryItems.forEach(item => {
            if (filter === 'all' || item.dataset.category === filter) {
                item.style.display = 'flex';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide entire category if no items are visible
        categoryDiv.style.display = hasVisibleItems ? 'block' : 'none';
    });
}

function getCartQuantity(itemId) {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
}

function incrementQuantity(itemId) {
    const menuItem = menuData.find(item => item.id === itemId);
    const cartItem = cart.find(item => item.id === itemId);
    
    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({
            id: itemId,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    updateQuantityDisplay(itemId);
}

function decrementQuantity(itemId) {
    const cartItemIndex = cart.findIndex(item => item.id === itemId);
    
    if (cartItemIndex !== -1) {
        cart[cartItemIndex].quantity--;
        
        if (cart[cartItemIndex].quantity === 0) {
            cart.splice(cartItemIndex, 1);
        }
    }
    
    updateCartDisplay();
    updateQuantityDisplay(itemId);
}

function updateQuantityDisplay(itemId) {
    const quantityDisplays = document.querySelectorAll(`.menu-item .quantity-display`);
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach((menuItem, index) => {
        const itemData = menuData.find(item => item.name === menuItem.querySelector('h4').textContent);
        if (itemData && itemData.id === itemId) {
            const quantityDisplay = menuItem.querySelector('.quantity-display');
            const decrementBtn = menuItem.querySelector('.quantity-btn');
            
            quantityDisplay.textContent = getCartQuantity(itemId);
            decrementBtn.disabled = getCartQuantity(itemId) === 0;
        }
    });
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666;">Your cart is empty</p>';
        totalAmount.textContent = '0';
        checkoutBtn.disabled = true;
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong><br>
                <small>₹${item.price} × ${item.quantity}</small>
            </div>
            <div>
                <strong>₹${item.price * item.quantity}</strong>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = total;
    checkoutBtn.disabled = false;
}

function clearCart() {
    cart = [];
    updateCartDisplay();
    
    // Reset all quantity displays
    document.querySelectorAll('.quantity-display').forEach(display => {
        display.textContent = '0';
    });
    
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        if (btn.textContent === '-') {
            btn.disabled = true;
        }
    });
}

function showCheckout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').textContent = total;
    document.getElementById('walletBalance').textContent = currentUser.balance || 0;
    
    // Reset payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.classList.remove('selected');
    });
    selectedPaymentMethod = null;
    document.getElementById('placeOrderBtn').disabled = true;
    
    document.getElementById('checkoutModal').classList.remove('hidden');
}

function hideCheckout() {
    document.getElementById('checkoutModal').classList.add('hidden');
}

async function placeOrder() {
    if (!selectedPaymentMethod || cart.length === 0) {
        showMessage('Please select a payment method and add items to cart', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('Order placement debug:', { 
        selectedPaymentMethod, 
        total, 
        currentUserBalance: currentUser.balance,
        cartItems: cart.length 
    });
    
    // Enhanced balance check with specific error message
    if (selectedPaymentMethod === 'wallet' && total > parseFloat(currentUser.balance || 0)) {
        const userBalance = parseFloat(currentUser.balance || 0);
        const shortfall = total - userBalance;
        console.log('Insufficient balance detected:', { total, balance: userBalance, shortfall });
        showMessage(`Insufficient wallet balance. You need ₹${shortfall.toFixed(2)} more. Please add money to your wallet.`, 'error');
        return;
    }
    
    const orderData = {
        userId: currentUser.id,
        items: cart,
        totalAmount: total,
        paymentMethod: selectedPaymentMethod
    };
    
    // Disable button to prevent double submission
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing Order...';
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage(`Order placed successfully! Order ID: ${result.orderId}. Estimated time: ${result.estimatedTime} minutes`, 'success');
            
            // Update user balance if wallet payment
            if (selectedPaymentMethod === 'wallet') {
                currentUser.balance = result.newBalance;
                document.getElementById('userBalance').textContent = `₹${currentUser.balance.toFixed(2)}`;
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Update wallet balance display in checkout modal too
                document.getElementById('walletBalance').textContent = currentUser.balance.toFixed(2);
            }
            
            clearCart();
            hideCheckout();
            
            // Auto-switch to orders page to show the new order
            showSection('orders');
            loadUserOrders(); // Refresh orders immediately
        } else {
            // Handle different types of errors
            if (response.status === 400 && result.error.includes('Insufficient balance')) {
                showMessage(result.error, 'error');
            } else if (response.status === 404) {
                showMessage('User not found. Please log in again.', 'error');
            } else {
                showMessage(result.error || result.message || 'Failed to place order', 'error');
            }
        }
    } catch (error) {
        console.error('Order placement error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Re-enable button
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

async function loadUserOrders() {
    try {
        const response = await fetch(`/api/orders/user/${currentUser.id}`);
        const orders = await response.json();
        
        // Check for status changes and show notifications
        checkForOrderStatusChanges(orders);
        
        displayUserOrders(orders);
    } catch (error) {
        showMessage('Failed to load orders', 'error');
    }
}

// Track order statuses for notifications
let previousOrderStatuses = {};

function checkForOrderStatusChanges(orders) {
    orders.forEach(order => {
        const orderId = order.id;
        const currentStatus = order.orderStatus;
        const previousStatus = previousOrderStatuses[orderId];
        
        // If status changed, show notification
        if (previousStatus && previousStatus !== currentStatus) {
            showOrderStatusNotification(order, previousStatus, currentStatus);
        }
        
        // Update tracked status
        previousOrderStatuses[orderId] = currentStatus;
    });
}

function showOrderStatusNotification(order, oldStatus, newStatus) {
    const statusMessages = {
        'Confirmed': '✅ Your order has been confirmed by the owner!',
        'Preparing': '👨‍🍳 Your order is being prepared!',
        'Ready': '🔔 Your order is ready for pickup!',
        'Completed': '✅ Your order has been completed!',
        'Cancelled': '❌ Your order has been cancelled.'
    };
    
    const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
    const type = newStatus === 'Cancelled' ? 'error' : 'success';
    
    showMessage(`Order ${order.id.slice(-8)}: ${message}`, type);
}

function displayUserOrders(orders) {
    const container = document.getElementById('ordersContainer');
    
    // Filter out completed orders older than 1 hour
    const currentTime = new Date();
    const recentOrders = orders.filter(order => {
        if (order.orderStatus === 'Completed' && order.completedTime) {
            const completedTime = new Date(order.completedTime);
            const timeDiff = (currentTime - completedTime) / (1000 * 60); // minutes
            return timeDiff <= 60; // Show completed orders for 1 hour
        }
        return true; // Show all non-completed orders
    });
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No recent orders found</p>';
        return;
    }

    // Group orders by status
    const activeOrders = recentOrders.filter(order => ['Pending', 'Preparing'].includes(order.orderStatus));
    const completedOrders = recentOrders.filter(order => order.orderStatus === 'Completed');
    const cancelledOrders = recentOrders.filter(order => order.orderStatus === 'Cancelled');

    let html = '';

    // Active Orders Section
    if (activeOrders.length > 0) {
        html += `
            <div class="order-section">
                <h3 style="color: var(--info-color); margin-bottom: 1rem;">🔄 Active Orders (${activeOrders.length})</h3>
                ${renderOrdersTable(activeOrders, false)}
            </div>
        `;
    }

    // Completed Orders Section
    if (completedOrders.length > 0) {
        html += `
            <div class="order-section">
                <h3 style="color: var(--success-color); margin-bottom: 1rem;">✅ Completed Orders (${completedOrders.length})</h3>
                ${renderOrdersTable(completedOrders, false)}
            </div>
        `;
    }

    // Cancelled Orders Section
    if (cancelledOrders.length > 0) {
        html += `
            <div class="order-section">
                <h3 style="color: var(--danger-color); margin-bottom: 1rem;">❌ Cancelled Orders (${cancelledOrders.length})</h3>
                ${renderOrdersTable(cancelledOrders, false)}
            </div>
        `;
    }

    container.innerHTML = html;
    
    // Start countdown timer for active orders
    if (activeOrders.length > 0) {
        startOrderCountdowns();
    }
}

function renderOrdersTable(orders, showTimeLeft) {
    return `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    ${showTimeLeft ? '<th>Time Left</th>' : '<th>Order Time</th>'}
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => {
                    const timeLeft = calculateTimeLeft(order);
                    return `
                    <tr data-order-id="${order.id}" class="${order.order_status === 'Completed' ? 'order-completed' : ''}">
                        <td><strong>${order.id}</strong></td>
                        <td>
                            <div class="order-items-list">
                                ${order.items.map(item => `
                                    <div class="order-item-detail">
                                        <strong>${item.name}</strong> × ${item.quantity}
                                    </div>
                                `).join('')}
                            </div>
                        </td>
                        <td><strong>₹${order.totalAmount}</strong></td>
                        <td>
                            <span class="status-badge ${order.paymentStatus === 'Paid' ? 'status-completed' : 'status-pending'}">
                                ${order.paymentStatus}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge status-${order.orderStatus.toLowerCase()}">
                                ${order.orderStatus}
                            </span>
                        </td>
                        <td class="${showTimeLeft ? 'time-left' : ''}" ${showTimeLeft ? `data-order-time="${order.orderTime}" data-estimated-time="${order.estimatedTime}"` : ''}>
                            ${showTimeLeft ? timeLeft : new Date(order.orderTime).toLocaleString()}
                        </td>
                    </tr>
                `;}).join('')}
            </tbody>
        </table>
    `;
}

function calculateTimeLeft(order) {
    if (order.orderStatus === 'Completed') {
        return '<span style="color: var(--success-color); font-weight: bold;">Order Ready!</span>';
    }
    
    if (order.orderStatus === 'Cancelled') {
        return '<span style="color: var(--danger-color); font-weight: bold;">Cancelled</span>';
    }
    
    const orderTime = new Date(order.orderTime);
    const currentTime = new Date();
    const elapsedMinutes = Math.floor((currentTime - orderTime) / (1000 * 60));
    const estimatedTime = order.estimatedTime || 15;
    const timeLeft = estimatedTime - elapsedMinutes;
    
    if (timeLeft <= 0) {
        return '<span style="color: var(--warning-color); font-weight: bold;">Order Completed!</span>';
    }
    
    return `<span style="color: var(--info-color); font-weight: bold;">${timeLeft} min</span>`;
}

function startOrderCountdowns() {
    // Clear any existing timers
    if (window.orderTimer) {
        clearInterval(window.orderTimer);
    }
    
    window.orderTimer = setInterval(() => {
        const timeLeftCells = document.querySelectorAll('.time-left');
        let hasActiveOrders = false;
        
        timeLeftCells.forEach(cell => {
            const orderTime = new Date(cell.dataset.orderTime);
            const estimatedTime = parseInt(cell.dataset.estimatedTime) || 15;
            const currentTime = new Date();
            const elapsedMinutes = Math.floor((currentTime - orderTime) / (1000 * 60));
            const timeLeft = estimatedTime - elapsedMinutes;
            
            const row = cell.closest('tr');
            const statusBadge = row.querySelector('.status-badge');
            const orderStatus = statusBadge.textContent.trim();
            
            if (orderStatus === 'Completed') {
                cell.innerHTML = '<span style="color: var(--success-color); font-weight: bold;">Order Ready!</span>';
            } else if (orderStatus === 'Cancelled') {
                cell.innerHTML = '<span style="color: var(--danger-color); font-weight: bold;">Cancelled</span>';
            } else if (timeLeft <= 0) {
                cell.innerHTML = '<span style="color: var(--warning-color); font-weight: bold;">Order Completed!</span>';
                hasActiveOrders = true;
            } else {
                cell.innerHTML = `<span style="color: var(--info-color); font-weight: bold;">${timeLeft} min</span>`;
                hasActiveOrders = true;
            }
        });
        
        // If no active orders, clear the timer
        if (!hasActiveOrders) {
            clearInterval(window.orderTimer);
        }
    }, 30000); // Update every 30 seconds
}

function filterOrders() {
    const filter = document.getElementById('orderStatusFilter').value;
    const rows = document.querySelectorAll('.orders-table tbody tr');
    
    rows.forEach(row => {
        const status = row.querySelector('.status-badge').textContent.trim();
        if (filter === 'all' || status === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function loadUserFinancialData() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/financial`);
        const financial = await response.json();
        
        document.getElementById('currentBalance').textContent = `₹${financial.balance}`;
        document.getElementById('totalSpent').textContent = `₹${financial.totalSpent}`;
        document.getElementById('pendingPayments').textContent = financial.pendingPayments;
        
        // Update current user data
        currentUser.balance = parseFloat(financial.balance || 0);
        document.getElementById('userBalance').textContent = currentUser.balance.toFixed(2);
        
        displayTransactions(financial.recentTransactions);
    } catch (error) {
        showMessage('Failed to load financial data', 'error');
    }
}

function displayTransactions(transactions) {
    const list = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #666;">No transactions found</p>';
        return;
    }
    
    list.innerHTML = transactions.map(transaction => `
        <div class="cart-item">
            <div>
                <strong>${transaction.method === 'wallet_topup' ? 'Wallet Top-up' : 'Order Payment'}</strong><br>
                <small>${new Date(transaction.timestamp).toLocaleDateString()}</small>
            </div>
            <div class="item-price">
                ${transaction.method === 'wallet_topup' ? '+' : '-'}₹${transaction.amount}
            </div>
        </div>
    `).join('');
}

async function addMoney() {
    const amount = parseFloat(document.getElementById('addAmount').value);
    
    if (!amount || amount <= 0 || amount > 10000) {
        showMessage('Please enter a valid amount (1-10000)', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/wallet/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser.balance = result.newBalance;
            document.getElementById('userBalance').textContent = result.newBalance;
            document.getElementById('addAmount').value = '';
            localStorage.setItem('user', JSON.stringify(currentUser));
            loadUserFinancialData();
            showMessage(`₹${amount} added to wallet successfully!`, 'success');
        } else {
            showMessage(result.error || 'Failed to add money', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function changePassword() {
    console.log('Change password function called');
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    console.log('Form values:', { currentPassword: '***', newPassword: '***', confirmNewPassword: '***' });
    
    if (newPassword !== confirmNewPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long', 'error');
        return;
    }
    
    if (!currentUser || !currentUser.id) {
        showMessage('User not logged in properly', 'error');
        return;
    }
    
    try {
        console.log('Sending request to server with userId:', currentUser.id);
        
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            showMessage('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showMessage(result.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Show/hide change password form
function toggleChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const isHidden = form.style.display === 'none' || form.style.display === '';
    form.style.display = isHidden ? 'block' : 'none';
}

// Profile Management
function showProfile() {
    if (!currentUser) {
        showMessage('Please log in to view profile', 'error');
        return;
    }

    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileAccountNumber').textContent = currentUser.account_number;
    document.getElementById('profileRole').textContent = currentUser.role || 'Student';
    document.getElementById('profileBalance').textContent = `₹${(currentUser.balance || 0).toFixed(2)}`;
    
    showSection('profile');
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

function showMessage(text, type) {
    console.log('showMessage called:', { text, type });
    const messageDiv = document.getElementById('message');
    if (!messageDiv) {
        console.error('Message div not found!');
        return;
    }
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    console.log('Message div updated:', messageDiv.className, messageDiv.textContent);
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}
