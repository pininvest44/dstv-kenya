/**
 * Sends an SMS notification when an STK push is triggered.
 */
const sendAdminNotification = async () => {
  const endpoint = "https://app.mobitechtechnologies.com/sms/sendsms";
  const apiKey = process.env.MOBITECH_API_KEY;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER; // Target recipient number

  if (!apiKey || !adminPhone) {
    console.error("[SMS Service] Missing MOBITECH_API_KEY or ADMIN_PHONE_NUMBER in environment environment variables.");
    return;
  }

  const payload = {
    mobile: adminPhone,
    response_type: "json",
    sender_name: process.env.MOBITECH_SENDER_NAME || "MOBI-TECH",
    service_id: 0,
    message: "await payment"
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "h_api_key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("[SMS Service] Response:", data);
  } catch (error) {
    console.error("[SMS Service] Request failed:", error.message);
  }
};

module.exports = { sendAdminNotification };
