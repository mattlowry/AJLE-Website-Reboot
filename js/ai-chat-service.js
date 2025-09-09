/**
 * AI Service Scheduling Chatbot
 * This script handles the client-side functionality for the AI-powered
 * service scheduling chatbot interface that integrates with Housecall Pro.
 */

// Check if API_ENABLED is defined globally (by the page), otherwise default to true
const API_ENABLED = (typeof window.API_ENABLED !== 'undefined') ? window.API_ENABLED : true;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const infoContent = document.getElementById('info-content');
    
    // Try to restore session ID from localStorage
    let restoredSessionId = null;
    try {
        restoredSessionId = localStorage.getItem('aiChatSessionId');
        if (restoredSessionId) {
            console.log('Restored session ID from localStorage:', restoredSessionId);
            
            // Check if there was a previous error with this session
            const lastErrorJSON = localStorage.getItem('aiChatLastError');
            if (lastErrorJSON) {
                try {
                    const lastError = JSON.parse(lastErrorJSON);
                    const errorAge = Date.now() - lastError.timestamp;
                    
                    // If the error is recent (within last hour) and mentions session issues, clear the session
                    if (errorAge < 60 * 60 * 1000 && 
                        lastError.message && 
                        (lastError.message.includes('session') || lastError.message.includes('Session'))) {
                        console.warn('Found recent session error, clearing session ID:', lastError.message);
                        localStorage.removeItem('aiChatSessionId');
                        localStorage.removeItem('aiChatLastError');
                        restoredSessionId = null;
                    }
                } catch (parseError) {
                    console.warn('Could not parse last error:', parseError);
                }
            }
        }
    } catch (e) {
        console.warn('Could not access localStorage:', e);
    }
    
    // Conversation and service state 
    const state = {
        sessionId: restoredSessionId, // Will be set by server on first response or restored from localStorage
        messages: [],
        serviceDetails: {
            type: null,
            location: null,
            estimatedDuration: null,
            customer: {
                name: null,
                email: null,
                phone: null
            }
        },
        currentStep: 'greeting',
        scheduleOptions: null,
        selectedDate: null,
        selectedTimeSlot: null
    };
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
    
    // Send message when button is clicked
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed (without Shift)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    /**
     * Sends the user's message and processes the AI response
     */
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input field
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Disable input while waiting for response
        userInput.disabled = true;
        sendBtn.disabled = true;
        
        // Show typing indicator
        showTypingIndicator();
        
        // Process message with AI
        processMessage(message)
            .then(response => {
                // Remove typing indicator
                removeTypingIndicator();
                
                // Add AI response to chat
                addMessage(response.message, 'bot');
                
                // Update state
                updateState(response);
                
                // Update info panel if needed
                if (response.updateInfoPanel || response.infoContent) {
                    updateInfoPanel(response.infoContent);
                }
                
                // Re-enable input
                userInput.disabled = false;
                sendBtn.disabled = false;
                userInput.focus();
            })
            .catch(error => {
                console.error('Error processing message:', error);
                removeTypingIndicator();
                
                // Save the error message for recovery attempts
                const lastError = {
                    timestamp: Date.now(),
                    message: error.message || 'Unknown error'
                };
                
                try {
                    localStorage.setItem('aiChatLastError', JSON.stringify(lastError));
                } catch (e) {
                    console.warn('Could not save error to localStorage:', e);
                }
                
                // Add error message to chat
                addMessage("I'm sorry, there was a problem processing your request. Please try again.", 'bot');
                
                // If there's a session ID issue, try to clear it and restart
                if (error.message && error.message.includes('Invalid session')) {
                    console.warn('Session error detected, will clear session ID on next message');
                    try {
                        localStorage.removeItem('aiChatSessionId');
                    } catch (e) {
                        console.warn('Could not clear session ID from localStorage:', e);
                    }
                    state.sessionId = null;
                }
                
                userInput.disabled = false;
                sendBtn.disabled = false;
            });
    }
    
    /**
     * Adds a message to the chat interface
     * @param {string} content - The message content
     * @param {string} sender - Either 'user' or 'bot'
     */
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        const messageText = document.createElement('p');
        messageText.textContent = content;
        
        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Save to conversation history
        state.messages.push({
            content,
            sender
        });
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Shows the typing indicator while waiting for AI response
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.id = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingDiv.appendChild(dot);
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot');
        messageDiv.appendChild(typingDiv);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Removes the typing indicator
     */
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            const messageDiv = typingIndicator.closest('.message');
            if (messageDiv) {
                messageDiv.remove();
            }
        }
    }
    
    /**
     * Processes the user message with the AI backend
     * @param {string} message - The user's message
     * @returns {Promise} - Promise resolving to AI response
     */
    async function processMessage(message) {
        try {
            // First check if we have the API endpoint available
            const useAPI = typeof API_ENABLED !== 'undefined' && API_ENABLED;
            
            if (useAPI) {
                console.log('Sending to API with state:', JSON.stringify(state));
                
                // Try to use streaming endpoint first
                try {
                    return await processMessageWithStreaming(message);
                } catch (streamError) {
                    console.warn('Streaming response failed, falling back to standard API:', streamError);
                    // Fall back to standard endpoint if streaming fails
                }
                
                // Standard API endpoint (fallback)
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        message,
                        state
                    })
                });
                
                if (!response.ok) {
                    console.error('API Response not OK:', response.status, response.statusText);
                    
                    try {
                        // Try to parse error message from response
                        const errorData = await response.json();
                        console.error('API Error details:', errorData);
                        throw new Error(errorData.error || `Network response was not ok: ${response.status}`);
                    } catch (parseError) {
                        // If we can't parse JSON, just throw the original error
                        throw new Error(`Network response was not ok: ${response.status}`);
                    }
                }
                
                // Log success
                console.log('AI API Response successful');
                const jsonResponse = await response.json();
                
                // Debug: log the full response
                console.log('AI API Response data:', jsonResponse);
                
                // Verify session ID was received
                if (!jsonResponse.sessionId && state.sessionId) {
                    console.warn('Server did not return a session ID but we have one locally:', state.sessionId);
                    jsonResponse.sessionId = state.sessionId;
                } else if (jsonResponse.sessionId) {
                    console.log('Received session ID from server:', jsonResponse.sessionId);
                }
                
                return jsonResponse;
            } else {
                // Fall back to client-side simulation
                console.log('Using client-side AI simulation (API not available)');
                return await simulateAIResponse(message, state);
            }
        } catch (error) {
            console.error('Error in processMessage:', error);
            // Fall back to client-side simulation if API fails
            console.log('Falling back to client-side AI simulation after API error');
            return await simulateAIResponse(message, state);
        }
    }
    
    /**
     * Updates the app state with new information from AI response
     * @param {Object} response - The AI response object
     */
    function updateState(response) {
        // Update session ID if provided
        if (response.sessionId) {
            state.sessionId = response.sessionId;
            console.log('Session ID updated:', state.sessionId);
        }
        
        // Update service details if provided
        if (response.serviceDetails) {
            state.serviceDetails = {
                ...state.serviceDetails,
                ...response.serviceDetails
            };
            
            // Make sure customer object is preserved and updated correctly
            if (response.serviceDetails.customer) {
                state.serviceDetails.customer = {
                    ...state.serviceDetails.customer,
                    ...response.serviceDetails.customer
                };
            }
        }
        
        // Update conversation step
        if (response.currentStep) {
            state.currentStep = response.currentStep;
        }
        
        // Update schedule options if provided
        if (response.scheduleOptions) {
            state.scheduleOptions = response.scheduleOptions;
        }
        
        // Update selected date/slot if provided
        if (response.selectedDate) {
            state.selectedDate = response.selectedDate;
        }
        
        if (response.selectedTimeSlot) {
            state.selectedTimeSlot = response.selectedTimeSlot;
        }
        
        // Update confirmation details if provided
        if (response.infoContent && response.infoContent.confirmationDetails) {
            state.confirmationDetails = response.infoContent.confirmationDetails;
        }
        
        // Log updated state
        console.log('Updated state:', JSON.stringify(state));
    }
    
    /**
     * Updates the info panel with new content
     * @param {Object|string} content - The content to display
     */
    function updateInfoPanel(content) {
        if (!content) return;
        
        if (typeof content === 'string') {
            infoContent.innerHTML = content;
        } else if (content.scheduleOptions) {
            renderScheduleOptions(content.scheduleOptions);
        } else if (content.confirmationDetails) {
            renderConfirmationDetails(content.confirmationDetails);
        }
    }
    
    /**
     * Renders the schedule options in the info panel
     * @param {Array} options - Array of available schedule options
     */
    function renderScheduleOptions(options) {
        // Group time slots by date
        const dateGroups = groupByDate(options);
        const dates = Object.keys(dateGroups);
        
        // Create HTML for date selector and time slots
        let html = `
            <h4 class="text-lg font-bold mb-4">Select a Date & Time</h4>
            <div class="date-selector">
                ${dates.map((date, index) => `
                    <div class="date-option ${index === 0 ? 'selected' : ''}" data-date="${date}">
                        <div class="day-name">${date.split(',')[0]}</div>
                        <div class="date">${date.split(',')[1].trim().split(' ')[0]}/${getMonthNumber(date.split(',')[1].trim().split(' ')[1])}</div>
                    </div>
                `).join('')}
            </div>
            <div class="time-slots" id="time-slots">
                ${renderTimeSlotsForDate(dates[0], dateGroups)}
            </div>
        `;
        
        infoContent.innerHTML = html;
        
        // Set initial selected date
        state.selectedDate = dates[0];
        
        // Add event listeners to date options
        document.querySelectorAll('.date-option').forEach(dateOption => {
            dateOption.addEventListener('click', () => {
                // Update selected date
                document.querySelectorAll('.date-option').forEach(opt => opt.classList.remove('selected'));
                dateOption.classList.add('selected');
                
                const selectedDate = dateOption.dataset.date;
                state.selectedDate = selectedDate;
                
                // Update time slots
                const timeSlotsContainer = document.getElementById('time-slots');
                timeSlotsContainer.innerHTML = renderTimeSlotsForDate(selectedDate, dateGroups);
                
                // Add event listeners to time slots
                addTimeSlotEventListeners();
            });
        });
        
        // Add event listeners to initial time slots
        addTimeSlotEventListeners();
    }
    
    /**
     * Groups time slots by date
     * @param {Array} options - Array of time slots
     * @returns {Object} - Object with dates as keys and arrays of time slots as values
     */
    function groupByDate(options) {
        const groups = {};
        
        options.forEach(slot => {
            const date = slot.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(slot);
        });
        
        return groups;
    }
    
    /**
     * Renders time slots for a specific date
     * @param {string} date - The date string
     * @param {Object} dateGroups - Grouped time slots by date
     * @returns {string} - HTML for time slots
     */
    function renderTimeSlotsForDate(date, dateGroups) {
        const slots = dateGroups[date] || [];
        
        if (slots.length === 0) {
            return '<p>No available time slots for this date.</p>';
        }
        
        return slots.map(slot => {
            const unavailableClass = slot.unavailable ? 'unavailable' : '';
            
            return `
                <div class="time-slot ${unavailableClass}" data-day="${date.split(',')[0]}" data-time="${slot.time}">
                    ${slot.time}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Adds event listeners to time slots
     */
    function addTimeSlotEventListeners() {
        document.querySelectorAll('.time-slot:not(.unavailable)').forEach(slot => {
            slot.addEventListener('click', () => {
                // Update selected time slot
                document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                
                const selectedDay = slot.dataset.day;
                const selectedTime = slot.dataset.time;
                
                // Simulate user selecting this time slot
                const timeMessage = `I'd like to schedule for ${selectedDay} at ${selectedTime}`;
                
                // Add user message to chat
                addMessage(timeMessage, 'user');
                
                // Process as if user had typed this message
                showTypingIndicator();
                selectTimeSlot(selectedDay, selectedTime);
            });
        });
    }
    
    /**
     * Selects a time slot and updates the state
     * @param {string} day - The selected day
     * @param {string} time - The selected time
     */
    function selectTimeSlot(day, time) {
        // Create a full date string
        const selectedDate = `${day}, May ${getDayOfMonth(day)}, 2025`;
        
        // Get end time (2 hours after start time)
        const endTime = getEndTime(time);
        
        // Selected time slot
        const selectedSlot = {
            day,
            time,
            endTime,
            date: selectedDate,
            start: new Date(`May ${getDayOfMonth(day)}, 2025 ${time}`).toISOString(),
            end: new Date(`May ${getDayOfMonth(day)}, 2025 ${endTime}`).toISOString()
        };
        
        // Update state
        state.selectedTimeSlot = selectedSlot;
        
        // Book with Housecall Pro
        bookWithHCP(state.serviceDetails.customer, {id: null}, selectedSlot.start)
            .then(data => {
                removeTypingIndicator();
                
                // Add AI confirmation message
                addMessage("You're booked! We'll see you at " + selectedSlot.date + " at " + selectedSlot.time, 'bot');
                
                // Update state
                state.currentStep = 'confirmation';
                
                // Update info panel with confirmation details
                if (data) {
                    state.confirmationDetails = data;
                    updateInfoPanel({ confirmationDetails: data });
                }
                
                // Re-enable input
                userInput.disabled = false;
                sendBtn.disabled = false;
                userInput.focus();
            })
            .catch(error => {
                console.error('Error booking with HCP:', error);
                removeTypingIndicator();
                addMessage("I'm sorry, there was an error booking your appointment. Please try again later.", 'bot');
                userInput.disabled = false;
                sendBtn.disabled = false;
            });
    }
    
    /**
     * Handles time slot selection with client-side simulation fallback
     */
    function handleTimeSlotFallback(day, time, selectedDate, endTime, selectedSlot) {
        setTimeout(() => {
            removeTypingIndicator();
            
            const confirmationMessage = `Great! I've scheduled your ${state.serviceDetails.type} for ${selectedDate} at ${time}. Our technician will arrive between ${time} and ${getArrivalWindowEnd(time)}. Is there anything else you'd like to add to your appointment notes?`;
            
            // Add AI response to chat
            addMessage(confirmationMessage, 'bot');
            
            // Update state
            state.currentStep = 'confirmation';
            
            // Create confirmation ID (job ID format instead of estimate)
            const confirmationId = "JOB" + Math.floor(100000 + Math.random() * 900000);
            
            // Update info panel with confirmation details
            const confirmationDetails = {
                serviceType: state.serviceDetails.type,
                date: selectedDate,
                timeSlot: `${time} - ${endTime}`,
                location: state.serviceDetails.location,
                duration: state.serviceDetails.estimatedDuration || "2-3 hours",
                confirmationId: confirmationId,
                status: 'scheduled'
            };
            
            state.confirmationDetails = confirmationDetails;
            updateInfoPanel({ confirmationDetails });
            
            // Re-enable input
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }, 1500);
    }
    
    /**
     * Renders confirmation details in the info panel
     * @param {Object} details - The confirmation details
     */
    function renderConfirmationDetails(details) {
        const html = `
            <div class="confirmation-details">
                <h4>Appointment Confirmed!</h4>
                <div class="detail-item">
                    <span class="detail-label">Service:</span>
                    <span>${details.serviceType}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span>${details.date}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Time:</span>
                    <span>${details.timeSlot}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Location:</span>
                    <span>${details.location}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration:</span>
                    <span>${details.duration}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="font-semibold text-green-600">${details.status === 'scheduled' ? 'Scheduled' : 'Confirmed'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Confirmation #:</span>
                    <span>${details.confirmationId}</span>
                </div>
                ${details.notes ? `
                <div class="detail-item">
                    <span class="detail-label">Notes:</span>
                    <span>${details.notes}</span>
                </div>
                ` : ''}
            </div>
            <div class="confirmation-actions mt-4">
                <button id="reschedule-btn" class="btn btn-secondary">Reschedule</button>
                <button id="calendar-btn" class="btn btn-primary">Add to Calendar</button>
            </div>
            <div class="mt-6 text-sm text-center text-gray-600">
                <p>A confirmation email will be sent to you shortly.</p>
                <p class="mt-2">If you need to make changes, please call (703) 997-0026.</p>
            </div>
        `;
        
        infoContent.innerHTML = html;
        
        // Add event listeners to buttons
        document.getElementById('reschedule-btn').addEventListener('click', initiateReschedule);
        document.getElementById('calendar-btn').addEventListener('click', addToCalendar);
    }
    
    /**
     * Initiates the reschedule process
     */
    function initiateReschedule() {
        addMessage("I'd like to reschedule my appointment", 'user');
        showTypingIndicator();
        
        setTimeout(() => {
            removeTypingIndicator();
            
            const message = "I understand you'd like to reschedule. Let's find a new time that works for you. Would you prefer a morning or afternoon appointment?";
            addMessage(message, 'bot');
            
            // Update state
            state.currentStep = 'scheduling';
            state.selectedDate = null;
            state.selectedTimeSlot = null;
            
            // Update info panel to show scheduling options again
            updateInfoPanel(getScheduleOptionsInfoContent(state.serviceDetails.type));
            
            // Re-enable input
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }, 1500);
    }
    
    /**
     * Generates calendar file for download
     */
    function addToCalendar() {
        alert('This feature will generate an .ics calendar file for download. Currently not implemented in the demo.');
    }
    
    // Helper functions
    
    /**
     * Calculates the day of month based on day name (for our simulation)
     * @param {string} day - Day name (e.g., "Monday")
     * @returns {number} - Day of month
     */
    function getDayOfMonth(day) {
        const days = {
            'Monday': 20,
            'Tuesday': 21,
            'Wednesday': 22,
            'Thursday': 23,
            'Friday': 24
        };
        return days[day] || 20;
    }
    
    /**
     * Gets month number from month name
     * @param {string} month - Month name
     * @returns {number} - Month number
     */
    function getMonthNumber(month) {
        const months = {
            'January': 1,
            'February': 2,
            'March': 3,
            'April': 4,
            'May': 5,
            'June': 6,
            'July': 7,
            'August': 8,
            'September': 9,
            'October': 10,
            'November': 11,
            'December': 12
        };
        return months[month] || 5;
    }
    
    /**
     * Calculates end time based on start time
     * @param {string} startTime - Start time (e.g., "8:00 AM")
     * @returns {string} - End time (e.g., "10:00 AM")
     */
    function getEndTime(startTime) {
        const timeParts = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeParts) return startTime;
        
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        // Add 2 hours for service duration
        hours += 2;
        
        // Convert back to 12-hour format
        let endPeriod = 'AM';
        if (hours >= 12) {
            endPeriod = 'PM';
            if (hours > 12) {
                hours -= 12;
            }
        }
        if (hours === 0) {
            hours = 12;
        }
        
        return `${hours}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;
    }
    
    /**
     * Calculates arrival window end time (1 hour after start)
     * @param {string} startTime - Start time (e.g., "8:00 AM")
     * @returns {string} - End of arrival window (e.g., "9:00 AM")
     */
    function getArrivalWindowEnd(startTime) {
        const timeParts = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeParts) return startTime;
        
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        // Add 1 hour for arrival window
        hours += 1;
        
        // Convert back to 12-hour format
        let endPeriod = 'AM';
        if (hours >= 12) {
            endPeriod = 'PM';
            if (hours > 12) {
                hours -= 12;
            }
        }
        if (hours === 0) {
            hours = 12;
        }
        
        return `${hours}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;
    }
    
    // Mock data and helper functions for simulation
    
    /**
     * Simulates an AI response for development purposes
     * @param {string} message - The user's message
     * @param {Object} state - Current conversation state
     * @returns {Promise<Object>} - Simulated AI response
     */
    async function simulateAIResponse(message, state) {
        // Add a small delay to simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const lowerMessage = message.toLowerCase();
        let response = {
            message: '',
            serviceDetails: {},
            updateInfoPanel: false
        };
        
        // Determine current step
        const currentStep = state.currentStep || 'greeting';
        
        // Simulate response based on conversation state
        switch (currentStep) {
            case 'greeting':
                // Determine if the user mentioned a service type
                if (lowerMessage.includes('panel') || lowerMessage.includes('upgrade') || lowerMessage.includes('electrical panel')) {
                    response.message = "Panel upgrades are one of our specialties! I'd be happy to help schedule that service. Could you please provide the address where you need the panel upgrade?";
                    response.serviceDetails.type = "Panel Upgrade";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("Panel Upgrade");
                } 
                else if (lowerMessage.includes('ev') || lowerMessage.includes('charger') || lowerMessage.includes('car') || lowerMessage.includes('charging')) {
                    response.message = "EV charger installation is a great choice for electric vehicle owners! Could you please provide the address where you'd like the charger installed?";
                    response.serviceDetails.type = "EV Charger Installation";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("EV Charger Installation");
                }
                else if (lowerMessage.includes('light') || lowerMessage.includes('recessed') || lowerMessage.includes('fixture')) {
                    response.message = "Lighting installation is a great way to enhance your home! Could you please provide the address where you need the lighting installed?";
                    response.serviceDetails.type = "Lighting Installation";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("Lighting Installation");
                }
                else if (lowerMessage.includes('outlet') || lowerMessage.includes('switch') || lowerMessage.includes('plug')) {
                    response.message = "Outlet and switch repairs are common electrical needs. Could you please provide the address where you need this service?";
                    response.serviceDetails.type = "Outlet/Switch Repair";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("Outlet/Switch Repair");
                }
                else if (lowerMessage.includes('fan') || lowerMessage.includes('ceiling')) {
                    response.message = "Ceiling fan installation is a popular service! Could you please provide the address where you'd like the fan installed?";
                    response.serviceDetails.type = "Ceiling Fan Installation";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("Ceiling Fan Installation");
                }
                else if (lowerMessage.includes('troubleshoot') || lowerMessage.includes('problem') || lowerMessage.includes('not working') || lowerMessage.includes('issue')) {
                    response.message = "I understand you're having an electrical issue that needs troubleshooting. Could you please provide the address where you're experiencing this problem?";
                    response.serviceDetails.type = "Electrical Troubleshooting";
                    response.currentStep = 'gathering_details';
                    
                    // Update info panel
                    response.updateInfoPanel = true;
                    response.infoContent = gatheringDetailsInfoContent("Electrical Troubleshooting");
                }
                else {
                    response.message = "I'd be happy to help you schedule an electrical service. We offer panel upgrades, EV charger installations, lighting installations, outlet repairs, ceiling fan installations, and troubleshooting. Which service are you interested in?";
                    // Stay in greeting step
                }
                break;
                
            case 'gathering_details':
                // If we already have the service type, check if this message contains location
                if (state.serviceDetails.type && !state.serviceDetails.location) {
                    // Simulate detecting an address from the message
                    const addressPattern = /\d+\s+[a-zA-Z0-9\s,]+/;
                    const addressMatch = message.match(addressPattern);
                    
                    if (addressMatch || lowerMessage.includes('street') || lowerMessage.includes('avenue') || lowerMessage.includes('road') || lowerMessage.includes('lane')) {
                        // We have an address or something that looks like one
                        const location = addressMatch ? addressMatch[0] : message;
                        response.serviceDetails.location = location;
                        response.message = `Thanks for providing your address. Could you please share your name and phone number so we can contact you about the ${state.serviceDetails.type} service?`;
                    } else {
                        response.message = "I'll need your address to schedule the service. Could you please provide the full address where you need electrical work?";
                    }
                }
                // If we have service type and location, look for contact info
                else if (state.serviceDetails.type && state.serviceDetails.location) {
                    // Check for a phone number pattern
                    const phonePattern = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
                    const phoneMatch = message.match(phonePattern);
                    
                    if (phoneMatch || 
                        (lowerMessage.includes('phone') && lowerMessage.match(/\d{10}/)) || 
                        (lowerMessage.includes('call') && lowerMessage.match(/\d{10}/))) {
                        // We found a phone number
                        const phone = phoneMatch ? phoneMatch[0] : message.match(/\d{10}/)[0];
                        response.serviceDetails.customer = {
                            ...state.serviceDetails.customer,
                            phone: phone
                        };
                        
                        // Try to extract name if present
                        const namePattern = /(?:my name is|this is|i am|i'm) ([a-zA-Z\s]+)/i;
                        const nameMatch = message.match(namePattern);
                        
                        if (nameMatch) {
                            response.serviceDetails.customer.name = nameMatch[1].trim();
                        }
                        
                        // If we have a name and phone, proceed to scheduling
                        if (response.serviceDetails.customer.name) {
                            response.message = `Thank you, ${response.serviceDetails.customer.name}! Based on the ${state.serviceDetails.type} service you need, I estimate it will take 2-3 hours to complete. I can show you available appointment times now. Would you prefer morning or afternoon?`;
                            response.serviceDetails.estimatedDuration = "2-3 hours";
                            response.currentStep = 'scheduling';
                            
                            // Update info panel to show scheduling options
                            response.updateInfoPanel = true;
                            response.infoContent = getScheduleOptionsInfoContent(state.serviceDetails.type);
                        } else {
                            response.message = "Thanks for your phone number. Could you also provide your name?";
                        }
                    } 
                    else if (lowerMessage.includes('name') || lowerMessage.match(/^[a-zA-Z\s]{2,30}$/)) {
                        // If it looks like they're just providing a name
                        const name = lowerMessage.includes('name') ? 
                            message.replace(/my name is|name is|i am|i'm/i, '').trim() : 
                            message.trim();
                        
                        response.serviceDetails.customer = {
                            ...state.serviceDetails.customer,
                            name: name
                        };
                        
                        response.message = `Thank you, ${name}! Could you also provide your phone number so we can contact you about the ${state.serviceDetails.type} service?`;
                    }
                    else {
                        response.message = "I'll need your contact information to schedule the service. Could you please provide your name and phone number?";
                    }
                }
                break;
                
            case 'scheduling':
                const openSlots = await getOpenSlots();
                if (openSlots && openSlots.length > 0) {
                    const suggestedTimes = openSlots.slice(0, 3).map(slot => {
                        const date = new Date(slot.start);
                        return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    }).join(', ');
                    response.message = `I have the following times available: ${suggestedTimes}. Which works best for you?`;
                    response.scheduleOptions = openSlots;
                    response.updateInfoPanel = true;
                    response.infoContent = { scheduleOptions: openSlots };
                } else {
                    response.message = "I'm sorry, I couldn't find any open appointment times. Please try again later.";
                }
                break;
                
            case 'confirmation':
                // If the user asks to cancel or reschedule
                if (lowerMessage.includes('cancel') || lowerMessage.includes('reschedule')) {
                    response.message = "I understand you'd like to make a change. Let's start again with scheduling. Would you prefer a morning or afternoon appointment?";
                    response.currentStep = 'scheduling';
                    response.updateInfoPanel = true;
                    response.infoContent = getScheduleOptionsInfoContent(state.serviceDetails.type);
                } 
                // If the user is confirming or adding notes
                else {
                    response.message = `Your appointment is confirmed! You'll receive a confirmation email shortly. A technician will arrive at ${state.serviceDetails.location} during your scheduled time window. If you need to make any changes to your appointment, please call our office at (703) 997-0026. Thank you for choosing AJ Long Electric!`;
                    response.updateInfoPanel = true;
                    
                    // Add any notes the user provided
                    const notes = message;
                    
                    // If we already have confirmation details, update them
                    if (state.confirmationDetails) {
                        state.confirmationDetails.notes = notes;
                        response.infoContent = { confirmationDetails: state.confirmationDetails };
                    }
                }
                break;
                
            default:
                response.message = "I'm here to help you schedule an electrical service. What type of service are you looking for today?";
                response.currentStep = 'greeting';
        }
        
        // Generate a session ID if we don't have one yet
        if (!state.sessionId) {
            const sessionId = "session_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 12);
            response.sessionId = sessionId;
            
            // Log session creation
            console.log('Created new session ID in simulation:', sessionId);
            
            // Save session ID to localStorage
            try {
                localStorage.setItem('aiChatSessionId', sessionId);
            } catch (e) {
                console.warn('Could not save session ID to localStorage:', e);
            }
        }
        
        return response;
    }
    
    /**
     * Generates info panel content for gathering details step
     * @param {string} serviceType - The selected service type
     * @returns {string} - HTML content for info panel
     */
    function gatheringDetailsInfoContent(serviceType) {
        return `
            <div class="service-details">
                <h4 class="text-lg font-bold mb-3">Service Details</h4>
                <div class="flex items-center mb-4">
                    <i class="fas fa-tools text-aj-orange text-xl mr-3"></i>
                    <span><strong>Service:</strong> ${serviceType}</span>
                </div>
                
                <h4 class="text-lg font-bold mb-3 mt-6">Information Needed:</h4>
                <ul class="space-y-2">
                    ${!state.serviceDetails.location ? `
                    <li class="flex items-center">
                        <i class="fas fa-map-marker-alt text-aj-orange mr-3"></i>
                        <span>Service location</span>
                    </li>` : ''}
                    
                    ${!state.serviceDetails.customer?.phone ? `
                    <li class="flex items-center">
                        <i class="fas fa-phone text-aj-orange mr-3"></i>
                        <span>Phone number</span>
                    </li>` : ''}
                    
                    ${!state.serviceDetails.customer?.name ? `
                    <li class="flex items-center">
                        <i class="fas fa-user text-aj-orange mr-3"></i>
                        <span>Your name</span>
                    </li>` : ''}
                </ul>
                
                ${state.serviceDetails.location ? `
                <div class="mt-6 py-3 bg-gray-100 rounded-lg px-4">
                    <p class="font-medium">Service Location:</p>
                    <p class="text-gray-700">${state.serviceDetails.location}</p>
                </div>` : ''}
                
                ${(state.serviceDetails.customer?.name || state.serviceDetails.customer?.phone) ? `
                <div class="mt-4 py-3 bg-gray-100 rounded-lg px-4">
                    <p class="font-medium">Contact Information:</p>
                    ${state.serviceDetails.customer?.name ? `<p class="text-gray-700">Name: ${state.serviceDetails.customer.name}</p>` : ''}
                    ${state.serviceDetails.customer?.phone ? `<p class="text-gray-700">Phone: ${state.serviceDetails.customer.phone}</p>` : ''}
                </div>` : ''}
            </div>
        `;
    }
    
    /**
     * Generates info panel content for scheduling step
     * @param {string} serviceType - The selected service type
     * @returns {string} - HTML content for info panel
     */
    function getScheduleOptionsInfoContent(serviceType) {
        return `
            <div class="info-placeholder">
                <i class="fas fa-calendar-check"></i>
                <p>Tell us your preferred time for your ${serviceType} service, and we'll show you available slots.</p>
                <p class="mt-4 text-sm">We schedule services Monday-Friday, 8am-5pm Eastern Time.</p>
            </div>
        `;
    }
    
    // Mock time slot data generators
    
    function getMorningTimeSlots() {
        return [
            { date: "Monday, May 20, 2025", time: "8:00 AM", unavailable: false },
            { date: "Tuesday, May 21, 2025", time: "9:30 AM", unavailable: false },
            { date: "Wednesday, May 22, 2025", time: "10:00 AM", unavailable: false },
            { date: "Thursday, May 23, 2025", time: "8:00 AM", unavailable: true },
            { date: "Friday, May 24, 2025", time: "9:00 AM", unavailable: true }
        ];
    }
    
    function getAfternoonTimeSlots() {
        return [
            { date: "Monday, May 20, 2025", time: "1:00 PM", unavailable: false },
            { date: "Tuesday, May 21, 2025", time: "2:30 PM", unavailable: false },
            { date: "Wednesday, May 22, 2025", time: "1:00 PM", unavailable: true },
            { date: "Thursday, May 23, 2025", time: "3:00 PM", unavailable: false },
            { date: "Friday, May 24, 2025", time: "2:00 PM", unavailable: true }
        ];
    }
    
    function getMondayTimeSlots() {
        return [
            { date: "Monday, May 20, 2025", time: "8:00 AM", unavailable: false },
            { date: "Monday, May 20, 2025", time: "1:00 PM", unavailable: false }
        ];
    }
    
    function getTuesdayTimeSlots() {
        return [
            { date: "Tuesday, May 21, 2025", time: "9:30 AM", unavailable: false },
            { date: "Tuesday, May 21, 2025", time: "2:30 PM", unavailable: false }
        ];
    }
    
    function getWednesdayTimeSlots() {
        return [
            { date: "Wednesday, May 22, 2025", time: "10:00 AM", unavailable: false },
            { date: "Wednesday, May 22, 2025", time: "1:00 PM", unavailable: true }
        ];
    }
    
    async function getOpenSlots(days = 7) {
        const res = await fetch(`/.netlify/functions/get-open-slots?days=${days}`);
        return res.json();
    }

    function getThursdayTimeSlots() {
        return [
            { date: "Thursday, May 23, 2025", time: "8:00 AM", unavailable: true },
            { date: "Thursday, May 23, 2025", time: "3:00 PM", unavailable: false }
        ];
    }

    async function bookWithHCP(customerObj, addressObj, slotISO) {
        // 1️⃣ create / update customer
        const payload = {
            type   : 'job',
            payload: {
            customer_id : customerObj.id,              // or null if new
            address_id  : addressObj.id,               // idem
            name        : 'AI-Booked Service',
            description : customerObj.request,
            schedule    : {
                scheduled_start: slotISO,
                scheduled_end  : new Date(new Date(slotISO).getTime()+60*60*1000).toISOString(),
                arrival_window : '60'
            }
            }
        };

        const res  = await fetch('/.netlify/functions/hcp-book', {
            method : 'POST',
            body   : JSON.stringify(payload)
        });
        const json = await res.json();
        return json.id ? json : Promise.reject(json);
    }
    
    /**
     * Process message using the streaming API endpoint
     * @param {string} message - The user message
     * @returns {Promise} - Promise resolving to AI response
     */
    async function processMessageWithStreaming(message) {
        // Create a message element for streaming text
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot', 'streaming');
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        const messageText = document.createElement('p');
        messageText.id = 'streaming-response';
        messageText.textContent = '';
        
        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);
        
        // Replace typing indicator with streaming message div
        removeTypingIndicator();
        chatMessages.appendChild(messageDiv);
        
        try {
            // Fetch from streaming endpoint
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    state
                })
            });
            
            if (!response.ok) {
                throw new Error(`Stream response not OK: ${response.status}`);
            }
            
            // Parse the JSON response
            const data = await response.json();
            
            // If we got a standard (non-streaming) response, use it
            if (!data.stream) {
                messageDiv.remove(); // Remove streaming element
                return data;
            }
            
            // Update session ID if provided
            if (data.sessionId) {
                state.sessionId = data.sessionId;
                
                // Save to localStorage
                try {
                    localStorage.setItem('aiChatSessionId', data.sessionId);
                } catch (e) {
                    console.warn('Could not save session ID to localStorage:', e);
                }
            }
            
            // Create a simulated response with the accumulated text
            return {
                message: messageText.textContent,
                sessionId: data.sessionId,
                currentStep: data.currentStep || state.currentStep
            };
        } catch (error) {
            // Remove the streaming message div on error
            messageDiv.remove();
            throw error;
        }
    }
});