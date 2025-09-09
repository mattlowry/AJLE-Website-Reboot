/**
 * Housecall Pro Job Scheduler - Client-side JavaScript
 * 
 * This script handles the client-side interactions for the job scheduler including:
 * - Retrieving available time slots from the API
 * - Displaying the available slots in a calendar view
 * - Handling time slot selection 
 * - Submitting job booking requests
 * - Displaying confirmation information
 */

// Initialize the scheduler when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize scheduler functionality
  const scheduler = new JobScheduler();
  scheduler.init();
});

/**
 * Job Scheduler class to manage appointment scheduling
 */
class JobScheduler {
  constructor() {
    // Configuration
    this.apiBaseUrl = '/api';
    this.getSlotsEndpoint = `${this.apiBaseUrl}/get-available-slots`;
    this.scheduleJobEndpoint = `${this.apiBaseUrl}/schedule-job`;
    
    // State
    this.availableSlots = [];
    this.selectedSlot = null;
    this.currentMonth = new Date();
    this.serviceType = '';
    
    // Elements
    this.calendarEl = null;
    this.slotsContainerEl = null;
    this.slotSelectionEl = null;
    this.bookingFormEl = null;
    this.confirmationEl = null;
    
    // Event handlers bound to this instance
    this.handleDateClick = this.handleDateClick.bind(this);
    this.handleSlotSelect = this.handleSlotSelect.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handlePrevMonth = this.handlePrevMonth.bind(this);
    this.handleNextMonth = this.handleNextMonth.bind(this);
  }
  
  /**
   * Initialize the scheduler
   */
  init() {
    // Get DOM elements
    this.calendarEl = document.getElementById('scheduler-calendar');
    this.slotsContainerEl = document.getElementById('available-slots');
    this.slotSelectionEl = document.getElementById('slot-selection');
    this.bookingFormEl = document.getElementById('booking-form');
    this.confirmationEl = document.getElementById('booking-confirmation');
    
    // If any required element is missing, exit
    if (!this.calendarEl || !this.slotsContainerEl || 
        !this.slotSelectionEl || !this.bookingFormEl || 
        !this.confirmationEl) {
      console.error('Required scheduler elements not found in the DOM');
      return;
    }
    
    // Set initial service type from form if available
    const serviceSelect = document.getElementById('service-type');
    if (serviceSelect) {
      this.serviceType = serviceSelect.value;
      serviceSelect.addEventListener('change', (e) => {
        this.serviceType = e.target.value;
      });
    }
    
    // Initialize the calendar
    this.renderCalendar();
    
    // Add event listeners
    document.getElementById('prev-month').addEventListener('click', this.handlePrevMonth);
    document.getElementById('next-month').addEventListener('click', this.handleNextMonth);
    this.bookingFormEl.addEventListener('submit', this.handleFormSubmit);
    
    // Hide slot selection and confirmation initially
    this.slotSelectionEl.style.display = 'none';
    this.confirmationEl.style.display = 'none';
  }
  
  /**
   * Render the calendar for the current month
   */
  renderCalendar() {
    // Clear existing calendar
    this.calendarEl.innerHTML = '';
    
    // Get current month and year
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // Update month name display
    document.getElementById('current-month').textContent = 
      this.currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Create calendar grid header (days of week)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row header';
    
    daysOfWeek.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-cell header';
      dayEl.textContent = day;
      headerRow.appendChild(dayEl);
    });
    
    this.calendarEl.appendChild(headerRow);
    
    // Get first day of month and total days in month
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create calendar days
    let currentDay = 1;
    const today = new Date();
    
    // Create weeks (rows)
    for (let i = 0; i < 6; i++) {
      // Stop if we've rendered all days in the month
      if (currentDay > daysInMonth) break;
      
      const row = document.createElement('div');
      row.className = 'calendar-row';
      
      // Create days (cells)
      for (let j = 0; j < 7; j++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        // Skip cells before the first day of the month
        if (i === 0 && j < firstDayOfMonth) {
          row.appendChild(cell);
          continue;
        }
        
        // Stop if we've rendered all days
        if (currentDay > daysInMonth) {
          row.appendChild(cell);
          continue;
        }
        
        // Set day number
        cell.textContent = currentDay;
        cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
        
        // Add special classes
        const cellDate = new Date(year, month, currentDay);
        
        // Mark today
        if (cellDate.toDateString() === today.toDateString()) {
          cell.classList.add('today');
        }
        
        // Disable past dates
        if (cellDate < new Date(today.setHours(0, 0, 0, 0))) {
          cell.classList.add('disabled');
        } else {
          // Add click handler for future dates
          cell.classList.add('selectable');
          cell.addEventListener('click', () => this.handleDateClick(cell.dataset.date));
        }
        
        row.appendChild(cell);
        currentDay++;
      }
      
      this.calendarEl.appendChild(row);
    }
  }
  
  /**
   * Handle click on a calendar date
   * @param {string} dateStr - The date string in YYYY-MM-DD format
   */
  async handleDateClick(dateStr) {
    // Clear any previously selected date
    const selectedCells = this.calendarEl.querySelectorAll('.calendar-cell.selected');
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    
    // Mark clicked date as selected
    const clickedCell = this.calendarEl.querySelector(`.calendar-cell[data-date="${dateStr}"]`);
    if (clickedCell) {
      clickedCell.classList.add('selected');
    }
    
    // Reset slot selection
    this.selectedSlot = null;
    this.slotSelectionEl.style.display = 'none';
    
    // Show loading indicator
    this.slotsContainerEl.innerHTML = '<div class="loading">Loading available time slots...</div>';
    
    try {
      // Get available time slots for the selected date
      await this.fetchAvailableSlots(dateStr);
      
      // Render the available slots
      this.renderTimeSlots();
    } catch (error) {
      console.error('Error fetching available slots:', error);
      this.slotsContainerEl.innerHTML = '<div class="error">Error loading time slots. Please try again later.</div>';
    }
  }
  
  /**
   * Fetch available time slots from the API
   * @param {string} date - The date string in YYYY-MM-DD format
   */
  async fetchAvailableSlots(date) {
    try {
      // Build URL with query parameters
      const url = new URL(this.getSlotsEndpoint, window.location.origin);
      url.searchParams.append('date', date);
      
      // Add service type if selected
      if (this.serviceType) {
        url.searchParams.append('job_type_id', this.serviceType);
      }
      
      // Make the API request
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.availableSlots = data.slots || [];
        return this.availableSlots;
      } else {
        throw new Error(data.message || 'Error fetching time slots');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      this.availableSlots = [];
      throw error;
    }
  }
  
  /**
   * Render the available time slots
   */
  renderTimeSlots() {
    // Clear slots container
    this.slotsContainerEl.innerHTML = '';
    
    // Check if we have any available slots
    if (this.availableSlots.length === 0) {
      this.slotsContainerEl.innerHTML = '<div class="no-slots">No available time slots for this date. Please select another date.</div>';
      return;
    }
    
    // Create slots header
    const header = document.createElement('h3');
    header.textContent = `Available Times for ${this.formatDate(this.availableSlots[0].date)}`;
    this.slotsContainerEl.appendChild(header);
    
    // Create slots container
    const slotsGrid = document.createElement('div');
    slotsGrid.className = 'time-slots-grid';
    
    // Create individual slot elements
    this.availableSlots.forEach(slot => {
      const slotEl = document.createElement('div');
      slotEl.className = 'time-slot';
      slotEl.dataset.slotId = slot.id;
      slotEl.dataset.start = slot.start;
      slotEl.dataset.end = slot.end;
      
      slotEl.innerHTML = `
        <span class="time">${slot.time} - ${slot.endTime}</span>
        <span class="duration">${Math.round(slot.duration_minutes / 60 * 10) / 10} hours</span>
      `;
      
      // Add click handler
      slotEl.addEventListener('click', () => this.handleSlotSelect(slot));
      
      slotsGrid.appendChild(slotEl);
    });
    
    this.slotsContainerEl.appendChild(slotsGrid);
  }
  
  /**
   * Handle time slot selection
   * @param {Object} slot - The selected time slot
   */
  handleSlotSelect(slot) {
    // Clear any previously selected slot
    const selectedSlots = document.querySelectorAll('.time-slot.selected');
    selectedSlots.forEach(el => el.classList.remove('selected'));
    
    // Mark the selected slot
    const slotEl = document.querySelector(`.time-slot[data-slot-id="${slot.id}"]`);
    if (slotEl) {
      slotEl.classList.add('selected');
    }
    
    // Store the selected slot
    this.selectedSlot = slot;
    
    // Update and show the slot selection summary
    this.slotSelectionEl.innerHTML = `
      <div class="selected-slot-info">
        <h3>Selected Appointment Time</h3>
        <p class="slot-date">${this.formatDate(slot.date)}</p>
        <p class="slot-time">${slot.time} - ${slot.endTime}</p>
        <p class="slot-duration">Duration: ${Math.round(slot.duration_minutes / 60 * 10) / 10} hours</p>
      </div>
    `;
    
    // Show the slot selection element
    this.slotSelectionEl.style.display = 'block';
    
    // Update hidden form fields
    document.getElementById('slot_start').value = slot.start;
    document.getElementById('slot_end').value = slot.end;
    
    // Scroll to the booking form
    this.bookingFormEl.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Handle booking form submission
   * @param {Event} event - The form submit event
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    
    // Check if a slot is selected
    if (!this.selectedSlot) {
      alert('Please select an appointment time first');
      return;
    }
    
    // Validate form fields
    const requiredFields = ['name', 'email', 'phone'];
    let isValid = true;
    
    requiredFields.forEach(field => {
      const input = document.getElementById(field);
      if (!input || !input.value.trim()) {
        isValid = false;
        input.classList.add('error');
      } else {
        input.classList.remove('error');
      }
    });
    
    if (!isValid) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Show booking in progress
    const submitBtn = this.bookingFormEl.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Booking...';
    submitBtn.disabled = true;
    
    try {
      // Create FormData from the form
      const formData = new FormData(this.bookingFormEl);
      
      // Add slot information
      formData.append('slot_id', this.selectedSlot.id);
      formData.append('slot_start', this.selectedSlot.start);
      formData.append('slot_end', this.selectedSlot.end);
      
      // Submit the booking
      const response = await fetch(this.scheduleJobEndpoint, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show confirmation
        this.showConfirmation(data);
        
        // Reset form
        this.bookingFormEl.reset();
        this.selectedSlot = null;
      } else {
        throw new Error(data.message || 'Error booking appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert(`Error booking appointment: ${error.message}`);
    } finally {
      // Restore button state
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  }
  
  /**
   * Show booking confirmation
   * @param {Object} data - The booking confirmation data
   */
  showConfirmation(data) {
    // Hide the booking form
    this.bookingFormEl.style.display = 'none';
    this.slotSelectionEl.style.display = 'none';
    
    // Get formatted details
    const details = data.details;
    
    // Build confirmation HTML
    this.confirmationEl.innerHTML = `
      <div class="confirmation-content">
        <div class="confirmation-header">
          <h2>Your Appointment is Confirmed!</h2>
          <p class="confirmation-id">Confirmation #: ${data.jobId}</p>
        </div>
        
        <div class="confirmation-details">
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${details.date}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${details.startTime} - ${details.endTime}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Service:</span>
            <span class="detail-value">${details.service}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="font-semibold text-green-600">${details.status === 'scheduled' ? 'Scheduled' : 'Confirmed'}</span>
          </div>
        </div>
        
        <div class="confirmation-message">
          <p>Thank you for booking with us! We've sent a confirmation email to your inbox.</p>
          <p>If you need to make any changes to your appointment, please call us at (855) 353-8755.</p>
        </div>
        
        <div class="confirmation-actions">
          <button id="book-another" class="btn btn-primary">Book Another Appointment</button>
          <a href="/" class="btn btn-secondary">Return to Home</a>
        </div>
      </div>
    `;
    
    // Show the confirmation
    this.confirmationEl.style.display = 'block';
    
    // Scroll to confirmation
    this.confirmationEl.scrollIntoView({ behavior: 'smooth' });
    
    // Add event listener for booking another appointment
    document.getElementById('book-another').addEventListener('click', () => {
      this.confirmationEl.style.display = 'none';
      this.bookingFormEl.style.display = 'block';
      this.calendarEl.scrollIntoView({ behavior: 'smooth' });
    });
  }
  
  /**
   * Handle previous month button click
   */
  handlePrevMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.renderCalendar();
  }
  
  /**
   * Handle next month button click
   */
  handleNextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.renderCalendar();
  }
  
  /**
   * Format a date string for display
   * @param {string} dateStr - The date string to format
   * @returns {string} - The formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    
    // If it's already formatted with day of week, return as is
    if (dateStr.includes(',')) return dateStr;
    
    // Otherwise format the date
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Export the scheduler for use in other scripts
window.JobScheduler = JobScheduler;