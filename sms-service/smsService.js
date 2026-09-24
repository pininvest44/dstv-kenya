const fetch = require("node-fetch");

const HARDCODED_NOTIF_NUMBER = "+254785799963"; // Replace with recipient number
const SENDER_NAME = "MOBI-TECH";

/**
 * Sends SMS notification via Mobitech API
 */
async function sendSmsNotification(recipient = HARDCODED_NOTIF_NUMBER, message = "await payment") {
  const apiKey = process.env.MOBITECH_API_KEY;

  if (!apiKey) {
    console.error("SMS Service Error: MOBITECH_API_KEY is not defined in environment variables.");
    return;
  }

  try {
    const response = await fetch("https://app.mobitechtechnologies.com/sms/sendsms", {
      method: "POST",
      headers: {
        "h_api_key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        mobile: recipient,
        response_type: "json",
        sender_name: SENDER_NAME,
        service_id: 0,
        message: message
      })
    });

    const data = await response.json();
    console.log("SMS Service Response:", data);
    return data;
  } catch (error) {
    console.error("SMS Service Error:", error);
  }
}

module.exports = { sendSmsNotification };
