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
    message: 'ExpressPay Payment Service Running'
  });
});

/**
 * Format and sanitize Kenyan phone numbers into 254XXXXXXXXX format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254') && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

/**
 * POST /api/stkpush
 * Minimal STK Push Dispatch
 */
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount } = req.body;

  const formattedPhone = formatPhoneNumber(phone);

  // Validate exact length and standard Kenyan mobile ranges (12 digits)
  const kenyaPhoneRegex = /^254[71]\d{8}$/;
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

  // Minimal Payload — avoiding schema & special character validation issues
  const payload = {
    phoneNumber: String(formattedPhone),
    amount: parsedAmount
  };

  const apiKey = process.env.EXPRESSPAY_API_KEY ? process.env.EXPRESSPAY_API_KEY.trim() : '';

  console.log('Dispatching STK Push to ExpressPay:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://expresspay.co.ke/api/payments/stk-push',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('ExpressPay Success Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'STK push initiated successfully.',
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    console.error(`ExpressPay STK Push Error [${statusCode}]:`, JSON.stringify(errorDetails, null, 2));

    return res.status(statusCode).json({
      success: false,
      message: errorDetails.message || 'Failed to dispatch STK push prompt.',
      error: errorDetails
    });
  }
});

/**
 * GET /api/payments/:id/status
 * Check transaction status
 */
app.get('/api/payments/:id/status', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(
      `https://expresspay.co.ke/api/payments/${id}/status`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXPRESSPAY_API_KEY?.trim()}`
        },
        timeout: 15000
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    return res.status(statusCode).json({
      success: false,
      error: errorDetails
    });
  }
});

/**
 * POST /webhooks/expresspay
 * Webhook handler for async payment confirmations
 */
app.post('/webhooks/expresspay', (req, res) => {
  const { event, data } = req.body;

  console.log(`ExpressPay Webhook [${event}]:`, JSON.stringify(data, null, 2));

  if (event === 'payment.completed' && data?.status === 'COMPLETED') {
    // Payment verified: update database / activate subscription
    console.log(`Payment verified for ${data.phoneNumber}. Receipt: ${data.mpesaReceiptNumber}`);
  }

  return res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ExpressPay server running on port ${PORT}`));
