// Initialize and manage database data for the canteen system

const DatabaseManager = require('../database/DatabaseManager');

function initializeDatabase() {
  try {
    console.log('Initializing database...');
    const db = new DatabaseManager();
    
    console.log('Database initialization completed successfully!');
    console.log('Sample data has been loaded');
    
    db.close();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

function displayDatabaseStats() {
  try {
    const db = new DatabaseManager();
    
    const userCount = db.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const menuCount = db.db.prepare('SELECT COUNT(*) as count FROM menu_items').get().count;
    const orderCount = db.db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const paymentCount = db.db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
    
    console.log('Database Statistics:');
    console.log(`Users: ${userCount}`);
    console.log(`Menu Items: ${menuCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Payments: ${paymentCount}`);
    
    db.close();
    
  } catch (error) {
    console.error('Failed to get database stats:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--stats')) {
    displayDatabaseStats();
  } else {
    initializeDatabase();
  }
}

module.exports = {
  initializeDatabase,
  displayDatabaseStats
};
