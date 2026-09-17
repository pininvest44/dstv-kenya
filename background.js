chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PROXY_FETCH') {
    const { url, options } = request.data;

    fetch(url, options)
      .then(async (response) => {
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          data: data
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error.toString()
        });
      });

    // Return true to indicate asynchronous response sending
    return true;
  }
});
