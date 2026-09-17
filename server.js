const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// STK Push Route calling Palpluss API
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard } = req.body;

  // Basic Auth setup for Palpluss API key username:password format
  const authHeader = 'Basic ' + Buffer.from(`${process.env.PALPLUSS_API_KEY}:`).toString('base64');

  const payload = {
    amount: amount || 4200,
    phone: phone,
    accountReference: smartcard || "DSTV-PAY",
    transactionDesc: "DStv Subscription Payment",
    channelId: process.env.PALPLUSS_CHANNEL_ID,
    callbackUrl: process.env.CALLBACK_URL
  };

  try {
    const response = await axios.post('https://api.palpluss.com/v1/payments/stk', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    const errorDetails = error.response ? error.response.data : { message: error.message };
    res.status(error.response ? error.response.status : 500).json(errorDetails);
  }
});

// Webhook endpoint to receive payment notifications from Palpluss
app.post('/webhooks/mpesa', (req, res) => {
  console.log('Palpluss Webhook Data Received:', req.body);
  res.status(200).json({ status: "success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
