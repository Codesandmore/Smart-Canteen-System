const Database = require('better-sqlite3');
const path = require('path');

// Add daily inventory table
function addDailyInventoryTable() {
  const dbPath = path.join(__dirname, '..', 'data', 'canteen.db');
  const db = new Database(dbPath);

  try {
    console.log('Adding daily inventory table...');

    // Create daily inventory table if it doesn't exist
    db.exec(`
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

    console.log('Daily inventory table created successfully!');

    // Initialize today's inventory
    const today = new Date().toISOString().split('T')[0];
    const menuItems = db.prepare('SELECT id FROM menu_items WHERE available = 1').all();
    
    console.log(`Initializing inventory for ${menuItems.length} items for ${today}...`);
    
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO daily_inventory (menu_item_id, date, initial_quantity, remaining_quantity)
      VALUES (?, ?, 50, 50)
    `);

    menuItems.forEach(item => {
      insertStmt.run(item.id, today);
    });

    console.log('Inventory initialization completed!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  addDailyInventoryTable();
}

module.exports = { addDailyInventoryTable };
