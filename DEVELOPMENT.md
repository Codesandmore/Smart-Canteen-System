# Smart Canteen System - Development Guide

## 🚀 Quick Start

### Windows Setup (Automated)
```bash
# Run the automated setup script
.\setup.bat
```

### Manual Setup
```bash
# Install dependencies
npm install

# Initialize database with sample data
npm run init-db

# Start the server
npm start
```

## 🧪 Testing

### Database Testing
```bash
# Run comprehensive database tests
npm test
```

### Manual Testing
1. Create user accounts through the registration system
2. Test login functionality with created accounts

## 🛠️ Development Commands

### Database Management
```bash
# Initialize database with sample data
npm run init-db

# Create database backup
npm run backup-db

# Reset database (WARNING: Deletes all data)
npm run reset-db

# Test database functionality
npm test
```

### Server Management
```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev
```

## 📁 Project Structure

```
Canteen_System/
├── server.js              # Main application server
├── DatabaseManager.js     # Database operations and schema
├── package.json           # Node.js dependencies and scripts
├── README.md              # Project documentation
├── .env.example           # Environment configuration template
├── setup.bat              # Windows automated setup script
├── public/                # Frontend files
│   ├── login.html         # Authentication page
│   ├── student.html       # Student ordering interface
│   ├── owner.html         # Owner management dashboard
│   ├── css/
│   │   └── style.css      # Application styles
│   └── js/
│       ├── student.js     # Student functionality
│       └── owner.js       # Owner functionality
├── scripts/               # Utility scripts
│   ├── initializeData.js  # Database initialization
│   ├── backupDatabase.js  # Database backup utility
│   ├── resetDatabase.js   # Database reset utility
│   └── testDatabase.js    # Database testing suite
└── data/                  # Database files (auto-created)
    ├── canteen.db         # Main SQLite database
    └── backups/           # Database backups
```

## 🗃️ Database Schema

### Tables
1. **users** - User accounts (students and owners)
2. **menu_items** - Available food items
3. **orders** - Customer orders
4. **order_items** - Individual items within orders
5. **payments** - Payment transactions
6. **demand_predictions** - AI-predicted demand for items
7. **daily_stats** - Daily sales statistics
8. **analytics_cache** - Cached analytics data

### Key Features
- **User Authentication**: Secure password hashing with bcrypt
- **Order Management**: Complete order lifecycle tracking
- **Payment Processing**: Multiple payment method support
- **Demand Prediction**: Historical data analysis for forecasting
- **Analytics**: Revenue, sales, and performance metrics
- **Automated Backups**: Scheduled database backups

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Copy the example file and customize
cp .env.example .env
```

Key settings:
- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: SQLite database file location
- `BCRYPT_ROUNDS`: Password hashing strength
- `ENABLE_DEMAND_PREDICTION`: Enable/disable AI predictions

## 🔍 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration

### Menu Management
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add new menu item (owner only)
- `PUT /api/menu/:id` - Update menu item (owner only)
- `DELETE /api/menu/:id` - Delete menu item (owner only)

### Order Management
- `GET /api/orders` - Get orders (filtered by user role)
- `POST /api/orders` - Place new order
- `PUT /api/orders/:id/status` - Update order status (owner only)

### Payment Processing
- `POST /api/payments` - Process payment
- `GET /api/payments` - Get payment history

### Analytics
- `GET /api/analytics` - Get business analytics (owner only)
- `GET /api/predictions` - Get demand predictions (owner only)

## 🐛 Debugging

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check if database file exists
   ls -la data/canteen.db
   
   # Reinitialize database
   npm run reset-db
   npm run init-db
   ```

2. **Permission Errors**
   ```bash
   # Ensure data directory exists and is writable
   mkdir -p data
   chmod 755 data
   ```

3. **Port Already in Use**
   ```bash
   # Change port in .env file or kill existing process
   lsof -ti:3000 | xargs kill -9
   ```

### Logging
- Server logs are displayed in console
- Database operations are logged with details
- Enable debug mode in `.env` for verbose logging

## 🚀 Deployment

### Production Setup
1. Clone the repository
2. Run `npm install --production`
3. Configure `.env` file
4. Run `npm run init-db`
5. Start with `npm start`

### Recommended Production Settings
- Use PM2 for process management
- Set up nginx reverse proxy
- Enable HTTPS with SSL certificates
- Configure automated backups
- Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check this development guide
2. Run the test suite: `npm test`
3. Review server logs for error details
4. Check database integrity with backup tools
