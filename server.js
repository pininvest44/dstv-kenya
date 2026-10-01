const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for frontend clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Healthcheck Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Palpluss Payment Service Running'
  });
});

/**
 * Format and sanitize Kenyan phone numbers into 07XXXXXXXX or 01XXXXXXXX format
 * (Palpluss cURL expects standard 10-digit format starting with 0)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(3);
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

/**
 * POST /api/stkpush
 * Palpluss STK Push Dispatch
 */
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, accountReference, transactionDesc, channelId, callbackUrl } = req.body;

  const formattedPhone = formatPhoneNumber(phone);

  // Validate standard 10-digit Kenyan mobile format
  const kenyaPhoneRegex = /^0[71]\d{8}$/;
  if (!formattedPhone || !kenyaPhoneRegex.test(formattedPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Provide a valid 10-digit Kenyan mobile number (e.g., 0712345678).'
    });
  }

  // Ensure amount is an integer >= 1
  const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
  if (!parsedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount provided.'
    });
  }

  // Payload constructed according to Palpluss documentation
  const payload = {
    amount: parsedAmount,
    phone: formattedPhone,
    accountReference: accountReference || 'INV-001',
    transactionDesc: transactionDesc || 'Payment',
    channelId: channelId || process.env.PALPLUSS_CHANNEL_ID,
    callbackUrl: callbackUrl || process.env.PALPLUSS_CALLBACK_URL || 'https://yourserver.com/webhooks/mpesa'
  };

  const apiKey = process.env.PALPLUSS_API_KEY ? process.env.PALPLUSS_API_KEY.trim() : '';

  // Basic authentication using API key as username with an empty password
  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

  console.log('Dispatching STK Push to Palpluss:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://api.palpluss.com/v1/payments/stk',
      payload,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('Palpluss Success Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'STK push initiated successfully.',
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    console.error(`Palpluss STK Push Error [${statusCode}]:`, JSON.stringify(errorDetails, null, 2));

    return res.status(statusCode).json({
      success: false,
      message: errorDetails.message || 'Failed to dispatch STK push prompt.',
      error: errorDetails
    });
  }
});

/**
 * POST /webhooks/mpesa
 * Webhook handler for Palpluss payment confirmations
 */
app.post('/webhooks/mpesa', (req, res) => {
  const payload = req.body;

  console.log('Palpluss Webhook Received:', JSON.stringify(payload, null, 2));

  // Process completed payment callback
  if (payload?.status === 'SUCCESS' || payload?.ResultCode === 0) {
    console.log(`Payment confirmed for reference: ${payload.accountReference}`);
  }

  return res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Palpluss payment service running on port ${PORT}`));
