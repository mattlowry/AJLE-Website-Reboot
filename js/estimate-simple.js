// AJ Long Electric Simple Estimate Form JavaScript

// Configuration
const CONFIG = {
    MAX_FILES: 10,
    MAX_VIDEO_DURATION: 60, // seconds
    ACCEPTED_FILE_TYPES: ['image/*', 'video/*', '.heic'],
    API_ENDPOINT: '/.netlify/functions/housecall-pro-estimate'
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
        form: document.getElementById('estimate-form'),
        fileInput: document.getElementById('file-upload'),
        filePreview: document.getElementById('file-preview'),
        submitBtn: document.getElementById('submit-btn'),
        formContent: document.getElementById('form-content'),
        formLoading: document.getElementById('form-loading'),
        formSuccess: document.getElementById('form-success'),
        phoneInput: document.getElementById('phone')
    };
    
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Phone number formatting
    elements.phoneInput?.addEventListener('input', formatPhoneNumber);
    
    // File upload handling
    elements.fileInput?.addEventListener('change', handleFileSelection);
    
    // Form submission
    elements.form?.addEventListener('submit', handleFormSubmission);
    
    // Drag and drop
    setupDragAndDrop();
}

function formatPhoneNumber(e) {
    const phoneNumber = e.target.value.replace(/\D/g, '');
    if (phoneNumber.length >= 10) {
        const formattedNumber = phoneNumber.substring(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        e.target.value = formattedNumber;
    }
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
    if (file.type.startsWith('video/')) {
        // Check video duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function() {
            if (video.duration > CONFIG.MAX_VIDEO_DURATION) {
                showNotification(`Video "${file.name}" is longer than 1 minute and cannot be uploaded.`, 'error');
            } else {
                addFile(file);
            }
        };
        video.src = URL.createObjectURL(file);
    } else {
        addFile(file);
    }
}

function addFile(file) {
    selectedFiles.push(file);
    updateFilePreview();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFilePreview();
}

function updateFilePreview() {
    if (selectedFiles.length > 0) {
        elements.filePreview.classList.remove('hidden');
        elements.filePreview.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const previewItem = createPreviewItem(file, index);
            elements.filePreview.appendChild(previewItem);
        });
    } else {
        elements.filePreview.classList.add('hidden');
    }
}

function createPreviewItem(file, index) {
    const previewItem = document.createElement('div');
    previewItem.className = 'file-preview-item';
    
    // Add file content
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        previewItem.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;
        previewItem.appendChild(video);
    } else {
        const icon = document.createElement('div');
        icon.className = 'file-type';
        icon.innerHTML = '<i class="fas fa-file"></i>';
        previewItem.appendChild(icon);
    }
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-file';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeFile(index);
    previewItem.appendChild(removeBtn);
    
    return previewItem;
}

async function handleFormSubmission(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Create FormData
    const formData = createFormData();
    
    try {
        const response = await submitForm(formData);
        
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, try to get the text response
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error(text || 'Server error');
        }
        
        if (response.ok && data.success) {
            showSuccessState();
        } else {
            throw new Error(data.message || data.error || 'Form submission failed');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showErrorState(error.message);
    }
}

function validateForm() {
    const requiredFields = elements.form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
        } else {
            field.classList.remove('border-red-500');
        }
    });
    
    if (!isValid) {
        showNotification('Please fill in all required fields.', 'error');
    }
    
    return isValid;
}

function createFormData() {
    const formData = new FormData();
    
    // Get form values
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const description = document.getElementById('description').value;
    
    // Add fields with exact names expected by HouseCall Pro
    formData.append('name', `${firstName} ${lastName}`);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('address', address);
    formData.append('message', description);
    
    // Add form type for HouseCall Pro
    formData.append('form_type', 'estimate');
    
    // Add files
    selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
    });
    
    return formData;
}

function showLoadingState() {
    elements.formContent.classList.add('opacity-50');
    elements.formLoading.classList.add('active');
    elements.submitBtn.disabled = true;
}

function showSuccessState() {
    elements.formContent.classList.add('hidden');
    elements.formLoading.classList.remove('active');
    elements.formSuccess.classList.remove('hidden');
}

function showErrorState(message) {
    elements.formContent.classList.remove('opacity-50');
    elements.formLoading.classList.remove('active');
    elements.submitBtn.disabled = false;
    showNotification(message || 'There was an error submitting your request. Please try again.', 'error');
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
    alert(message);
}

// Helper function to generate unique IDs
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}