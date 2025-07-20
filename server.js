const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const DatabaseManager = require('./database/DatabaseManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new DatabaseManager();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Update demand predictions every hour
cron.schedule('0 * * * *', () => {
  console.log('Updating demand predictions...');
  // Predictions are calculated dynamically in the database
});

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Test database connection
    const testQuery = db.db.prepare('SELECT COUNT(*) as count FROM orders').get();
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      orderCount: testQuery.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve student interface
app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// Serve owner interface
app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

// Authentication
app.post('/api/login', (req, res) => {
  try {
    const { username, password, role, securityCode, accessReason } = req.body;
    
    // Enhanced logging for admin access
    if (role === 'admin') {
      console.log(`🔒 Admin login attempt: ${username} at ${new Date().toISOString()}`);
      console.log(`📋 Access reason: ${accessReason}`);
      
      // Additional server-side security validation
      const ADMIN_SECURITY_CODE = 'CANTEEN2025ADMIN';
      if (securityCode !== ADMIN_SECURITY_CODE) {
        console.log(`❌ Invalid security code for admin login: ${username}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid security credentials' 
        });
      }
      
      if (!accessReason) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access reason required for admin login' 
        });
      }
    }
    
    const user = db.getUserByCredentials(username, password);
    
    if (user) {
      // Additional check for admin role
      if (role === 'admin' && user.role !== 'owner') {
        console.log(`❌ Role mismatch for admin login: ${username} (user role: ${user.role})`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid admin credentials' 
        });
      }
      
      // Log successful admin access
      if (role === 'admin') {
        console.log(`✅ Admin login successful: ${username} - Reason: ${accessReason}`);
        
        // Store admin session info (in production, use proper session management)
        // You could log this to a database for audit trails
      }
      
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          name: user.name, 
          role: user.role, 
          balance: user.balance || 0,
          totalSpent: user.total_spent || 0
        } 
      });
    } else {
      console.log(`❌ Invalid credentials: ${username}`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Student Registration
app.post('/api/register', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate student account number format
    if (!username.match(/^ST[0-9]{7}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid account number format. Use ST followed by 7 digits (e.g., ST2025001)' 
      });
    }
    
    // Check if account number already exists
    const existingUser = db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Account number already registered' 
      });
    }
    
    // Create student account
    const userId = db.createUser(username, password, 'student');
    
    if (userId) {
      res.json({ 
        success: true, 
        message: 'Student account created successfully',
        userId: userId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create account' 
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Change Password
app.post('/api/change-password', (req, res) => {
  try {
    console.log('Change password request received:', req.body);
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Get user by ID
    const user = db.getUserById(userId);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = db.verifyPassword(user.username, currentPassword);
    console.log('Current password valid:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Update password
    const success = db.updateUserPassword(userId, newPassword);
    console.log('Password update result:', success);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Password changed successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to change password' 
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during password change' 
    });
  }
});

// Get menu items with demand predictions
app.get('/api/menu', (req, res) => {
  try {
    const menuItems = db.getAllMenuItems();
    const predictions = db.getDemandPredictions();
    
    const menuWithPredictions = menuItems.map(item => ({
      ...item,
      predictedDemand: predictions[item.id] || 0,
      recommendedStock: Math.max(predictions[item.id] || 0, 5)
    }));
    
    res.json(menuWithPredictions);
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Add menu item (owner only)
app.post('/api/menu', (req, res) => {
  try {
    const { name, price, category, description, preparationTime } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, price, category' 
      });
    }
    
    const menuItem = db.addMenuItem({
      name,
      price: parseFloat(price),
      category,
      description: description || '',
      preparationTime: parseInt(preparationTime) || 15,
      available: true
    });
    
    if (menuItem) {
      res.json({ 
        success: true, 
        message: 'Menu item added successfully',
        item: menuItem
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add menu item' 
      });
    }
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding menu item' 
    });
  }
});

// Update menu item (owner only)
app.put('/api/menu/:id', (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, price, category, description, preparationTime, available } = req.body;
    
    const updated = db.updateMenuItem(itemId, {
      name,
      price: parseFloat(price),
      category,
      description,
      preparationTime: parseInt(preparationTime),
      available
    });
    
    if (updated) {
      res.json({ 
        success: true, 
        message: 'Menu item updated successfully' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating menu item' 
    });
  }
});

// Delete menu item (owner only)
app.delete('/api/menu/:id', (req, res) => {
  try {
    const itemId = req.params.id;
    const deleted = db.deleteMenuItem(itemId);
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: 'Menu item deleted successfully' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting menu item' 
    });
  }
});

// Place order with payment processing
app.post('/api/orders', (req, res) => {
  try {
    const { userId, items, totalAmount, paymentMethod } = req.body;
    
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check balance for wallet payments
    if (paymentMethod === 'wallet' && user.balance < totalAmount) {
      const shortfall = (totalAmount - user.balance).toFixed(2);
      return res.status(400).json({ 
        success: false,
        error: `Insufficient balance. You have ₹${user.balance.toFixed(2)} but need ₹${totalAmount.toFixed(2)}. Please add ₹${shortfall} to your wallet.`
      });
    }
    
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderId = `ORD${timestamp}${random}`;
    const order = {
      id: orderId,
      userId,
      userName: user.name,
      items,
      totalAmount,
      paymentMethod,
      orderStatus: 'Pending', // Use orderStatus to match database field
      estimatedTime: Math.max(...items.map(item => {
        const menuItem = db.getMenuItemById(item.id);
        return menuItem ? menuItem.preparation_time : 5;
      })) + 5, // Add 5 minutes buffer
      paymentStatus: paymentMethod === 'cash' ? 'Pending' : 'Paid'
    };
    
    // Create order in database
    const createdOrder = db.createOrder(order);
    
    // Process payment
    if (paymentMethod === 'wallet') {
      const newBalance = user.balance - totalAmount;
      const newTotalSpent = (user.total_spent || 0) + totalAmount;
      
      db.updateUserBalance(userId, newBalance, newTotalSpent);
      
      // Record payment
      db.createPayment({
        id: uuidv4(),
        userId,
        orderId: order.id,
        amount: totalAmount,
        method: 'wallet',
        status: 'Completed'
      });
      
      res.json({ 
        success: true, 
        orderId: order.id, 
        estimatedTime: order.estimatedTime,
        newBalance: newBalance,
        message: 'Order placed successfully!' 
      });
    } else {
      res.json({ 
        success: true, 
        orderId: order.id, 
        estimatedTime: order.estimatedTime,
        newBalance: user.balance,
        message: 'Order placed successfully!' 
      });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders
app.get('/api/orders/user/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const userOrders = db.getUserOrders(userId);
    res.json(userOrders);
  } catch (error) {
    console.error('User orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get all orders (for owner)
app.get('/api/orders', (req, res) => {
  try {
    console.log('Orders API called with query:', req.query);
    const { status, date } = req.query;
    const filters = {};
    
    if (status && status !== 'all') {
      filters.status = status;
    }

    if (date) {
      filters.date = date;
    }

    console.log('Calling db.getAllOrders with filters:', filters);
    const orders = db.getAllOrders(filters);
    console.log(`Successfully retrieved ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});// Update order status
app.put('/api/orders/:id/status', (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Validate status transitions
    const validTransitions = {
      'Pending': ['Confirmed', 'Cancelled'],
      'Confirmed': ['Preparing', 'Cancelled'],
      'Preparing': ['Ready', 'Cancelled'],
      'Ready': ['Completed'],
      'Completed': [],
      'Cancelled': []
    };
    
    if (!validTransitions[order.orderStatus]?.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot change status from ${order.orderStatus} to ${status}` 
      });
    }
    
    const updated = db.updateOrderStatus(orderId, status);
    
    if (updated) {
      res.json({ 
        success: true, 
        message: 'Order status updated successfully',
        newStatus: status
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update order status' 
      });
    }
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating order status' 
    });
  }
});

// Payment management
app.get('/api/payments', (req, res) => {
  try {
    const { userId, status } = req.query;
    const filters = {};
    
    if (userId) filters.userId = userId;
    if (status) filters.status = status;
    
    const payments = db.getAllPayments(filters);
    res.json(payments);
  } catch (error) {
    console.error('Payments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Add money to wallet
app.post('/api/wallet/add', (req, res) => {
  try {
    const { userId, amount } = req.body;
    const user = db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newBalance = (user.balance || 0) + amount;
    db.updateUserBalance(userId, newBalance);
    
    // Record payment
    db.createPayment({
      id: uuidv4(),
      userId,
      amount,
      method: 'wallet_topup',
      status: 'Completed'
    });
    
    res.json({ success: true, newBalance });
  } catch (error) {
    console.error('Wallet add error:', error);
    res.status(500).json({ error: 'Failed to add money to wallet' });
  }
});

// Process cash payment
app.post('/api/payments/cash', (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const order = db.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    db.updateOrderPaymentStatus(orderId, 'Paid');
    
    db.createPayment({
      id: uuidv4(),
      userId: order.user_id,
      orderId: order.id,
      amount,
      method: 'cash',
      status: 'Completed'
    });
    
    res.json({ success: true, message: 'Cash payment recorded' });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ error: 'Failed to record cash payment' });
  }
});

// Get analytics and predictions
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = db.getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get user financial summary
app.get('/api/users/:userId/financial', (req, res) => {
  try {
    const userId = req.params.userId;
    const financial = db.getUserFinancialSummary(userId);
    res.json(financial);
  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});

// Inventory management endpoints
app.get('/api/inventory', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const inventory = db.getDailyInventory(date);
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.put('/api/inventory/:itemId', (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { quantity, date } = req.body;
    
    const success = db.setInitialQuantity(itemId, quantity, date);
    
    if (success) {
      res.json({ success: true, message: 'Quantity updated successfully' });
    } else {
      res.status(400).json({ error: 'Failed to update quantity' });
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Smart Canteen System running on http://localhost:${PORT}`);
  console.log(`Login Page: http://localhost:${PORT}`);
  console.log(`Student Interface: http://localhost:${PORT}/student`);
  console.log(`Owner Interface: http://localhost:${PORT}/owner`);
  console.log('Database initialized and ready!');
});
