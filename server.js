const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Credentials & Configuration
const PALPLUSS_AUTH_HEADER = process.env.PALPLUSS_AUTH_HEADER || 'Basic <encoded-value>';
const PALPLUSS_CHANNEL_ID = process.env.PALPLUSS_CHANNEL_ID || 'your-payment-channel-id';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://yourserver.com/webhooks/mpesa';

// In-memory transaction store (replace with Redis/MongoDB/PostgreSQL in production)
const transactions = new Map();

/**
 * 1. Initiate STK Push
 * Called by your frontend when the user submits their phone number.
 */
app.post('/api/payments/stk', async (req, res) => {
  try {
    const { amount, phone, accountReference, transactionDesc } = req.body;

    if (!amount || !phone || !accountReference) {
      return res.status(400).json({
        success: false,
        message: 'amount, phone, and accountReference are required.'
      });
    }

    // Format local mobile numbers (0712345678 -> 254712345678)
    let formattedPhone = phone.toString().trim().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }

    const payload = {
      amount: Number(amount),
      phone: formattedPhone,
      accountReference,
      transactionDesc: transactionDesc || `Payment for ${accountReference}`,
      channelId: PALPLUSS_CHANNEL_ID,
      callbackUrl: CALLBACK_URL
    };

    // Dispatch to PalPluss API
    const response = await axios.post('https://api.palpluss.com/v1/payments/stk', payload, {
      headers: {
        'Authorization': PALPLUSS_AUTH_HEADER,
        'Content-Type': 'application/json'
      }
    });

    // Save initial transaction state
    transactions.set(accountReference, {
      phone: formattedPhone,
      amount,
      status: 'PENDING',
      apiResponse: response.data,
      createdAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'STK push initiated successfully.',
      data: response.data
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
 * 2. Webhook Callback Handler
 * PalPluss hits this endpoint asynchronously when the user completes or cancels the prompt.
 */
app.post('/webhooks/mpesa', (req, res) => {
  try {
    const callbackData = req.body;
    console.log('Received PalPluss Callback:', JSON.stringify(callbackData, null, 2));

    const { accountReference, resultCode, resultDesc, mpesaReceiptNumber } = callbackData;

    if (accountReference && transactions.has(accountReference)) {
      const record = transactions.get(accountReference);
      const isSuccess = resultCode === 0 || resultCode === '0';

      transactions.set(accountReference, {
        ...record,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        resultCode,
        resultDesc,
        receiptNumber: mpesaReceiptNumber || null,
        updatedAt: new Date()
      });
    }

    // Always acknowledge receipt to prevent gateway retries
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully'
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

/**
 * 3. Status Polling Endpoint
 * Check transaction status from the client.
 */
app.get('/api/payments/status/:reference', (req, res) => {
  const reference = req.params.reference;
  const transaction = transactions.get(reference);

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
app.listen(PORT, () => console.log(`PalPluss payment server active on port ${PORT}`));
