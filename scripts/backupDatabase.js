// Database backup utility
const fs = require('fs');
const path = require('path');
const DatabaseManager = require('../database/DatabaseManager');

function backupDatabase() {
  try {
    const db = new DatabaseManager();
    const backupDir = path.join(__dirname, '..', 'backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `canteen_backup_${timestamp}.db`);
    const sourcePath = path.join(__dirname, '..', 'data', 'canteen.db');
    
    // Copy database file
    fs.copyFileSync(sourcePath, backupPath);
    
    console.log(`Database backup created: ${backupPath}`);
    
    // Export data as JSON for additional backup
    const jsonBackupPath = path.join(backupDir, `canteen_data_${timestamp}.json`);
    
    const backupData = {
      users: db.db.prepare('SELECT * FROM users').all(),
      menuItems: db.db.prepare('SELECT * FROM menu_items').all(),
      orders: db.db.prepare('SELECT * FROM orders').all(),
      orderItems: db.db.prepare('SELECT * FROM order_items').all(),
      payments: db.db.prepare('SELECT * FROM payments').all(),
      dailyStats: db.db.prepare('SELECT * FROM daily_stats').all(),
      hourlyStats: db.db.prepare('SELECT * FROM hourly_stats').all(),
      itemSales: db.db.prepare('SELECT * FROM item_sales').all(),
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(jsonBackupPath, JSON.stringify(backupData, null, 2));
    console.log(`JSON backup created: ${jsonBackupPath}`);
    
    db.close();
    
    // Clean up old backups (keep only last 10)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('canteen_backup_'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 10) {
      const filesToDelete = backupFiles.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`Deleted old backup: ${file}`);
      });
    }
    
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };
