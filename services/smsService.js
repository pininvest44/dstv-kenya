const sendAdminNotification = async () => {
  const endpoint = "https://app.mobitechtechnologies.com/sms/sendsms";
  const apiKey = process.env.MOBITECH_API_KEY;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER; // Hardcoded target number in .env

  if (!apiKey || !adminPhone) {
    console.error("[SMS Service] Missing MOBITECH_API_KEY or ADMIN_PHONE_NUMBER");
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
    console.log("[SMS Service] Notification result:", data);
  } catch (error) {
    console.error("[SMS Service] Failed to send notification:", error.message);
  }
};

module.exports = { sendAdminNotification };
