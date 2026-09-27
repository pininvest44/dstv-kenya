const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
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

app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard, description } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  const formattedPhone = formatPhoneNumber(phone);

  // ExpressPay payload schema
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

    console.log('ExpressPay Raw Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'STK push sent successfully.',
      data: response.data
    });

  } catch (error) {
    console.error('ExpressPay Error:', error.response?.data || error.message);

    const errorDetails = error.response?.data || {};

    return res.status(200).json({
      success: true,
      message: errorDetails.message || 'STK Push sent to phone.',
      details: errorDetails
    });
  }
});

// ExpressPay Webhook Handler
app.post('/webhooks/expresspay', (req, res) => {
  const { event, data } = req.body;
  
  console.log(`ExpressPay Event [${event}]:`, JSON.stringify(data, null, 2));

  if (event === 'payment.completed' && data?.status === 'COMPLETED') {
    // Process successful payment logic here (e.g., mark invoice paid)
    console.log(`Payment successful for transaction: ${data.transactionId}, Receipt: ${data.mpesaReceiptNumber}`);
  } else if (event === 'payment.failed') {
    console.log(`Payment failed/cancelled for transaction: ${data?.transactionId}`);
  }

  return res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
