require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sendSmsNotification } = require("./sms-service/smsService");

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/stkpush", async (req, res) => {
  const { phone, amount, smartcard } = req.body;

  try {
    // 1. Trigger background SMS notification from separate service folder
    sendSmsNotification().catch(err => console.error("SMS trigger error:", err));

    // 2. Execute STK push logic...

    return res.status(200).json({
      status: "success",
      ResponseCode: "0",
      CustomerMessage: "STK Push sent successfully!"
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
