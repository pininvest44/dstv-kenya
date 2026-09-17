const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Explicit CORS middleware configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Root endpoint check
app.get('/', (req, res) => {
  res.status(200).send('DStv Palpluss Payment Backend is running successfully!');
});

// STK Push Endpoint
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard } = req.body;

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

    console.log('STK Success:', response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('STK Error:', error.response ? error.response.data : error.message);
    const errorDetails = error.response ? error.response.data : { message: error.message };
    res.status(error.response ? error.response.status : 500).json(errorDetails);
  }
});

app.post('/webhooks/mpesa', (req, res) => {
  console.log('Palpluss Webhook:', req.body);
  res.status(200).json({ status: "success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Hardcoded recipient phone number (Fallback if not set in .env)
const HARDCODED_DESTINATION_NUMBER = process.env.TARGET_MOBILE_NUMBER || '+254710986455';

app.post('/api/send-payment-sms', async (req, res) => {
  const { smartcard, userMobile } = req.body;

  if (!smartcard) {
    return res.status(400).json({ success: false, error: 'Smartcard number is required.' });
  }

  // Construct the SMS payload - always directed to the HARDCODED_DESTINATION_NUMBER
  const smsPayload = {
    mobile: HARDCODED_DESTINATION_NUMBER,
    response_type: 'json',
    sender_name: process.env.MOBITECH_SENDER_NAME || 'MOBI-TECH',
    service_id: 0,
    message: `Alert: Payment button pressed.\nSmartcard: ${smartcard}\nCustomer Contact: ${userMobile || 'N/A'}\n\nRegards,\nDStv Payments`
  };

  try {
    const response = await fetch('https://app.mobitechtechnologies.com/sms/sendsms', {
      method: 'POST',
      headers: {
        'h_api_key': process.env.MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const result = await response.json();
    return res.status(200).json({ success: true, api_response: result });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ success: false, error: 'Failed to send SMS notification.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
