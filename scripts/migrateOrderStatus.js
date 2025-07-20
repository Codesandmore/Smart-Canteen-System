const Database = require('better-sqlite3');
const path = require('path');

// Migrate the orders table to support new order statuses
function migrateOrderStatus() {
  const dbPath = path.join(__dirname, '..', 'data', 'canteen.db');
  const db = new Database(dbPath);

  try {
    console.log('Starting order status migration...');

    // Disable foreign key constraints temporarily
    db.exec('PRAGMA foreign_keys = OFF');

    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Create new orders table with updated status constraints
    db.exec(`
      CREATE TABLE orders_new (
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

    // Copy data from old table to new table
    db.exec(`
      INSERT INTO orders_new 
      SELECT * FROM orders
    `);

    // Drop old table and rename new table
    db.exec('DROP TABLE orders');
    db.exec('ALTER TABLE orders_new RENAME TO orders');

    // Recreate any indexes that might have existed
    // (Add any indexes here if needed)

    // Commit transaction
    db.exec('COMMIT');

    // Re-enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON');

    console.log('Order status migration completed successfully!');
    console.log('New allowed statuses: Pending, Confirmed, Preparing, Ready, Completed, Cancelled');

  } catch (error) {
    console.error('Migration failed:', error);
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateOrderStatus();
}

module.exports = { migrateOrderStatus };
