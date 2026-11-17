const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./db');
const paymentRoutes = require('./routes/paymentRoutes'); // Puthu route

const app = express();
app.use(cors());
app.use(express.json());

// API Gateway-kaga Payment Routes-a link pandrom
app.use('/api/payments', paymentRoutes);

// Health Check
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ status: 'UP', message: 'Payment Service is running' });
    } catch (error) {
        res.status(500).json({ status: 'DOWN', message: 'DB connection failed' });
    }
});

const PORT = process.env.PORT || 5005;

// DB Sync panni Server-a start pandrom
sequelize.sync().then(() => {
    console.log("Database synced - Payments table created (if not exists)");
    app.listen(PORT, () => {
        console.log(`Payment Service running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Unable to connect to the database:", err);
});