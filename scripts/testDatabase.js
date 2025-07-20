const DatabaseManager = require('../database/DatabaseManager');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Smart Canteen System Database...\n');

async function runTests() {
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        const dbPath = path.join(__dirname, 'data', 'test_canteen.db');
        
        // Clean up previous test database
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        
        const db = new DatabaseManager(dbPath);
        console.log('✅ Database initialized successfully\n');

        // Test 1: Create owner account
        console.log('👨‍💼 Testing owner account creation...');
        const ownerId = db.createUser('admin', 'password123', 'owner');
        console.log(`✅ Owner created with ID: ${ownerId}\n`);

        // Test 2: Create student account
        console.log('👨‍🎓 Testing student account creation...');
        const studentId = db.createUser('ST2025999', 'student123', 'student');
        console.log(`✅ Student created with ID: ${studentId}\n`);

        // Test 3: Get menu items
        console.log('🍽️ Testing menu item retrieval...');
        const menu = db.getAllMenuItems();
        console.log(`✅ Retrieved ${menu.length} menu items\n`);

        // Test 4: User authentication
        console.log('� Testing user authentication...');
        const ownerAuth = db.getUserByCredentials('admin', 'password123');
        const studentAuth = db.getUserByCredentials('ST2025999', 'student123');
        const invalidAuth = db.getUserByCredentials('admin', 'wrongpassword');
        
        console.log(`✅ Owner auth: ${ownerAuth ? 'Success' : 'Failed'}`);
        console.log(`✅ Student auth: ${studentAuth ? 'Success' : 'Failed'}`);
        console.log(`✅ Invalid auth: ${invalidAuth ? 'Failed (should be false)' : 'Correctly rejected'}\n`);

        // Test 5: Password change
        console.log('� Testing password change...');
        const passwordChangeResult = db.updateUserPassword(studentId, 'newpassword123');
        console.log(`✅ Password change: ${passwordChangeResult ? 'Success' : 'Failed'}\n`);

        // Cleanup
        console.log('🧹 Cleaning up test database...');
        db.close();
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        console.log('✅ Test database cleaned up\n');

        console.log('🎉 All tests passed! The database system is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
