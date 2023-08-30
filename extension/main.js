InboxSDK.load('2', 'YOUR_INBOXSDK_API_KEY').then((sdk) => {
    const threadViewHandler = (threadView) => {
        const models = {
            'GPT-3.5 (16K)': 'gpt-3.5-turbo-16k',
            'GPT-4 (32K)': 'gpt-4-32k',
            'GPT-3.5 Turbo': 'gpt-3.5-turbo',
            'GPT-4': 'gpt-4',
        };
        const settings = ['apiKey', 'model', 'autoSummary', 'summaryPrompt', 'messagePrompt'];

        chrome.storage.sync.get(settings, (items) => {
            let apiKey = items.apiKey;
            let model = items.model;
            let autoSummary = items.autoSummary;
            let summaryPrompt = items.summaryPrompt;
            let messagePrompt = items.messagePrompt;
        
            // Initialize sidebar
            let sidebar = document.createElement('div');
            sidebar.classList.add('sidebar');
            sidebar_config = {
                title: 'GPTMail',
                iconUrl: chrome.runtime.getURL('icon128.png'),
                el: sidebar,
                hasDropdown: false
            };
            
            if (!apiKey || !model) {
                // Show settings warning
                let settingsWarning = document.createElement('div');
                settingsWarning.innerHTML = (
                    '<p>Click the extension icon above to set your OpenAPI API key and default model. Then refresh this page.</p>' +
                    `<img src="${chrome.runtime.getURL('settings.png')}">`
                );
                sidebar.appendChild(settingsWarning);
                threadView.addSidebarContentPanel(sidebar_config);
                return;
            }

            /*
            Create sidebar layout:
            - Model select
            - Summarize button
            - Summary container
            - Separator
            - Message containers
            - Message input
            - Send message button
            - Clear messages button
            */

            let modelSelect = document.createElement('select');
            modelSelect.id = 'model';
            for (const [key, value] of Object.entries(models)) {
                let option = document.createElement('option');
                option.value = value;
                option.text = key;
                if (option.value === model) {
                    option.selected = true;
                }
                modelSelect.add(option);
            }
            sidebar.appendChild(modelSelect);
            
            let summarizeButton = document.createElement('button');
            summarizeButton.id = 'summarizeBtn';
            summarizeButton.textContent = 'Summarize Email';
            sidebar.appendChild(summarizeButton);

            let summaryContainer = document.createElement('div');
            summaryContainer.id = 'summaryContainer';
            if (!autoSummary) {
                summaryContainer.innerHTML = 'Click "Summarize Email" to get started.';
            }
            sidebar.appendChild(summaryContainer);

            let separator = document.createElement('hr');
            sidebar.appendChild(separator);

            let messagesContainer = document.createElement('div');
            messagesContainer.id = 'messagesContainer';
            sidebar.appendChild(messagesContainer);

            let userMessage = document.createElement('input');
            userMessage.id = 'userMessage';
            userMessage.placeholder = 'Ask a question...';
            sidebar.appendChild(userMessage);
        
            let sendMessageButton = document.createElement('button');
            sendMessageButton.textContent = 'Send Message';
            sidebar.appendChild(sendMessageButton);

            let clearMessagesButton = document.createElement('button');
            clearMessagesButton.id = 'clearMessagesBtn';
            clearMessagesButton.textContent = 'Clear Messages';
            sidebar.appendChild(clearMessagesButton);

            const showSummary = (summary) => {
                summaryContainer.innerHTML = `${summary.replaceAll('\n', '<br>')}`;
            };

            const showMessages = (messages) => {
                let messageEl = '';
                for (const [key, value] of Object.entries(messages)) {
                    if (value.role !== 'system') {
                        messageEl += `<div class="message ${value.role}"><div class="message-content">${value.content.replaceAll('\n', '\r\n')}</div></div>`;
                    }
                }
                messagesContainer.innerHTML = messageEl;
            };

            // Register sidebar
            threadView.addSidebarContentPanel(sidebar_config);
            
            threadView.getThreadIDAsync().then(threadID => {
                // Initialize thread data
                let threadData = {
                    summary: '',
                    messages: [],
                };

                // Load thread data
                chrome.storage.local.get([threadID], (result) => {
                    if (result[threadID]) {
                        threadData = result[threadID];
                        showSummary(threadData.summary);
                        summarizeButton.textContent = 'Regenerate summary';
                        showMessages(threadData.messages);
                    }
                });

                // Get text content of thread emails
                const getEmailContent = () => {
                    let messageViews = threadView.getMessageViews();
                    let emailContent = '';
                    for (let i = 0; i < messageViews.length; i++) {
                        emailContent += `\n${messageViews[i].getSender().name}: ${messageViews[i].getBodyElement().innerText}`;
                    }
                    return emailContent;
                };

                // Generate thread summary
                const generateSummary = () => {
                    summaryData = [{
                        'role': 'system',
                        'content': summaryPrompt + getEmailContent(),
                    }]
                    summarizeButton.disabled = true;
                    summarizeButton.textContent = 'Summarizing...';

                    chrome.runtime.sendMessage({type: 'message', model: modelSelect.value, apiKey: apiKey, messages: summaryData}, (response) => {
                        if (response) {
                            threadData.summary = response.summary;
                            chrome.storage.local.set({[threadID]: threadData});
                            showSummary(response.summary);
                            summarizeButton.disabled = false;
                            summarizeButton.textContent = 'Regenerate summary';
                        }
                    });
                };
                
                // Generate thread summary on button click
                summarizeButton.addEventListener('click', () => {
                    generateSummary();
                });

                // Generate thread summary automatically
                if (autoSummary) {
                    generateSummary();
                }

                // Generate message
                const generateMessage = () => {
                    let content = userMessage.value;
                    if (!content) {
                        return;
                    }
                    if (threadData.messages.length === 0) {
                        threadData.messages.push({
                            'role': 'system',
                            'content': messagePrompt + getEmailContent(),
                        });
                    }
                    userMessage.disabled = true;
                    threadData.messages.push({'role': 'user', 'content': content});
                    chrome.runtime.sendMessage({type: 'message', model: modelSelect.value, apiKey: apiKey, messages: threadData.messages}, (response) => {
                        if (response) {
                            threadData.messages.push({'role': 'assistant', 'content': response.summary});
                            chrome.storage.local.set({[threadID]: threadData});
                            showMessages(threadData.messages);
                            userMessage.value = '';
                            userMessage.disabled = false;
                        }
                    });
                };

                // Clear messages
                const clearMessages = () => {
                    threadData.messages = [];
                    chrome.storage.local.set({[threadID]: threadData});
                    showMessages(threadData.messages);
                };
                
                // Trigger message generation on button click
                sendMessageButton.addEventListener('click', () => {
                    generateMessage();
                });

                // Trigger message generation on enter keypress
                userMessage.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        generateMessage();
                    }
                });

                // Trigger clear messages on button click
                clearMessagesButton.addEventListener('click', () => {
                    clearMessages();
                });
            });
        });
    }

    sdk.Conversations.registerThreadViewHandler(threadViewHandler);
});