// AJ Long Electric Simple Estimate Form JavaScript - Email Only Version

// Configuration
const CONFIG = {
    MAX_FILES: 10,
    MAX_VIDEO_DURATION: 60, // seconds
    ACCEPTED_FILE_TYPES: ['image/*', 'video/*', '.heic'],
    API_ENDPOINT: '/.netlify/functions/form-handler'
};

// State
let selectedFiles = [];

// DOM elements
let elements = {};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', initializeForm);

function initializeForm() {
    // Cache DOM elements
    elements = {
        form: document.getElementById('estimateForm'),
        fileInput: document.getElementById('attachFiles'),
        fileList: document.getElementById('fileList'),
        submitBtn: document.getElementById('submitBtn'),
        spinner: document.getElementById('loadingSpinner'),
        errorMessages: document.querySelectorAll('.error-message')
    };
    
    // Set up event listeners
    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmission);
    }
    
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Set up drag and drop
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const dropZone = document.querySelector('.drag-drop-zone');
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFileSelection({ target: { files } });
}

function handleFileSelection(e) {
    const newFiles = Array.from(e.target.files);
    
    // Check file count
    if (selectedFiles.length + newFiles.length > CONFIG.MAX_FILES) {
        showNotification(`You can only upload a maximum of ${CONFIG.MAX_FILES} files.`, 'error');
        return;
    }
    
    newFiles.forEach(validateAndAddFile);
}

function validateAndAddFile(file) {
    // Basic validation
    if (!file.type.match(/image.*/) && !file.type.match(/video.*/)) {
        showNotification(`${file.name} is not a valid image or video file.`, 'error');
        return;
    }
    
    // Check for duplicates
    if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        showNotification(`${file.name} has already been selected.`, 'warning');
        return;
    }
    
    selectedFiles.push(file);
    displayFiles();
}

function displayFiles() {
    if (!elements.fileList) return;
    
    elements.fileList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        elements.fileList.innerHTML = '<p class="text-gray-500">No files selected</p>';
        return;
    }
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas ${getFileIcon(file.type)} text-gray-600"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times text-red-500"></i>
            </button>
        `;
        elements.fileList.appendChild(fileItem);
    });
}

function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFiles();
}

async function handleFormSubmission(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Create FormData
    const formData = createFormData();
    
    try {
        const response = await submitForm(formData);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showSuccessState();
            } else {
                throw new Error(data.message || 'Form submission failed');
            }
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showErrorState(error.message);
    }
}

function validateForm() {
    // Clear previous errors
    clearErrors();
    
    let isValid = true;
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    
    requiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (!field || !field.value.trim()) {
            showFieldError(fieldName, 'This field is required');
            isValid = false;
        }
    });
    
    // Validate email format
    const emailField = document.getElementById('email');
    if (emailField && emailField.value && !isValidEmail(emailField.value)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone format
    const phoneField = document.getElementById('phone');
    if (phoneField && phoneField.value && !isValidPhone(phoneField.value)) {
        showFieldError('phone', 'Please enter a valid phone number');
        isValid = false;
    }
    
    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[\d\s\-\(\)\+]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
    });
}

function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    const errorEl = document.getElementById(`${fieldName}-error`);
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function createFormData() {
    const form = elements.form;
    const formData = new FormData();
    
    // Add form fields
    const firstName = form.querySelector('#firstName').value;
    const lastName = form.querySelector('#lastName').value;
    const email = form.querySelector('#email').value;
    const phone = form.querySelector('#phone').value;
    const address = form.querySelector('#address').value;
    const description = form.querySelector('#description').value;
    
    // Add fields with exact names expected by backend
    formData.append('name', `${firstName} ${lastName}`);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('address', address);
    formData.append('message', description);
    formData.append('form_type', 'estimate');
    
    // Add individual fields for HouseCall Pro compatibility
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    
    // Add files
    selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file, file.name);
    });
    
    return formData;
}

async function submitForm(formData) {
    // Log what we're sending (for debugging)
    console.log('Sending form data...');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }
    
    try {
        return await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Network error:', error);
        throw new Error('Network error: Unable to connect to server');
    }
}

function showNotification(message, type = 'info') {
    // For now, using alert. Could be replaced with a more sophisticated notification system
    const alertDiv = document.createElement('div');
    alertDiv.className = `notification ${type}`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoadingState() {
    if (elements.submitBtn) {
        elements.submitBtn.disabled = true;
        elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
    }
}

function showSuccessState() {
    if (elements.form) {
        elements.form.innerHTML = `
            <div class="success-state text-center py-16">
                <div class="success-animation mb-8">
                    <i class="fas fa-check-circle text-6xl text-green-500"></i>
                </div>
                <h2 class="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
                <p class="text-xl text-gray-600 mb-8">Your estimate request has been received.</p>
                <p class="text-lg text-gray-600 mb-8">We'll review your request and send a detailed estimate to your email within 24 hours.</p>
                <a href="/" class="btn btn-primary">Return to Homepage</a>
            </div>
        `;
    }
}

function showErrorState(message) {
    if (elements.submitBtn) {
        elements.submitBtn.disabled = false;
        elements.submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Request';
    }
    
    showNotification(message || 'There was an error submitting your request. Please try again.', 'error');
}

// Make removeFile function globally accessible
window.removeFile = removeFile;