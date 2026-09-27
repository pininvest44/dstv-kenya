const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('ExpressPay Payment Backend is running successfully!');
});

// ExpressPay supports 07..., 01..., or 2547... / 2541...
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  return cleaned;
};

// 1. Initiate STK Push
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard, description } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  const formattedPhone = formatPhoneNumber(phone);

  const payload = {
    phoneNumber: formattedPhone,
    amount: Number(amount) || 4200,
    accountReference: smartcard ? `DSTV-${smartcard}` : 'DSTV Payment',
    transactionDesc: description || `Smartcard #${smartcard || 'DSTV'}`,
    metadata: {
      smartcard: smartcard || null
    }
  };

  try {
    const response = await axios.post(
      'https://expresspay.co.ke/api/payments/stk-push',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXPRESSPAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('ExpressPay STK Success Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'STK push sent successfully.',
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    console.error(`ExpressPay STK Push Error [${statusCode}]:`, JSON.stringify(errorDetails, null, 2));

    return res.status(statusCode).json({
      success: false,
      message: errorDetails.message || 'Failed to trigger STK Push prompt.',
      error: errorDetails
    });
  }
});

// 2. Query Payment Status
app.get('/api/payments/:id/status', async (req, res) => {
  const paymentId = req.params.id;

  try {
    const response = await axios.get(
      `https://expresspay.co.ke/api/payments/${paymentId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXPRESSPAY_API_KEY}`
        },
        timeout: 15000
      }
    );

    console.log(`ExpressPay Status Response for ${paymentId}:`, JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || { message: error.message };

    console.error(`ExpressPay Status Query Error [${statusCode}]:`, JSON.stringify(errorDetails, null, 2));

    return res.status(statusCode).json({
      success: false,
      message: errorDetails.message || 'Failed to retrieve payment status.',
      error: errorDetails
    });
  }
});

// 3. Webhook Endpoint
app.post('/webhooks/expresspay', (req, res) => {
  const { event, data } = req.body;

  console.log(`ExpressPay Webhook Event [${event}]:`, JSON.stringify(data, null, 2));

  if (event === 'payment.completed' && data?.status === 'COMPLETED') {
    console.log(`Payment confirmed: ID ${data.transactionId}, Receipt: ${data.mpesaReceiptNumber}`);
  } else if (event === 'payment.failed') {
    console.log(`Payment failed/cancelled: ID ${data?.transactionId}`);
  }

  return res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
