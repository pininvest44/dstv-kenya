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

// Helper: Normalize phone numbers to standard 10-digit format (e.g., 0746990866 or 01XXXXXXXX)
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
      success: false,
      message: 'Both "phone" and "amount" fields are required.'
    });
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length !== 10) {
    return res.status(400).json({
      success: false,
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
        timeout: 15000 // Extended 15-second timeout to prevent local drops
      }
    );

    // Debug Log: View exact payload Paynexus returns in terminal
    console.log('Paynexus Raw Response:', JSON.stringify(response.data, null, 2));

    // Handle Paynexus success structure
    const isSuccess = response.data?.success === true || response.data?.status === 'success' || response.data?.data?.status === 'initiated';

    if (isSuccess) {
      return res.status(200).json({
        success: true,
        message: 'STK push prompt sent successfully.',
        data: response.data.data || response.data
      });
    }

    // Fallback if Paynexus explicitly responded with an unhandled state
    return res.status(200).json({
      success: false,
      message: response.data?.message || 'Payment initiation failed.',
      data: response.data
    });

  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message || 'Internal Server Error' };

    console.error(`Paynexus API Error [${status}]:`, errorData);

    return res.status(status).json({
      success: false,
      message: 'Failed to initiate payment',
      details: errorData
    });
  }
});

// Paynexus Webhook / Callback Endpoint
app.post('/webhooks/paynexus', (req, res) => {
  console.log('Paynexus Webhook Callback:', JSON.stringify(req.body, null, 2));

  // Process payment confirmation here (e.g., update DB)

  // Acknowledge receipt to Paynexus gateway
  return res.status(200).json({ success: true });
});

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
