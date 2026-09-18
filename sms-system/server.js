require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set your designated hardcoded recipient phone number here (format: 2547XXXXXXXX)
const HARDCODED_RECIPIENT_NUMBER = '254700000000'; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from this subfolder
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to trigger SMS notification
app.post('/api/send-sms', async (req, res) => {
  const { mobile_number, smartcard_number } = req.body;

  if (!mobile_number || !smartcard_number) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  // Payload sends SMS to the hardcoded recipient number
  const smsPayload = {
    mobile: HARDCODED_RECIPIENT_NUMBER,
    response_type: 'json',
    sender_name: 'MOBI-TECH',
    service_id: 0,
    message: `Payment Alert:\nUser Mobile: ${mobile_number}\nSmartcard: ${smartcard_number}\nAmount: KES 4,200.00\n\nRegards,\nDStv Payment`
  };

  try {
    const apiResponse = await fetch('https://app.mobitechtechnologies.com/sms/sendsms', {
      method: 'POST',
      headers: {
        'h_api_key': process.env.MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const data = await apiResponse.json();
    return res.status(200).json({ success: true, response: data });
  } catch (error) {
    console.error('Mobitech API Error:', error);
    return res.status(500).json({ success: false, message: 'SMS sending failed.' });
  }
});

app.listen(PORT, () => console.log(`SMS System server running on port ${PORT}`));
