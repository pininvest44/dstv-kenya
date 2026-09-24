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

// Health check endpoint (use this URL in UptimeRobot to prevent Render sleeping)
app.get('/', (req, res) => {
  res.status(200).send('Paynexus Payment Backend is running successfully!');
});

// Converts phone input into standard 2547XXXXXXXX or 2541XXXXXXXX format
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, ''); // strip non-digits

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
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

  const payload = {
    amount: Number(amount) || 4200,
    phone: formattedPhone,
    description: description || `Smartcard #${smartcard || 'DSTV'}`
  };

  try {
    const response = await axios.post(
      'https://paynexus.co.ke/api/mpesa/payment/initiate',
      payload,
      {
        headers: {
          'X-API-Key': process.env.PAYNEXUS_SECRET_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 8000 // Fast 8-second gateway timeout
      }
    );

    console.log('Paynexus Raw Response:', JSON.stringify(response.data, null, 2));

    return res.status(200).json({
      success: true,
      message: 'STK push sent successfully.',
      data: response.data
    });

  } catch (error) {
    const errorData = error.response?.data || {};
    console.error('Paynexus Error:', errorData || error.message);

    return res.status(500).json({
      success: false,
      message: errorData.message || 'Failed to trigger M-Pesa prompt. Please verify details and try again.',
      details: errorData
    });
  }
});

app.post('/webhooks/paynexus', (req, res) => {
  console.log('Paynexus Webhook:', req.body);
  return res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
