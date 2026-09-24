require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sendSmsNotification } = require("./smsService");

const app = express();
app.use(express.json());
app.use(cors());

// Standalone endpoint for triggering SMS
app.post("/send-sms", async (req, res) => {
  const { recipient, message } = req.body;

  try {
    const result = await sendSmsNotification(recipient, message);
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`SMS Service running on port ${PORT}`));
