const express = require("express");
const { sendAdminNotification } = require("./services/smsService");

const app = express();
app.use(express.json());

app.post("/api/stkpush", async (req, res) => {
  const { phone, amount, smartcard } = req.body;

  try {
    // 1. Trigger Daraja M-Pesa STK Push logic here
    console.log(`[STK Push] Initiating payment for ${phone}`);

    // 2. Dispatch SMS notification asynchronously (non-blocking)
    sendAdminNotification();

    // 3. Return immediate response back to client
    return res.status(200).json({
      success: true,
      message: "STK Push triggered successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
