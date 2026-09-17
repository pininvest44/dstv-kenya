async function sendStkPush(paymentPayload) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'PROXY_FETCH',
      data: {
        url: 'https://dstv-kenya.onrender.com/api/stkpush',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentPayload)
        }
      }
    });

    if (!response.ok) {
      throw new Error(response.error || `Request failed with status ${response.status}`);
    }

    console.log('STK Push dispatched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to dispatch STK Push via background proxy:', error);
  }
}

// Example Trigger
sendStkPush({ phoneNumber: '254700000000', amount: 500 });
