const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS Middleware
app.use(cors({
  origin: '*', // Restrict to your frontend domain in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).send('UMS Pay Payment Backend is running successfully!');
});

// Helper: Format Kenyan phone numbers to 2547XXXXXXXX or 2541XXXXXXXX
const formatMSISDN = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, ''); // Remove non-numeric characters
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

// UMS Pay STK Push Endpoint
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, reference } = req.body;

  // 1. Basic Field Validation
  if (!phone || !amount) {
    return res.status(400).json({
      status: 'error',
      message: 'Both "phone" and "amount" fields are required.'
    });
  }

  const formattedMsisdn = formatMSISDN(phone);
  if (!formattedMsisdn || formattedMsisdn.length !== 12) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid phone number format. Must be a valid Safaricom/Airtel/Telcom number (e.g., 254712345678).'
    });
  }

  // 2. Prepare Payload for UMS Pay API
  const payload = {
    api_key: process.env.UMSPAY_API_KEY,
    email: process.env.UMSPAY_EMAIL,
    amount: Number(amount),
    msisdn: formattedMsisdn,
    reference: reference || `REF-${Date.now()}`,
    account_id: process.env.UMSPAY_ACCOUNT_ID
  };

  // 3. Send Request to UMS Pay
  try {
    const response = await axios.post(
      'https://api.umspay.co.ke/api/v1/initiatestkpush',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10-second request timeout
      }
    );

    console.log('UMS Pay STK Response:', response.data);
    return res.status(200).json(response.data);

  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message || 'Internal Server Error' };

    console.error(`UMS Pay Error [${status}]:`, errorData);
    return res.status(status).json({
      status: 'error',
      details: errorData
    });
  }
});

// UMS Pay Callback / Webhook Endpoint
app.post('/webhooks/umspay', (req, res) => {
  console.log('UMS Pay Callback Received:', JSON.stringify(req.body, null, 2));

  // TODO: Add database update logic based on transaction outcome

  // Always respond with 200 OK to acknowledge receipt
  return res.status(200).json({ status: 'success' });
});

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
