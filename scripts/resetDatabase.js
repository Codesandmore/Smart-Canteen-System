// Database reset utility
const fs = require('fs');
const path = require('path');
const DatabaseManager = require('../database/DatabaseManager');

function resetDatabase() {
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'canteen.db');
    
    // Create backup before reset
    if (fs.existsSync(dbPath)) {
      const { backupDatabase } = require('./backupDatabase');
      console.log('Creating backup before reset...');
      backupDatabase();
    }
    
    // Delete existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Existing database deleted');
    }
    
    // Create new database with fresh data
    console.log('Creating new database...');
    const db = new DatabaseManager();
    
    console.log('Database reset completed successfully!');
    console.log('New database created with sample data');
    
    db.close();
    
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  console.log('WARNING: This will delete all existing data!');
  console.log('A backup will be created before proceeding.');
  
  // In production, you might want to add a confirmation prompt here
  resetDatabase();
}

module.exports = { resetDatabase };
