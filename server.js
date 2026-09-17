require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/stkpush", async (req, res) => {
  const { phone, amount, accountReference, transactionDesc } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required." });
  }

  // Format phone to 07XXXXXXXX or 01XXXXXXXX if needed by Palpluss
  let formattedPhone = phone.trim();
  if (formattedPhone.startsWith("254")) {
    formattedPhone = "0" + formattedPhone.slice(3);
  } else if (formattedPhone.startsWith("+254")) {
    formattedPhone = "0" + formattedPhone.slice(4);
  }

  const payload = {
    amount: Number(amount) || 1000,
    phone: formattedPhone,
    accountReference: accountReference || "INV-2024-001",
    transactionDesc: transactionDesc || "Payment for invoice",
    channelId: process.env.CHANNEL_ID,
    callbackUrl: "https://" + req.headers.host + "/webhooks/mpesa"
  };

  try {
    const response = await axios.post("https://api.palpluss.com/v1/payments/stk", payload, {
      headers: {
        "Authorization": process.env.PALPLUSS_BASIC_AUTH,
        "Content-Type": "application/json"
      }
    });

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error("Palpluss API Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to dispatch STK Push.",
      error: error.response?.data || error.message
    });
  }
});

app.post("/webhooks/mpesa", (req, res) => {
  console.log("Palpluss M-Pesa Callback:", JSON.stringify(req.body, null, 2));
  res.status(200).json({ status: "success" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Palpluss backend running on port ${PORT}`));
