/**
 * Housecall Pro Form Handler
 * 
 * Handles estimate form submissions to the Housecall Pro API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get the estimate form element
  const estimateForm = document.getElementById('estimate-form');
  
  // Only proceed if the form exists on the page
  if (estimateForm) {
    setupEstimateForm(estimateForm);
  }
});

/**
 * Sets up form submission and validation
 * @param {HTMLFormElement} form - The estimate form element
 */
function setupEstimateForm(form) {
  // Form elements for validation
  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const addressInput = form.querySelector('[name="address"]');
  const cityInput = form.querySelector('[name="city"]');
  const zipInput = form.querySelector('[name="zip"]');
  const serviceSelect = form.querySelector('[name="service"]');
  const fileInput = form.querySelector('[name="media[]"]');
  
  // Submit button and status elements
  const submitButton = form.querySelector('button[type="submit"]');
  const statusDiv = document.getElementById('form-status') || createStatusElement(form);
  
  // Function to validate email format
  const isValidEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Function to validate phone format
  const isValidPhone = (phone) => {
    // Allow various phone formats
    const re = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return re.test(String(phone).trim());
  };
  
  // Normalize phone number (strip all non-digits)
  const normalizePhone = (phone) => {
    return phone.replace(/\D/g, '');
  };
  
  // Basic form validation
  const validateForm = () => {
    let isValid = true;
    let errorMessage = '';
    
    // Reset previous validation states
    form.querySelectorAll('.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
    
    // Check required fields
    if (!nameInput.value.trim()) {
      nameInput.classList.add('is-invalid');
      errorMessage = 'Name is required';
      isValid = false;
    }
    
    if (!emailInput.value.trim()) {
      emailInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'Email is required';
      isValid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
      emailInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'Please enter a valid email address';
      isValid = false;
    }
    
    if (!phoneInput.value.trim()) {
      phoneInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'Phone number is required';
      isValid = false;
    } else if (!isValidPhone(phoneInput.value.trim())) {
      phoneInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'Please enter a valid phone number';
      isValid = false;
    }
    
    if (!addressInput.value.trim()) {
      addressInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'Address is required';
      isValid = false;
    }
    
    if (!cityInput.value.trim()) {
      cityInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'City is required';
      isValid = false;
    }
    
    if (!zipInput.value.trim()) {
      zipInput.classList.add('is-invalid');
      errorMessage = errorMessage || 'ZIP code is required';
      isValid = false;
    }
    
    if (!serviceSelect.value) {
      serviceSelect.classList.add('is-invalid');
      errorMessage = errorMessage || 'Please select a service';
      isValid = false;
    }
    
    // Validate file types and sizes if files are selected
    if (fileInput && fileInput.files.length > 0) {
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/heic', 
        'image/heif',
        'video/mp4', 
        'video/quicktime',
        'application/pdf'
      ];
      
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        
        if (file.size > maxSizeInBytes) {
          fileInput.classList.add('is-invalid');
          errorMessage = errorMessage || `File ${file.name} is too large (max 10MB)`;
          isValid = false;
          break;
        }
        
        if (!allowedTypes.includes(file.type)) {
          fileInput.classList.add('is-invalid');
          errorMessage = errorMessage || `File ${file.name} is not an allowed type (jpg, png, gif, heic, mp4, mov, pdf)`;
          isValid = false;
          break;
        }
      }
    }
    
    // Show validation error if any
    if (!isValid) {
      statusDiv.className = 'alert alert-danger';
      statusDiv.textContent = errorMessage;
      statusDiv.style.display = 'block';
    } else {
      statusDiv.style.display = 'none';
    }
    
    return isValid;
  };
  
  // Handle file input change to validate and preview files
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const previewContainer = document.getElementById('file-preview') || createFilePreviewElement(form);
      previewContainer.innerHTML = '';
      
      if (this.files.length > 0) {
        previewContainer.style.display = 'block';
        
        for (let i = 0; i < this.files.length; i++) {
          const file = this.files[i];
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          
          const fileName = document.createElement('span');
          fileName.textContent = file.name;
          
          fileItem.appendChild(fileName);
          previewContainer.appendChild(fileItem);
          
          // If it's an image, show a preview
          if (file.type.startsWith('image/')) {
            try {
              const img = document.createElement('img');
              img.className = 'file-preview-image';
              img.file = file;
              
              const reader = new FileReader();
              reader.onload = (function(aImg) { 
                return function(e) { 
                  aImg.src = e.target.result; 
                }; 
              })(img);
              
              reader.onerror = function(error) {
                console.error('Error reading file:', error);
              };
              
              reader.readAsDataURL(file);
              fileItem.appendChild(img);
            } catch (error) {
              console.error('Error creating preview:', error);
            }
          }
        }
      } else {
        previewContainer.style.display = 'none';
      }
    });
  }
  
  // Form submission handler
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) {
      return false;
    }
    
    // Disable the submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    
    // Create FormData object from the form
    const formData = new FormData(form);
    
    // Add normalized phone number
    if (phoneInput && phoneInput.value) {
      formData.append('normalized_phone', normalizePhone(phoneInput.value));
    }
    
    // Submit the form data
    console.log('Submitting form data...');
    
    fetch('/api/housecall-pro-estimate', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      console.log('Response received:', response.status);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Re-enable the submit button
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit Request';
      
      console.log('Response data:', data);
      
      if (data.success) {
        // Show success message
        statusDiv.className = 'alert alert-success';
        statusDiv.innerHTML = '<strong>Success!</strong> Your estimate request has been submitted. We\'ll be in touch soon!';
        statusDiv.style.display = 'block';
        
        // Reset the form
        form.reset();
        
        // Reset file preview if it exists
        const previewContainer = document.getElementById('file-preview');
        if (previewContainer) {
          previewContainer.innerHTML = '';
          previewContainer.style.display = 'none';
        }
        
        // Redirect to thank you page after a short delay
        setTimeout(() => {
          window.location.href = '/thank-you.html';
        }, 2000);
      } else {
        // Show error message
        statusDiv.className = 'alert alert-danger';
        statusDiv.innerHTML = `<strong>Error:</strong> ${data.message || 'There was a problem submitting your request. Please try again or call us.'}`;
        statusDiv.style.display = 'block';
        statusDiv.scrollIntoView({ behavior: 'smooth' });
      }
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      
      // Re-enable the submit button
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit Request';
      
      // Show error message
      statusDiv.className = 'alert alert-danger';
      statusDiv.innerHTML = '<strong>Error:</strong> There was a problem with the request. Please try again or call us at 855-353-8755.';
      statusDiv.style.display = 'block';
      statusDiv.scrollIntoView({ behavior: 'smooth' });
    });
    
    return false;
  });
}

/**
 * Creates a status element for displaying form messages
 * @param {HTMLFormElement} form - The form element to add the status to
 * @returns {HTMLElement} The created status element
 */
function createStatusElement(form) {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'form-status';
  statusDiv.className = 'alert';
  statusDiv.style.display = 'none';
  statusDiv.role = 'alert';
  
  // Insert before the form's first child
  form.insertBefore(statusDiv, form.firstChild);
  
  return statusDiv;
}

/**
 * Creates a file preview element for displaying selected files
 * @param {HTMLFormElement} form - The form element to add the preview to
 * @returns {HTMLElement} The created file preview element
 */
function createFilePreviewElement(form) {
  // Find parent container for file input using querySelector instead of :has
  const fileInputGroup = form.querySelector('.form-group') || form;
  
  const previewDiv = document.createElement('div');
  previewDiv.id = 'file-preview';
  previewDiv.className = 'file-preview';
  previewDiv.style.display = 'none';
  
  // Insert after the file input group
  fileInputGroup.parentNode.insertBefore(previewDiv, fileInputGroup.nextSibling);
  
  return previewDiv;
}