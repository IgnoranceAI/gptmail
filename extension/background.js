chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inboxsdk__injectPageWorld' && sender.tab) {
      if (chrome.scripting) {
        // MV3
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: 'MAIN',
          files: ['pageWorld.js'],
        });
        sendResponse(true);
      } else {
        // MV2 fallback. Tell content script it needs to figure things out.
        sendResponse(false);
      }
    }
  });

chrome.runtime.onInstalled.addListener(({reason}) => {
  chrome.tabs.create({
    url: 'settings.html'
  });
});

let generateChatCompletion = function (model, apiKey, messages, sendResponse) {
  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        'model': model,
        "messages": messages
      })
  })
  .then(response => response.json())
  .then(data => {
    if (data) {
      sendResponse({summary: data.choices[0].message.content});
    } else {
      sendResponse({summary: 'Error: no response.'});
    }
  })
  .catch(error => {
    console.error('Error:', error);
    sendResponse({summary: 'Error: ' + error});
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'message') {
      if (request.model.startsWith('gpt')) {
        generateChatCompletion(request.model, request.apiKey, request.messages, sendResponse);
      } 
      return true; // keeps the message channel open until sendResponse is executed
    }
});