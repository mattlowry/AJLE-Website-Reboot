/**
 * Unified Form Handler for AJ Long Electric
 * Handles: Contact, Estimate, and Comprehensive Service Forms
 * Features: Multi-step navigation, file uploads, validation, service integrations
 */

class UnifiedFormHandler {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            formSelector: '#unified-form',
            formType: 'contact',
            steps: 1,
            maxFiles: 10,
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedFileTypes: ['image/*', 'video/*', '.pdf', '.doc', '.docx'],
            endpoints: {
                contact: '/.netlify/functions/form-handler',
                estimate: '/.netlify/functions/housecall-pro-estimate',
                comprehensive: '/.netlify/functions/housecall-pro-comprehensive'
            },
            ...config
        };

        // State management
        this.currentStep = 1;
        this.uploadedFiles = [];
        this.formData = {};
        this.isSubmitting = false;

        // Initialize
        this.init();
    }

    init() {
        this.form = document.querySelector(this.config.formSelector);
        if (!this.form) {
            console.error('Form not found:', this.config.formSelector);
            return;
        }

        // Get form type from container data attribute
        const container = this.form.closest('.unified-form-container');
        this.config.formType = container?.dataset.formType || this.config.formType;
        
        // Update steps based on form type
        this.updateFormConfiguration();
        
        // Setup form
        this.setupFormType();
        this.bindEvents();
        this.initializePhoneMask();
        this.initializeFileUpload();
        this.initializeAddressAutocomplete();
    }

    updateFormConfiguration() {
        // Configure steps based on form type
        switch (this.config.formType) {
            case 'contact':
                this.config.steps = 1;
                break;
            case 'estimate':
                this.config.steps = 2;
                break;
            case 'comprehensive':
                this.config.steps = 3;
                break;
        }

        // Update hidden form type input
        const formTypeInput = document.getElementById('form-type-input');
        if (formTypeInput) {
            formTypeInput.value = this.config.formType;
        }
    }

    setupFormType() {
        const container = this.form.closest('.unified-form-container');
        const header = container.querySelector('.form-header');
        const progressContainer = container.querySelector('.progress-container');
        const navigation = container.querySelector('.form-navigation');

        // Update form title and subtitle based on type
        const titles = {
            contact: {
                title: 'Contact Us',
                subtitle: 'Get in touch with Northern Virginia\'s most trusted electricians'
            },
            estimate: {
                title: 'Get Free Electrical Estimate',
                subtitle: 'Professional estimates with detailed pricing and project timeline'
            },
            comprehensive: {
                title: 'Schedule Electrical Service',
                subtitle: 'Complete our detailed form to get the best service experience'
            }
        };

        const config = titles[this.config.formType];
        if (config && header) {
            const titleElement = header.querySelector('.form-title');
            const subtitleElement = header.querySelector('.form-subtitle');
            
            if (titleElement) titleElement.textContent = config.title;
            if (subtitleElement) subtitleElement.textContent = config.subtitle;
        }

        // Show/hide progress bar for multi-step forms
        if (this.config.steps > 1) {
            progressContainer?.classList.remove('hidden');
            this.updateProgress();
        } else {
            progressContainer?.classList.add('hidden');
        }

        // Setup navigation buttons
        this.setupNavigation();

        // Show appropriate form sections
        this.updateStepVisibility();

        // Update submit button text
        this.updateSubmitButton();
    }

    setupNavigation() {
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const submitBtn = document.getElementById('submit-form');

        // Single step forms - show only submit button
        if (this.config.steps === 1) {
            prevBtn?.classList.add('hidden');
            nextBtn?.classList.add('hidden');
            submitBtn?.classList.remove('hidden');
            return;
        }

        // Multi-step forms - setup navigation
        if (this.currentStep === 1) {
            prevBtn?.classList.add('hidden');
            nextBtn?.classList.remove('hidden');
            submitBtn?.classList.add('hidden');
        } else if (this.currentStep === this.config.steps) {
            prevBtn?.classList.remove('hidden');
            nextBtn?.classList.add('hidden');
            submitBtn?.classList.remove('hidden');
        } else {
            prevBtn?.classList.remove('hidden');
            nextBtn?.classList.remove('hidden');
            submitBtn?.classList.add('hidden');
        }
    }

    updateStepVisibility() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('hidden');
        });

        // Show current step
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
            currentStepElement.classList.remove('hidden');
        }

        // For single-step forms, show step 1 and hide others
        if (this.config.steps === 1) {
            const step1 = document.querySelector('[data-step="1"]');
            if (step1) {
                step1.classList.add('active');
                step1.classList.remove('hidden');
            }
            
            // Hide step 2 and 3 for contact forms
            document.querySelectorAll('[data-step="2"], [data-step="3"]').forEach(step => {
                step.classList.add('hidden');
                step.classList.remove('active');
            });
        }
    }

    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        const stepLabels = document.querySelectorAll('.step-label');
        
        if (progressFill) {
            const percentage = ((this.currentStep - 1) / (this.config.steps - 1)) * 100;
            progressFill.style.width = `${Math.max(0, percentage)}%`;
        }

        // Update step labels
        stepLabels.forEach((label, index) => {
            label.classList.toggle('active', index + 1 === this.currentStep);
        });
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-form');
        const submitText = submitBtn?.querySelector('.submit-text');
        
        if (!submitText) return;

        const buttonTexts = {
            contact: 'Send Message',
            estimate: 'Get My Free Estimate',
            comprehensive: 'Schedule Service'
        };

        submitText.textContent = buttonTexts[this.config.formType] || 'Submit';
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Navigation buttons
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');

        prevBtn?.addEventListener('click', () => this.previousStep());
        nextBtn?.addEventListener('click', () => this.nextStep());

        // Real-time validation
        this.form.addEventListener('input', (e) => this.validateField(e.target));
        this.form.addEventListener('blur', (e) => this.validateField(e.target), true);

        // Service area validation
        const addressInput = document.getElementById('address');
        addressInput?.addEventListener('blur', () => this.validateServiceArea());

        // Radio button styling
        this.setupRadioButtonStyling();

        // Phone number formatting
        const phoneInput = document.getElementById('phone');
        phoneInput?.addEventListener('input', (e) => this.formatPhoneNumber(e));
    }

    setupRadioButtonStyling() {
        // Handle radio button visual selection
        const radioContainers = document.querySelectorAll('.service-option, .urgency-option, .contact-method');
        
        radioContainers.forEach(container => {
            const radio = container.querySelector('input[type="radio"]');
            if (radio) {
                radio.addEventListener('change', () => {
                    // Remove active class from siblings
                    const siblings = container.parentNode.querySelectorAll('.service-option, .urgency-option, .contact-method');
                    siblings.forEach(sibling => sibling.classList.remove('active'));
                    
                    // Add active class to selected
                    if (radio.checked) {
                        container.classList.add('active');
                    }
                });
            }
        });

        // Handle checkbox styling for time preferences
        const checkboxContainers = document.querySelectorAll('.time-preference');
        checkboxContainers.forEach(container => {
            const checkbox = container.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    container.classList.toggle('active', checkbox.checked);
                });
            }
        });
    }

    initializePhoneMask() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\\D/g, '');
            if (value.length >= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            } else if (value.length >= 3) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            }
            e.target.value = value;
        });
    }

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\\D/g, '');
        if (value.length >= 6) {
            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
        } else if (value.length >= 3) {
            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        }
        e.target.value = value;
    }

    initializeFileUpload() {
        const fileInput = document.getElementById('fileUpload');
        const uploadArea = document.querySelector('.file-upload-area');
        const filePreview = document.getElementById('file-preview');

        if (!fileInput || !uploadArea) return;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(Array.from(e.dataTransfer.files));
        });
    }

    handleFiles(files) {
        const filePreview = document.getElementById('file-preview');
        
        files.forEach(file => {
            // Validation
            if (this.uploadedFiles.length >= this.config.maxFiles) {
                this.showError(`Maximum ${this.config.maxFiles} files allowed`);
                return;
            }

            if (file.size > this.config.maxFileSize) {
                this.showError(`File "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }

            // Add to uploaded files
            this.uploadedFiles.push(file);
            this.displayFilePreview(file, this.uploadedFiles.length - 1);
        });

        if (this.uploadedFiles.length > 0) {
            filePreview?.classList.remove('hidden');
        }
    }

    displayFilePreview(file, index) {
        const filePreview = document.getElementById('file-preview');
        if (!filePreview) return;

        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';

        // Create preview content
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            previewItem.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            previewItem.appendChild(video);
        } else {
            // Show file icon for non-image files
            const fileIcon = document.createElement('div');
            fileIcon.className = 'flex items-center justify-center h-full text-gray-500';
            fileIcon.innerHTML = `<i class="fas fa-file text-3xl mb-2"></i><div class="text-xs text-center">${file.name}</div>`;
            previewItem.appendChild(fileIcon);
        }

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '×';
        removeBtn.type = 'button';
        removeBtn.addEventListener('click', () => this.removeFile(index));

        previewItem.appendChild(removeBtn);
        filePreview.appendChild(previewItem);
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        
        // Rebuild preview
        const filePreview = document.getElementById('file-preview');
        if (filePreview) {
            filePreview.innerHTML = '';
            this.uploadedFiles.forEach((file, newIndex) => {
                this.displayFilePreview(file, newIndex);
            });

            if (this.uploadedFiles.length === 0) {
                filePreview.classList.add('hidden');
            }
        }
    }

    initializeAddressAutocomplete() {
        const addressInput = document.getElementById('address');
        if (!addressInput || !window.google) return;

        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
            types: ['address'],
            componentRestrictions: { country: 'us' }
        });

        autocomplete.addListener('place_changed', () => {
            this.validateServiceArea();
        });
    }

    validateServiceArea() {
        const addressInput = document.getElementById('address');
        const errorDiv = document.getElementById('service-area-error');
        
        if (!addressInput || !errorDiv) return;

        const address = addressInput.value.toLowerCase();
        const servedAreas = [
            'virginia', 'va', 'maryland', 'md', 'washington dc', 'dc',
            'fairfax', 'arlington', 'alexandria', 'vienna', 'falls church',
            'mclean', 'great falls', 'herndon', 'reston', 'chantilly',
            'centreville', 'springfield', 'annandale', 'burke', 'clifton',
            'rockville', 'bethesda', 'silver spring', 'takoma park',
            'college park', 'hyattsville', 'greenbelt', 'lanham'
        ];

        const isServed = servedAreas.some(area => address.includes(area));

        if (address && !isServed) {
            errorDiv.classList.remove('hidden');
        } else {
            errorDiv.classList.add('hidden');
        }
    }

    validateField(field) {
        if (!field.name) return;

        const errorElement = field.parentNode.querySelector('.error-message');
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Email validation
        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        // Phone validation
        if (field.type === 'tel' && field.value) {
            const phoneRegex = /^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
            if (!phoneRegex.test(field.value.replace(/\\D/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }

        // Update field styling and error message
        if (isValid) {
            field.classList.remove('border-red-500');
            field.classList.add('border-gray-300');
            if (errorElement) {
                errorElement.classList.add('hidden');
                errorElement.textContent = '';
            }
        } else {
            field.classList.add('border-red-500');
            field.classList.remove('border-gray-300');
            if (errorElement) {
                errorElement.classList.remove('hidden');
                errorElement.textContent = errorMessage;
            }
        }

        return isValid;
    }

    validateStep(stepNumber) {
        const stepElement = document.querySelector(`[data-step="${stepNumber}"]`);
        if (!stepElement) return true;

        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Special validation for step 2 (service details)
        if (stepNumber === 2) {
            const serviceTypeChecked = stepElement.querySelector('input[name="serviceType"]:checked');
            if (!serviceTypeChecked) {
                this.showError('Please select a service type');
                isValid = false;
            }
        }

        return isValid;
    }

    nextStep() {
        if (!this.validateStep(this.currentStep)) {
            return;
        }

        if (this.currentStep < this.config.steps) {
            this.currentStep++;
            this.updateStepVisibility();
            this.setupNavigation();
            this.updateProgress();
            
            // Scroll to top of form
            this.form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepVisibility();
            this.setupNavigation();
            this.updateProgress();
            
            // Scroll to top of form
            this.form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        // Validate current step
        if (!this.validateStep(this.currentStep)) {
            return;
        }

        // For multi-step forms, validate all steps
        if (this.config.steps > 1) {
            for (let i = 1; i <= this.config.steps; i++) {
                if (!this.validateStep(i)) {
                    this.currentStep = i;
                    this.updateStepVisibility();
                    this.setupNavigation();
                    this.updateProgress();
                    return;
                }
            }
        }

        this.isSubmitting = true;
        this.showLoading(true);

        try {
            const formData = new FormData(this.form);
            
            // Add uploaded files
            this.uploadedFiles.forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });

            // Add form metadata
            formData.append('formType', this.config.formType);
            formData.append('submittedAt', new Date().toISOString());

            // Determine endpoint
            const endpoint = this.config.endpoints[this.config.formType];

            // Submit form
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess();
            } else {
                throw new Error(result.message || 'Form submission failed');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            
            // Try backup submission via Netlify Forms
            const formDataObj = this.getFormDataObject();
            
            // Dispatch failure event for backup system
            window.dispatchEvent(new CustomEvent('formSubmissionFailed', {
                detail: formDataObj
            }));
            
            // Listen for backup success
            const backupSuccessHandler = (event) => {
                this.showSuccess();
                window.removeEventListener('backupFormSuccess', backupSuccessHandler);
                window.removeEventListener('backupFormFailed', backupFailedHandler);
            };
            
            const backupFailedHandler = (event) => {
                this.showError('There was an error submitting your request. Please try again or call us directly at (703) 997-0026.');
                window.removeEventListener('backupFormSuccess', backupSuccessHandler);
                window.removeEventListener('backupFormFailed', backupFailedHandler);
            };
            
            window.addEventListener('backupFormSuccess', backupSuccessHandler);
            window.addEventListener('backupFormFailed', backupFailedHandler);
            
            // If no backup response within 5 seconds, show error
            setTimeout(() => {
                window.removeEventListener('backupFormSuccess', backupSuccessHandler);
                window.removeEventListener('backupFormFailed', backupFailedHandler);
            }, 5000);
            
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    }

    getFormDataObject() {
        const formData = new FormData(this.form);
        const dataObj = {
            formType: this.config.formType,
            submittedAt: new Date().toISOString()
        };

        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            if (dataObj[key]) {
                // Handle multiple values (like checkboxes)
                if (Array.isArray(dataObj[key])) {
                    dataObj[key].push(value);
                } else {
                    dataObj[key] = [dataObj[key], value];
                }
            } else {
                dataObj[key] = value;
            }
        }

        // Add uploaded files info (can't send actual files to backup)
        if (this.uploadedFiles.length > 0) {
            dataObj.fileCount = this.uploadedFiles.length;
            dataObj.fileNames = this.uploadedFiles.map(f => f.name).join(', ');
            dataObj.fileSizes = this.uploadedFiles.map(f => (f.size / 1024 / 1024).toFixed(2) + 'MB').join(', ');
        }

        return dataObj;
    }

    showLoading(show) {
        const loading = document.getElementById('form-loading');
        const submitBtn = document.getElementById('submit-form');
        
        if (show) {
            loading?.classList.remove('hidden');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('form-loading-state');
            }
        } else {
            loading?.classList.add('hidden');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('form-loading-state');
            }
        }
    }

    showSuccess() {
        const success = document.getElementById('form-success');
        const formContent = this.form.querySelector('.form-step.active');
        const navigation = document.querySelector('.form-navigation');
        
        // Hide form content and navigation
        formContent?.classList.add('hidden');
        navigation?.classList.add('hidden');
        
        // Show success message
        success?.classList.remove('hidden');
        success?.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        const errorDiv = document.getElementById('form-error');
        const errorMessage = document.getElementById('error-message');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        errorDiv?.classList.remove('hidden');
        errorDiv?.scrollIntoView({ behavior: 'smooth' });
        
        // Hide error after 10 seconds
        setTimeout(() => {
            errorDiv?.classList.add('hidden');
        }, 10000);
    }
}

// Auto-initialize forms when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const formContainers = document.querySelectorAll('.unified-form-container');
    
    formContainers.forEach(container => {
        const formType = container.dataset.formType || 'contact';
        new UnifiedFormHandler({
            formType: formType,
            formSelector: container.querySelector('#unified-form') ? '#unified-form' : '.unified-form'
        });
    });
});

// Export for manual initialization
window.UnifiedFormHandler = UnifiedFormHandler;