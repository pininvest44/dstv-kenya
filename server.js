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
    message: 'PayHero M-Pesa Payment Service Running'
  });
});

/**
 * Format and sanitize Kenyan phone numbers into 07XXXXXXXX or 01XXXXXXXX format
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
 * PayHero STK Push Payment Initiation
 */
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, channel_id, provider, external_reference, customer_name, callback_url } = req.body;

  const formattedPhone = formatPhoneNumber(phone || req.body.phone_number);

  // Validate standard 10-digit Kenyan mobile format
  const kenyaPhoneRegex = /^0[71]\d{8}$/;
  if (!formattedPhone || !kenyaPhoneRegex.test(formattedPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Provide a valid 10-digit Kenyan mobile number (e.g., 0787677676).'
    });
  }

  // Ensure amount is a positive number
  const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
  if (!parsedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount provided.'
    });
  }

  // PayHero API payload structure
  const payload = {
    amount: parsedAmount,
    phone_number: formattedPhone,
    channel_id: Number(channel_id || process.env.PAYHERO_CHANNEL_ID || 133),
    provider: provider || 'm-pesa',
    external_reference: external_reference || 'INV-001',
    customer_name: customer_name || 'Customer',
    callback_url: callback_url || process.env.PAYHERO_CALLBACK_URL || 'https://example.com/callback.php'
  };

  const apiKey = process.env.PAYHERO_API_KEY ? process.env.PAYHERO_API_KEY.trim() : '';

  // Basic authentication header configuration
  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = apiKey.startsWith('Basic ') ? apiKey : `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  console.log('Dispatching Payment Request to PayHero:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://backend.payhero.co.ke/api/v2/payments',
      payload,
      {
        headers,
        timeout: 15000
      }
    );

    console.log('PayHero Success Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Payment request initiated successfully.',
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    console.error(`PayHero Payment Error [${statusCode}]:`, JSON.stringify(errorDetails, null, 2));

    return res.status(statusCode).json({
      success: false,
      message: errorDetails.message || 'Failed to dispatch payment prompt.',
      error: errorDetails
    });
  }
});

/**
 * POST /webhooks/mpesa
 * Webhook handler for PayHero payment confirmations
 */
app.post('/webhooks/mpesa', (req, res) => {
  const payload = req.body;

  console.log('PayHero Webhook Received:', JSON.stringify(payload, null, 2));

  if (payload?.status === 'SUCCESS' || payload?.response?.status === 'Success') {
    console.log(`Payment confirmed for reference: ${payload.external_reference || payload.response?.external_reference}`);
  }

  return res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PayHero payment service running on port ${PORT}`));
