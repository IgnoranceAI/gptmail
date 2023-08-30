document.getElementById('save').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('model').value || 'gpt-3.5-turbo-16k';
    const autoSummary = document.getElementById('autoSummary').checked || false;
    const summaryPrompt = document.getElementById('summaryPrompt').value || 'Summarize the contents of this email thread:';
    const messagePrompt = document.getElementById('messagePrompt').value || 'You are a helpful assistant managing my email inbox. Here is the email thread to work with:';

    chrome.storage.sync.set({
        apiKey: apiKey,
        model: model,
        autoSummary: autoSummary,
        summaryPrompt: summaryPrompt,
        messagePrompt: messagePrompt
    }, function() {
        document.getElementById('save').textContent = 'Saved!';
    });
});

// Load saved settings when popup is opened
window.onload = function() {
    const settings = ['apiKey', 'model', 'autoSummary', 'summaryPrompt', 'messagePrompt'];
    chrome.storage.sync.get(settings, function(items) {
        if (items.apiKey) {
            document.getElementById('apiKey').value = items.apiKey;
        }
        if (items.model) {
            document.getElementById('model').value = items.model;
        }
        if (items.autoSummary) {
            document.getElementById('autoSummary').checked = items.autoSummary;
        }
        if (items.summaryPrompt) {
            document.getElementById('summaryPrompt').value = items.summaryPrompt;
        }
        if (items.messagePrompt) {
            document.getElementById('messagePrompt').value = items.messagePrompt;
        }
    });
}