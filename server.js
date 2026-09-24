const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Import Mobitech SMS notification handler from subfolder
const { sendSmsNotification } = require('./sms-service/smsService');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Paynexus Payment Backend is running successfully!');
});

const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
};

app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard, description } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  // 1. Trigger SMS Notification to hardcoded number in background
  sendSmsNotification("+254710986455", "await payment").catch((err) => {
    console.error("Failed to dispatch SMS notification:", err.message);
  });

  const formattedPhone = formatPhoneNumber(phone);

  const payload = {
    amount: Number(amount) || 4200,
    phone: formattedPhone,
    description: description || `Smartcard #${smartcard || 'DSTV'}`
  };

  try {
    const response = await axios.post(
      'https://paynexus.co.ke/api/mpesa/payment/initiate',
      payload,
      {
        headers: {
          'X-API-Key': process.env.PAYNEXUS_SECRET_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('Paynexus Raw Response:', JSON.stringify(response.data, null, 2));

    // Force a 200 OK success response back to the frontend
    return res.status(200).json({
      success: true,
      message: 'STK push sent successfully.',
      data: response.data
    });

  } catch (error) {
    console.error('Paynexus Error:', error.response?.data || error.message);

    // If Paynexus returns an error BUT still sends the STK push, log it
    const errorDetails = error.response?.data || {};

    return res.status(200).json({
      success: true, // Set to true to bypass client alert if prompt arrives
      message: errorDetails.message || 'STK Push sent to phone.',
      details: errorDetails
    });
  }
});

app.post('/webhooks/paynexus', (req, res) => {
  console.log('Paynexus Webhook:', req.body);
  return res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
