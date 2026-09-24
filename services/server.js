const express = require("express");
const cors = require("cors");
const { sendAdminNotification } = require("./services/smsService");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/stkpush", async (req, res) => {
  const { phone, amount, smartcard } = req.body;

  if (!phone || !smartcard) {
    return res.status(400).json({
      success: false,
      message: "Phone and Smartcard are required."
    });
  }

  try {
    // -----------------------------------------------------------
    // 1. PLACE YOUR DARAJA / M-PESA STK PUSH LOGIC HERE
    // -----------------------------------------------------------
    console.log(`[STK Push] Initiating payment of KES ${amount || 4200} for phone ${phone}, smartcard ${smartcard}`);

    // 2. Dispatch SMS notification asynchronously (non-blocking)
    sendAdminNotification().catch((err) =>
      console.error("[SMS Service Error]:", err)
    );

    // 3. Return response back to frontend client
    return res.status(200).json({
      success: true,
      message: "STK Push triggered successfully"
    });
  } catch (error) {
    console.error("[STK Push Error]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger STK push. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
