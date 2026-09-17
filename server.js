require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Helper function to format phone numbers to 07XXXXXXXX or 01XXXXXXXX
function formatLocalPhone(phone) {
  let cleaned = String(phone).replace(/\D/g, ""); // Remove non-digits

  if (cleaned.startsWith("254")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.length === 9 && (cleaned.startsWith("7") || cleaned.startsWith("1"))) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

// Root health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "Palpluss STK Push API is running"
  });
});

// STK Push Endpoint
app.post("/api/stkpush", async (req, res) => {
  const { phone, amount, accountReference, transactionDesc } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required." });
  }

  // Ensure environment variables are set
  if (!process.env.PALPLUSS_BASIC_AUTH || !process.env.CHANNEL_ID) {
    console.error("Missing PALPLUSS_BASIC_AUTH or CHANNEL_ID in environment variables.");
    return res.status(500).json({
      success: false,
      message: "Server environment misconfiguration."
    });
  }

  const formattedPhone = formatLocalPhone(phone);

  // Safely format basic auth header
  const authHeader = process.env.PALPLUSS_BASIC_AUTH.startsWith("Basic ")
    ? process.env.PALPLUSS_BASIC_AUTH
    : `Basic ${process.env.PALPLUSS_BASIC_AUTH}`;

  const payload = {
    amount: Number(amount) || 1000,
    phone: formattedPhone,
    accountReference: accountReference || "INV-2024-001",
    transactionDesc: transactionDesc || "Payment for invoice",
    channelId: process.env.CHANNEL_ID,
    callbackUrl: `https://${req.headers.host}/webhooks/mpesa`
  };

  try {
    const response = await axios.post("https://api.palpluss.com/v1/payments/stk", payload, {
      headers: {
        Authorization: authHeader,
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

// Webhook endpoint
app.post("/webhooks/mpesa", (req, res) => {
  console.log("Palpluss M-Pesa Callback:", JSON.stringify(req.body, null, 2));
  res.status(200).json({ status: "success" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Palpluss backend running on port ${PORT}`));
