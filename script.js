document.addEventListener("DOMContentLoaded", () => {
  // Assumes form with ID 'stk-form' and first input field for phone
  const stkForm = document.getElementById("stk-form");
  
  stkForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Picks value from the first input field in the form
    const phoneInput = stkForm.querySelectorAll("input")[0];
    const rawPhone = phoneInput ? phoneInput.value.trim() : "";

    // Optional inputs or fallbacks
    const amountInput = document.getElementById("amount");
    const amount = amountInput ? amountInput.value.trim() : "1000";

    if (!rawPhone) {
      alert("Please enter a phone number in the first field.");
      return;
    }

    try {
      // Replace with your live Render backend URL after deployment
      const BACKEND_URL = "https://your-render-app-name.onrender.com/api/stkpush";

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: rawPhone,
          amount: amount,
          accountReference: "INV-2024-001",
          transactionDesc: "Payment for invoice"
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("STK Push sent! Please check your phone to enter M-Pesa PIN.");
      } else {
        alert(`Payment failed: ${data.message || JSON.stringify(data.error)}`);
      }
    } catch (error) {
      console.error("STK Push Request Error:", error);
      alert("Network error. Could not send STK Push.");
    }
  });
});
