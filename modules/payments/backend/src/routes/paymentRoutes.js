// const express = require('express');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Payment = require('../models/Payment');
// require('dotenv').config();

// const router = express.Router();

// // Stripe Payment Intent Create Pannurathu
// router.post('/create-payment-intent', async (req, res) => {
//     try {
//         const { amount, shopzoneOrderId } = req.body;
        
//         // Stripe paise (cents) la amount edukkum
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: Math.round(amount * 100), 
//             currency: 'inr',
//             payment_method_types: ['card'],
//             metadata: { shopzoneOrderId }
//         });

//         // Database-la record create pandrom
//         await Payment.create({
//             shopzoneOrderId,
//             razorpayOrderId: paymentIntent.id, // ID column name apdiye irukkattum
//             amount: amount,
//             status: 'created'
//         });

//         // Frontend-ku clientSecret anuppurom (ithu thaan payment panna help pannum)
//         res.status(200).json({ clientSecret: paymentIntent.client_secret });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// });

// module.exports = router;

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
require('dotenv').config();

const router = express.Router();

// Stripe Payment Intent Create Pannurathu
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, shopzoneOrderId } = req.body;
        
        // Stripe paise (cents) la amount edukkum
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), 
            currency: 'inr',
            // payment_method_types-ku bathila itha add panni irukkom:
            automatic_payment_methods: { enabled: true },
            metadata: { shopzoneOrderId }
        });

        // Database-la record create pandrom
        await Payment.create({
            shopzoneOrderId,
            razorpayOrderId: paymentIntent.id, // ID column name apdiye irukkattum
            amount: amount,
            status: 'created'
        });

        // Frontend-ku clientSecret anuppurom (ithu thaan payment panna help pannum)
        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;