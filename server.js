const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('ExpressPay Payment Backend is running successfully!');
});

// Format phone number to 254XXXXXXXXX
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

// STK Push Endpoint
app.post('/api/stkpush', async (req, res) => {
  const { phone, amount, smartcard, description } = req.body;

  const formattedPhone = formatPhoneNumber(phone);

  // Validate exact length and range (254 + 9 digits = 12 digits)
  const kenyaPhoneRegex = /^254[71]\d{8}$/;
  if (!formattedPhone || !kenyaPhoneRegex.test(formattedPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Please provide a valid 10-digit mobile number (e.g., 0712345678).'
    });
  }

  const parsedAmount = Math.max(1, Math.round(Number(amount) || 4200));

  // ExpressPay Standard Payload
  const payload = {
    phoneNumber: String(formattedPhone),
    amount: parsedAmount,
    accountReference: smartcard ? `DSTV-${smartcard}` : 'INV-1042',
    transactionDesc: description || `DSTV #${smartcard || 'PAY'}`
  };

  console.log('Sending Clean Payload to ExpressPay:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      'https://expresspay.co.ke/api/payments/stk-push',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXPRESSPAY_API_KEY ? process.env.EXPRESSPAY_API_KEY.trim() : ''}`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
