const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS Middleware
app.use(cors({
  origin: '*', // Restrict to your frontend domain in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept']
}));

app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).send('Paynexus Payment Backend is running successfully!');
});

// Helper: Normalize phone number format to standard 07XX / 01XX or 2547XX
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, ''); // Remove non-numeric characters
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
};

// Paynexus STK Push Endpoint
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, description } = req.body;

  // 1. Validation
  if (!phone || !amount) {
    return res.status(400).json({
      status: 'error',
      message: 'Both "phone" and "amount" fields are required.'
    });
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length !== 10) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid phone number format. Provide a valid 10-digit Kenyan number (e.g., 0746990866).'
    });
  }

  // 2. Prepare Paynexus Payload
  const payload = {
    amount: Number(amount),
    phone: formattedPhone,
    description: description || `Order #${Date.now().toString().slice(-6)}`
  };

  // 3. Dispatch Request to Paynexus API
  try {
    const response = await axios.post(
      'https://paynexus.co.ke/api/mpesa/payment/initiate',
      payload,
      {
        headers: {
          'X-API-Key': process.env.PAYNEXUS_SECRET_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10-second timeout
      }
    );

    console.log('Paynexus STK Response:', response.data);
    return res.status(200).json(response.data);

  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message || 'Internal Server Error' };

    console.error(`Paynexus API Error [${status}]:`, errorData);
    return res.status(status).json({
      status: 'error',
      details: errorData
    });
  }
});

// Paynexus Callback / Webhook Endpoint
app.post('/webhooks/paynexus', (req, res) => {
  console.log('Paynexus Callback Received:', JSON.stringify(req.body, null, 2));

  // Process payment result (e.g., mark order as paid in database)

  // Acknowledge receipt to Paynexus
  return res.status(200).json({ status: 'success' });
});

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
