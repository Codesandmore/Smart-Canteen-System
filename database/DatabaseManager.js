const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

class DatabaseManager {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'canteen.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    this.initializeTables();
    this.insertSampleData();
  }

  initializeTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'owner')),
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Menu items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        available BOOLEAN DEFAULT 1,
        preparation_time INTEGER DEFAULT 5,
        ingredients TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'cash')),
        payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid')),
        order_status TEXT DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled')),
        estimated_time INTEGER,
        order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_time DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Order items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        menu_item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        item_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      )
    `);

    // Payments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        order_id TEXT,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Failed')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // Daily statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        total_orders INTEGER DEFAULT 0,
        total_revenue REAL DEFAULT 0,
        average_order_value REAL DEFAULT 0,
        peak_hour INTEGER,
        peak_hour_orders INTEGER DEFAULT 0
      )
    `);

    // Daily inventory table for tracking remaining quantities
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_item_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        initial_quantity INTEGER NOT NULL DEFAULT 50,
        remaining_quantity INTEGER NOT NULL DEFAULT 50,
        sold_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
        UNIQUE(menu_item_id, date)
      )
    `);

    // Hourly statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        orders_count INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        PRIMARY KEY (date, hour)
      )
    `);

    // Item sales statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS item_sales (
        date TEXT NOT NULL,
        menu_item_id INTEGER NOT NULL,
        quantity_sold INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        PRIMARY KEY (date, menu_item_id),
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      )
    `);

    console.log('Database tables initialized successfully');
  }

  insertSampleData() {
    // Check if sample data already exists
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) {
      console.log('Sample data already exists, skipping insertion');
      return;
    }

    console.log('Inserting sample data...');

    // Insert sample users
    const insertUser = this.db.prepare(`
      INSERT INTO users (id, username, password, role, name, balance, total_spent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const users = [
      ['owner001', 'manager', bcrypt.hashSync('canteen2025', 10), 'owner', 'Sarah Johnson', 0, 0],
      ['st2025101', 'ST2025101', bcrypt.hashSync('student2025', 10), 'student', 'Alex Kumar', 1000, 0],
      ['st2025102', 'ST2025102', bcrypt.hashSync('student2025', 10), 'student', 'Maria Garcia', 750, 250],
      ['st2025103', 'ST2025103', bcrypt.hashSync('student2025', 10), 'student', 'James Wilson', 500, 500]
    ];

    users.forEach(user => insertUser.run(...user));

    // Insert sample menu items
    const insertMenuItem = this.db.prepare(`
      INSERT INTO menu_items (name, price, category, available, preparation_time, ingredients)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const menuItems = [
      ['Chicken Biriyani', 150, 'Main Course', 1, 15, JSON.stringify(['rice', 'chicken', 'spices'])],
      ['Vegetable Curry', 100, 'Main Course', 1, 10, JSON.stringify(['vegetables', 'spices'])],
      ['Fried Rice', 120, 'Main Course', 1, 8, JSON.stringify(['rice', 'vegetables'])],
      ['Chicken Curry', 140, 'Main Course', 1, 12, JSON.stringify(['chicken', 'spices'])],
      ['Fish Curry', 160, 'Main Course', 1, 15, JSON.stringify(['fish', 'spices'])],
      ['Dal Rice', 80, 'Main Course', 1, 8, JSON.stringify(['dal', 'rice'])],
      
      ['Samosa', 30, 'Snacks', 1, 5, JSON.stringify(['pastry', 'filling'])],
      ['Pakora', 25, 'Snacks', 1, 5, JSON.stringify(['vegetables', 'flour'])],
      ['Sandwich', 60, 'Snacks', 1, 5, JSON.stringify(['bread', 'vegetables'])],
      ['Burger', 80, 'Snacks', 1, 8, JSON.stringify(['bun', 'patty', 'vegetables'])],
      
      ['Tea', 15, 'Beverages', 1, 3, JSON.stringify(['tea', 'milk', 'sugar'])],
      ['Coffee', 20, 'Beverages', 1, 3, JSON.stringify(['coffee', 'milk', 'sugar'])],
      ['Fresh Juice', 40, 'Beverages', 1, 2, JSON.stringify(['fruits'])],
      ['Cold Drink', 25, 'Beverages', 1, 1, JSON.stringify(['soft drink'])],
      ['Lassi', 35, 'Beverages', 1, 2, JSON.stringify(['yogurt', 'sugar'])],
      
      ['Ice Cream', 50, 'Desserts', 1, 1, JSON.stringify(['ice cream'])],
      ['Gulab Jamun', 40, 'Desserts', 1, 2, JSON.stringify(['milk solids', 'sugar syrup'])],
      ['Kheer', 45, 'Desserts', 1, 3, JSON.stringify(['rice', 'milk', 'sugar'])]
    ];

    menuItems.forEach(item => insertMenuItem.run(...item));

    // Generate sample historical data for last 7 days
    this.generateSampleHistoricalData();

    console.log('Sample data inserted successfully');
  }

  generateSampleHistoricalData() {
    const today = new Date();
    const insertDailyStat = this.db.prepare(`
      INSERT INTO daily_stats (date, total_orders, total_revenue, average_order_value, peak_hour, peak_hour_orders)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertHourlyStat = this.db.prepare(`
      INSERT INTO hourly_stats (date, hour, orders_count, revenue)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertItemSale = this.db.prepare(`
      INSERT INTO item_sales (date, menu_item_id, quantity_sold, revenue)
      VALUES (?, ?, ?, ?)
    `);

    const menuItems = this.db.prepare('SELECT id, price FROM menu_items').all();

    // Generate data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      let dailyOrders = Math.floor(Math.random() * 50) + 20;
      let dailyRevenue = 0;
      let peakHour = 13; // 1 PM
      let peakHourOrders = Math.floor(Math.random() * 15) + 10;

      // Generate hourly data
      for (let hour = 8; hour <= 20; hour++) {
        let hourlyOrders;
        if (hour >= 12 && hour <= 14) {
          hourlyOrders = Math.floor(Math.random() * 15) + 10; // Lunch rush
        } else if (hour >= 16 && hour <= 18) {
          hourlyOrders = Math.floor(Math.random() * 8) + 5; // Evening snacks
        } else {
          hourlyOrders = Math.floor(Math.random() * 3) + 1;
        }
        
        const hourlyRevenue = hourlyOrders * (Math.random() * 100 + 50);
        insertHourlyStat.run(dateStr, hour, hourlyOrders, hourlyRevenue);
        dailyRevenue += hourlyRevenue;
      }

      // Generate item sales data
      menuItems.forEach(item => {
        const quantitySold = Math.floor(Math.random() * 15) + 1;
        const itemRevenue = quantitySold * item.price;
        insertItemSale.run(dateStr, item.id, quantitySold, itemRevenue);
      });

      const averageOrderValue = dailyRevenue / dailyOrders;
      insertDailyStat.run(dateStr, dailyOrders, dailyRevenue, averageOrderValue, peakHour, peakHourOrders);
    }
  }

  // User operations
  getUserByCredentials(username, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  getUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  getUserByUsername(username) {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  createUser(username, password, role = 'student') {
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      // Generate simple ID: role prefix + 4 digit number
      const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      const userId = role === 'student' ? `S${randomNum}` : `O${randomNum}`;
      
      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, password, role, name, balance, total_spent)
        VALUES (?, ?, ?, ?, ?, 0, 0)
      `);
      
      const result = stmt.run(userId, username, hashedPassword, role, username);
      return result.changes > 0 ? userId : null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  verifyPassword(username, password) {
    const user = this.db.prepare('SELECT password FROM users WHERE username = ?').get(username);
    return user ? bcrypt.compareSync(password, user.password) : false;
  }

  updateUserPassword(userId, newPassword) {
    try {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const stmt = this.db.prepare('UPDATE users SET password = ? WHERE id = ?');
      const result = stmt.run(hashedPassword, userId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  updateUserBalance(userId, newBalance, totalSpent = null) {
    const query = totalSpent !== null 
      ? 'UPDATE users SET balance = ?, total_spent = ? WHERE id = ?'
      : 'UPDATE users SET balance = ? WHERE id = ?';
    
    const params = totalSpent !== null ? [newBalance, totalSpent, userId] : [newBalance, userId];
    return this.db.prepare(query).run(...params);
  }

  // Menu operations
  getAllMenuItems() {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize inventory for today if not exists
    this.initializeDailyInventory(today);
    
    return this.db.prepare(`
      SELECT 
        mi.id, 
        mi.name, 
        mi.price, 
        mi.category, 
        mi.available, 
        mi.preparation_time, 
        mi.ingredients,
        COALESCE(di.remaining_quantity, 0) as remaining_quantity,
        COALESCE(di.initial_quantity, 50) as initial_quantity,
        COALESCE(di.sold_quantity, 0) as sold_quantity
      FROM menu_items mi
      LEFT JOIN daily_inventory di ON mi.id = di.menu_item_id AND di.date = ?
      WHERE mi.available = 1
      ORDER BY mi.category, mi.name
    `).all(today).map(item => ({
      ...item,
      ingredients: JSON.parse(item.ingredients),
      available: item.available && item.remaining_quantity > 0
    }));
  }

  getMenuItemById(id) {
    const item = this.db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (item) {
      item.ingredients = JSON.parse(item.ingredients);
    }
    return item;
  }

  addMenuItem(itemData) {
    try {
      const { name, price, category, description, preparationTime, available } = itemData;
      const stmt = this.db.prepare(`
        INSERT INTO menu_items (name, price, category, description, preparation_time, available, ingredients)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        name, 
        price, 
        category, 
        description || '', 
        preparationTime || 15, 
        available !== false ? 1 : 0, 
        JSON.stringify([])
      );
      
      if (result.changes > 0) {
        return this.getMenuItemById(result.lastInsertRowid);
      }
      return null;
    } catch (error) {
      console.error('Error adding menu item:', error);
      return null;
    }
  }

  updateMenuItem(id, itemData) {
    try {
      const { name, price, category, description, preparationTime, available } = itemData;
      const stmt = this.db.prepare(`
        UPDATE menu_items 
        SET name = ?, price = ?, category = ?, description = ?, preparation_time = ?, available = ?
        WHERE id = ?
      `);
      
      const result = stmt.run(
        name, 
        price, 
        category, 
        description, 
        preparationTime, 
        available ? 1 : 0,
        id
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating menu item:', error);
      return false;
    }
  }

  deleteMenuItem(id) {
    try {
      // Instead of deleting, mark as unavailable to preserve order history
      const stmt = this.db.prepare('UPDATE menu_items SET available = 0 WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return false;
    }
  }

  // Order operations
  createOrder(orderData) {
    const transaction = this.db.transaction(() => {
      // Check inventory availability first
      const today = new Date().toISOString().split('T')[0];
      this.initializeDailyInventory(today);
      
      // Check if all items have sufficient quantity
      for (const item of orderData.items) {
        const remaining = this.getItemRemainingQuantity(item.id, today);
        if (remaining < item.quantity) {
          throw new Error(`Insufficient quantity for ${item.name}. Only ${remaining} left.`);
        }
      }
      
      // Insert order
      const insertOrder = this.db.prepare(`
        INSERT INTO orders (id, user_id, user_name, total_amount, payment_method, payment_status, order_status, estimated_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertOrder.run(
        orderData.id,
        orderData.userId,
        orderData.userName,
        orderData.totalAmount,
        orderData.paymentMethod,
        orderData.paymentStatus,
        orderData.orderStatus, // Changed from status to orderStatus
        orderData.estimatedTime
      );

      // Insert order items and reduce inventory
      const insertOrderItem = this.db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);

      orderData.items.forEach(item => {
        insertOrderItem.run(orderData.id, item.id, item.name, item.price, item.quantity);
        // Reduce inventory quantity
        this.reduceItemQuantity(item.id, item.quantity, today);
      });

      // Update statistics
      this.updateStatistics(orderData);
    });

    transaction();
    return orderData;
  }

  getOrderById(orderId) {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (order) {
      const items = this.db.prepare(`
        SELECT menu_item_id as id, item_name as name, item_price as price, quantity
        FROM order_items WHERE order_id = ?
      `).all(orderId);
      
      // Return with consistent camelCase field names
      return {
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        estimatedTime: order.estimated_time,
        orderTime: order.order_time,
        completedTime: order.completed_time,
        items
      };
    }
    return null;
  }

  getAllOrders(filters = {}) {
    // Simplified query without JOIN to test
    let query = `
      SELECT *
      FROM orders o
    `;
    
    const conditions = [];
    const params = [];

    if (filters.status && filters.status !== 'all') {
      conditions.push('o.order_status = ?');
      params.push(filters.status);
    }

    if (filters.date) {
      conditions.push('DATE(o.order_time) = ?');
      params.push(filters.date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.order_time DESC';

    try {
      const orders = this.db.prepare(query).all(...params);
      
      // Get items for each order separately and add user name
      return orders.map(order => {
        // Get user name separately
        const user = this.db.prepare('SELECT name FROM users WHERE id = ?').get(order.user_id);
        
        // Get items
        const items = this.db.prepare(`
          SELECT menu_item_id as id, item_name as name, item_price as price, quantity
          FROM order_items WHERE order_id = ?
        `).all(order.id);
        
        return {
          id: order.id,
          userId: order.user_id,
          userName: user ? user.name : order.user_name || 'Unknown',
          totalAmount: order.total_amount,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          orderStatus: order.order_status,
          estimatedTime: order.estimated_time,
          orderTime: order.order_time,
          completedTime: order.completed_time,
          items
        };
      });
    } catch (error) {
      console.error('Database query error in getAllOrders:', error);
      throw error;
    }
  }

  getUserOrders(userId) {
    const orders = this.db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY order_time DESC
    `).all(userId);

    return orders.map(order => {
      const items = this.db.prepare(`
        SELECT menu_item_id as id, item_name as name, item_price as price, quantity
        FROM order_items WHERE order_id = ?
      `).all(order.id);
      return {
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        estimatedTime: order.estimated_time,
        orderTime: order.order_time,
        completedTime: order.completed_time,
        items
      };
    });
  }

  updateOrderStatus(orderId, status) {
    const updateData = { order_status: status };
    if (status === 'Completed') {
      updateData.completed_time = new Date().toISOString();
    }
    
    const query = status === 'Completed' 
      ? 'UPDATE orders SET order_status = ?, completed_time = ? WHERE id = ?'
      : 'UPDATE orders SET order_status = ? WHERE id = ?';
    
    const params = status === 'Completed' 
      ? [status, updateData.completed_time, orderId]
      : [status, orderId];

    return this.db.prepare(query).run(...params);
  }

  // Payment operations
  createPayment(paymentData) {
    const insertPayment = this.db.prepare(`
      INSERT INTO payments (id, user_id, order_id, amount, method, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return insertPayment.run(
      paymentData.id,
      paymentData.userId,
      paymentData.orderId || null,
      paymentData.amount,
      paymentData.method,
      paymentData.status
    );
  }

  getAllPayments(filters = {}) {
    let query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.user_id as user_id_display
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (filters.userId) {
      conditions.push('p.user_id = ?');
      params.push(filters.userId);
    }

    if (filters.status) {
      conditions.push('p.status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.timestamp DESC';
    
    const payments = this.db.prepare(query).all(...params);
    
    // Transform the data to match frontend expectations
    return payments.map(payment => ({
      id: payment.id,
      orderId: payment.order_id,
      userId: payment.user_id,
      userName: payment.user_name || payment.user_id_display || 'Unknown User',
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      timestamp: payment.timestamp
    }));
  }

  updateOrderPaymentStatus(orderId, status) {
    return this.db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(status, orderId);
  }

  // Analytics operations
  getDemandPredictions() {
    const menuItems = this.getAllMenuItems();
    const predictions = {};
    
    // Get last 7 days of sales data
    const last7Days = this.db.prepare(`
      SELECT menu_item_id, AVG(quantity_sold) as avg_daily_sales
      FROM item_sales 
      WHERE date >= DATE('now', '-7 days')
      GROUP BY menu_item_id
    `).all();

    const currentHour = new Date().getHours();
    let timeMultiplier = 1;
    
    if (currentHour >= 12 && currentHour <= 14) timeMultiplier = 1.5; // Lunch rush
    else if (currentHour >= 16 && currentHour <= 18) timeMultiplier = 1.2; // Evening snacks

    last7Days.forEach(item => {
      const prediction = Math.ceil(item.avg_daily_sales * timeMultiplier * 1.1); // 10% buffer
      predictions[item.menu_item_id] = prediction;
    });

    return predictions;
  }

  getDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(targetDate);
  }

  getAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate real-time today's stats
    const todayOrders = this.db.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as revenue, AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE DATE(order_time) = ? AND order_status != 'Cancelled'
    `).get(today);
    
    const todayStats = {
      total_orders: todayOrders.count || 0,
      total_revenue: todayOrders.revenue || 0,
      average_order_value: todayOrders.avg_order_value || 0
    };
    
    // Get weekly trends (last 7 days)
    const weeklyTrends = this.db.prepare(`
      SELECT 
        DATE(order_time) as date,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value
      FROM orders 
      WHERE DATE(order_time) >= DATE('now', '-7 days') AND order_status != 'Cancelled'
      GROUP BY DATE(order_time)
      ORDER BY date
    `).all();

    // Get top selling items for today (from order_items)
    const topItems = this.db.prepare(`
      SELECT 
        oi.menu_item_id, 
        oi.item_name as name, 
        oi.item_price as price,
        SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.order_time) = ? AND o.order_status != 'Cancelled'
      GROUP BY oi.menu_item_id, oi.item_name, oi.item_price
      ORDER BY quantity_sold DESC
      LIMIT 5
    `).all(today);

    // Get total revenue (all time)
    const totalRevenue = this.db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM orders 
      WHERE order_status != 'Cancelled'
    `).get().total || 0;

    // Get pending payments count
    const pendingPayments = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE payment_status = 'Pending'
    `).get().count;

    // Get all-time orders count
    const totalOrders = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE order_status != 'Cancelled'
    `).get().count;

    // Get today's pending orders
    const todayPendingOrders = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE DATE(order_time) = ? AND order_status IN ('Pending', 'Confirmed', 'Preparing', 'Ready')
    `).get(today).count;

    return {
      demandPredictions: this.getDemandPredictions(),
      dailyStats: {
        ...todayStats,
        date: today,
        pending_orders: todayPendingOrders
      },
      weeklyTrends,
      topSellingItems: topItems.map(item => ({
        item: { 
          id: item.menu_item_id, 
          name: item.name, 
          price: item.price 
        },
        sold: item.quantity_sold
      })),
      pendingPayments,
      totalRevenue,
      totalOrders
    };
  }

  getUserFinancialSummary(userId) {
    const user = this.getUserById(userId);
    const userPayments = this.getAllPayments({ userId });
    const userOrders = this.getUserOrders(userId);
    const pendingOrders = userOrders.filter(o => o.payment_status === 'Pending');
    
    return {
      balance: user.balance || 0,
      totalSpent: user.total_spent || 0,
      totalOrders: userOrders.length,
      pendingPayments: pendingOrders.length,
      pendingAmount: pendingOrders.reduce((sum, order) => sum + order.total_amount, 0),
      recentTransactions: userPayments.slice(0, 10)
    };
  }

  updateStatistics(orderData) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Update daily stats
    const dailyStats = this.getDailyStats(today);
    if (dailyStats) {
      this.db.prepare(`
        UPDATE daily_stats 
        SET total_orders = total_orders + 1, 
            total_revenue = total_revenue + ?,
            average_order_value = total_revenue / total_orders
        WHERE date = ?
      `).run(orderData.totalAmount, today);
    } else {
      this.db.prepare(`
        INSERT INTO daily_stats (date, total_orders, total_revenue, average_order_value)
        VALUES (?, 1, ?, ?)
      `).run(today, orderData.totalAmount, orderData.totalAmount);
    }

    // Update hourly stats
    const hourlyStats = this.db.prepare(`
      SELECT * FROM hourly_stats WHERE date = ? AND hour = ?
    `).get(today, hour);

    if (hourlyStats) {
      this.db.prepare(`
        UPDATE hourly_stats 
        SET orders_count = orders_count + 1, revenue = revenue + ?
        WHERE date = ? AND hour = ?
      `).run(orderData.totalAmount, today, hour);
    } else {
      this.db.prepare(`
        INSERT INTO hourly_stats (date, hour, orders_count, revenue)
        VALUES (?, ?, 1, ?)
      `).run(today, hour, orderData.totalAmount);
    }

    // Update item sales
    orderData.items.forEach(item => {
      const itemSales = this.db.prepare(`
        SELECT * FROM item_sales WHERE date = ? AND menu_item_id = ?
      `).get(today, item.id);

      const itemRevenue = item.price * item.quantity;

      if (itemSales) {
        this.db.prepare(`
          UPDATE item_sales 
          SET quantity_sold = quantity_sold + ?, revenue = revenue + ?
          WHERE date = ? AND menu_item_id = ?
        `).run(item.quantity, itemRevenue, today, item.id);
      } else {
        this.db.prepare(`
          INSERT INTO item_sales (date, menu_item_id, quantity_sold, revenue)
          VALUES (?, ?, ?, ?)
        `).run(today, item.id, item.quantity, itemRevenue);
      }
    });
  }

  // Daily Inventory Management Methods
  initializeDailyInventory(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    // Get all menu items
    const menuItems = this.db.prepare('SELECT id FROM menu_items WHERE available = 1').all();
    
    menuItems.forEach(item => {
      // Check if inventory already exists for today
      const existing = this.db.prepare(`
        SELECT id FROM daily_inventory WHERE menu_item_id = ? AND date = ?
      `).get(item.id, today);
      
      if (!existing) {
        // Initialize with default quantity of 50
        this.db.prepare(`
          INSERT INTO daily_inventory (menu_item_id, date, initial_quantity, remaining_quantity)
          VALUES (?, ?, 50, 50)
        `).run(item.id, today);
      }
    });
  }

  getDailyInventory(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    // Initialize inventory for today if not exists
    this.initializeDailyInventory(today);
    
    return this.db.prepare(`
      SELECT 
        di.*,
        mi.name,
        mi.price,
        mi.category,
        mi.available as item_available
      FROM daily_inventory di
      JOIN menu_items mi ON di.menu_item_id = mi.id
      WHERE di.date = ?
      ORDER BY mi.category, mi.name
    `).all(today);
  }

  updateItemQuantity(menuItemId, newRemainingQuantity, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    const result = this.db.prepare(`
      UPDATE daily_inventory 
      SET remaining_quantity = ?,
          sold_quantity = initial_quantity - ?
      WHERE menu_item_id = ? AND date = ?
    `).run(newRemainingQuantity, newRemainingQuantity, menuItemId, today);
    
    return result.changes > 0;
  }

  reduceItemQuantity(menuItemId, quantity, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    // Get current remaining quantity
    const current = this.db.prepare(`
      SELECT remaining_quantity FROM daily_inventory 
      WHERE menu_item_id = ? AND date = ?
    `).get(menuItemId, today);
    
    if (!current || current.remaining_quantity < quantity) {
      return false; // Not enough quantity available
    }
    
    const newRemaining = current.remaining_quantity - quantity;
    return this.updateItemQuantity(menuItemId, newRemaining, today);
  }

  getItemRemainingQuantity(menuItemId, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    const result = this.db.prepare(`
      SELECT remaining_quantity FROM daily_inventory 
      WHERE menu_item_id = ? AND date = ?
    `).get(menuItemId, today);
    
    return result ? result.remaining_quantity : 0;
  }

  setInitialQuantity(menuItemId, quantity, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    
    // Initialize inventory for today if not exists
    this.initializeDailyInventory(today);
    
    const result = this.db.prepare(`
      UPDATE daily_inventory 
      SET initial_quantity = ?,
          remaining_quantity = ? - sold_quantity
      WHERE menu_item_id = ? AND date = ?
    `).run(quantity, quantity, menuItemId, today);
    
    return result.changes > 0;
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;
