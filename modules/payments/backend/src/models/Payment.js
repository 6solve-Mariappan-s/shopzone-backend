const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Payment = sequelize.define('Payment', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    shopzoneOrderId: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }, // Unga Checkout API tharra order ID
    razorpayOrderId: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    razorpayPaymentId: { 
        type: DataTypes.STRING 
    },
    amount: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    },
    status: { 
        type: DataTypes.ENUM('created', 'success', 'failed'), 
        defaultValue: 'created' 
    }
}, {
    tableName: 'payments',
    timestamps: true
});

module.exports = Payment;