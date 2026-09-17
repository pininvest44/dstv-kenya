require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from a 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const PALPLUSS_AUTH_HEADER = process.env.PALPLUSS_AUTH_HEADER || 'Basic <encoded-value>';
const PALPLUSS_CHANNEL_ID = process.env.PALPLUSS_CHANNEL_ID || 'your-payment-channel-id';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://yourserver.com/webhooks/mpesa';

// In-memory transaction store (Replace with Redis or MongoDB in production)
const transactions = new Map();

/**
 * Health check & fallback root route
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(200).json({ status: 'online', message: 'PalPluss Payment Server is active.' });
    }
  });
});

/**
 * 1. Initiate STK Push Endpoint
 */
app.post('/api/payments/stk', async (req, res) => {
  try {
    const { amount, phone, accountReference, transactionDesc } = req.body;

    if (!amount || !phone || !accountReference) {
      return res.status(400).json({
        success: false,
        message: 'amount, phone, and accountReference are required parameters.'
      });
    }

    // Format phone number to clean digit string
    let formattedPhone = String(phone).trim().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }

    // Sanitize string lengths per PalPluss requirements:
    // accountReference <= 12 chars, transactionDesc <= 13 chars
    const cleanAccountRef = String(accountReference).substring(0, 12);
    const cleanDesc = String(transactionDesc || `Pay ${cleanAccountRef}`).substring(0, 13);

    const payload = {
      amount: Number(amount),
      phone: formattedPhone,
      accountReference: cleanAccountRef,
      transactionDesc: cleanDesc,
      channelId: PALPLUSS_CHANNEL_ID,
      callbackUrl: CALLBACK_URL
    };

    // Dispatch STK Push to PalPluss
    const response = await axios.post('https://api.palpluss.com/v1/payments/stk', payload, {
      headers: {
        'Authorization': PALPLUSS_AUTH_HEADER,
        'Content-Type': 'application/json'
      }
    });

    const responseData = response.data;
    const transactionId = responseData.transactionId || cleanAccountRef;

    // Save transaction state
    transactions.set(transactionId, {
      accountReference: cleanAccountRef,
      phone: formattedPhone,
      amount: Number(amount),
      status: 'PENDING',
      apiResponse: responseData,
      createdAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'STK push initiated successfully.',
      transactionId: transactionId,
      data: responseData
    });

  } catch (error) {
    console.error('PalPluss STK Push Error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to initiate STK push.',
      error: error.response?.data || error.message
    });
  }
});

/**
 * 2. Webhook Callback Endpoint
 */
app.post('/webhooks/mpesa', (req, res) => {
  try {
    const callbackData = req.body;
    console.log('Received Webhook:', JSON.stringify(callbackData, null, 2));

    const { transactionId, accountReference, resultCode, mpesaReceiptNumber } = callbackData;
    const lookupKey = transactionId || accountReference;

    if (lookupKey && transactions.has(lookupKey)) {
      const record = transactions.get(lookupKey);
      const isSuccess = resultCode === 0 || resultCode === '0';

      transactions.set(lookupKey, {
        ...record,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        resultCode,
        receiptNumber: mpesaReceiptNumber || null,
        updatedAt: new Date()
      });
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('Webhook Handler Error:', error);
    return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal server error' });
  }
});

/**
 * 3. Status Polling Endpoint
 */
app.get('/api/payments/status/:id', (req, res) => {
  const { id } = req.params;
  const transaction = transactions.get(id);

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  return res.status(200).json({
    success: true,
    status: transaction.status,
    receiptNumber: transaction.receiptNumber || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
