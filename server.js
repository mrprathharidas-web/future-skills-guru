// server/server.js
// Minimal Express backend to create Razorpay orders and verify payments.
// Keep Razorpay secret key only on the server.

require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /create-order
// Body: { amount: number (in rupees), type: 'skill'|'subscription', uid?: string, skillName?: string }
// Returns: { orderId, amount, currency, key }
app.post('/create-order', async (req, res) => {
  try {
    const { amount, type, uid, skillName } = req.body;
    if (!amount || !type) return res.status(400).send('Missing amount or type');

    // Convert rupees to paise and ensure integer
    const amountPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `${type}_${Date.now()}`,
      notes: { uid: uid || '', type: type, skillName: skillName || '' },
    };

    const order = await razorpay.orders.create(options);

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).send('Failed to create order');
  }
});

// POST /verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
app.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).send('Missing parameters');
    }

    // Construct expected signature and compare using HMAC SHA256
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is valid
      return res.json({ success: true });
    } else {
      console.warn('Invalid signature', { expectedSignature, received: razorpay_signature });
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('verify-payment error', err);
    res.status(500).send('Verification failed');
  }
});

app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});

// Root route to avoid "Cannot GET /" on Render or browsers visiting the host root.
app.get('/', (req, res) => {
  res.send(`<html><head><title>FutureSkills Payments</title></head><body><h1>FutureSkills Payment Server</h1><p>Use the endpoints <code>/create-order</code> and <code>/verify-payment</code>.</p></body></html>`);
});
