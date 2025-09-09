/**
 * Estimate Form Handler
 * 
 * Handles estimate form multi-step navigation and validation
 */

document.addEventListener('DOMContentLoaded', function() {
  // Only proceed if we're on the estimate page
  const estimateForm = document.getElementById('estimate-form');
  if (!estimateForm) return;

  // Get all step elements
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  const step4 = document.getElementById('step-4');
  
  // Get navigation buttons
  const next1Button = document.getElementById('next-1');
  const next2Button = document.getElementById('next-2');
  const next3Button = document.getElementById('next-3');
  const prev2Button = document.getElementById('prev-2');
  const prev3Button = document.getElementById('prev-3');
  const prev4Button = document.getElementById('prev-4');
  
  // Get the progress bar and indicators
  const progressIndicator = document.querySelector('.progress-indicator');
  const stepDots = document.querySelectorAll('.step-dot');
  
  // Service category selection handling
  const serviceCategory = document.getElementById('service-category');
  const serviceOptions = document.querySelectorAll('.service-options');
  
  if (serviceCategory) {
    serviceCategory.addEventListener('change', function() {
      // Hide all service options first
      serviceOptions.forEach(option => {
        option.classList.add('hidden');
      });
      
      // Show the relevant service options based on selection
      const selectedValue = this.value;
      if (selectedValue) {
        const optionsToShow = document.getElementById(`${selectedValue}-options`);
        if (optionsToShow) {
          optionsToShow.classList.remove('hidden');
        }
      }
    });
  }
  
  // Handle quantity buttons
  const setupQuantityButtons = () => {
    document.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const isPlus = this.classList.contains('plus');
        const input = this.parentNode.querySelector('input[type="number"]');
        
        if (isPlus) {
          input.value = parseInt(input.value) + 1;
        } else if (parseInt(input.value) > 0) {
          input.value = parseInt(input.value) - 1;
        }
      });
    });
  };
  
  // Call the function to set up quantity buttons
  setupQuantityButtons();
  
  // Step navigation functions
  const goToStep = (stepNumber) => {
    // Hide all steps
    [step1, step2, step3, step4].forEach(step => {
      if (step) step.classList.add('hidden');
    });
    
    // Show the correct step
    const currentStep = document.getElementById(`step-${stepNumber}`);
    if (currentStep) {
      currentStep.classList.remove('hidden');
    }
    
    // Update progress bar
    updateProgress(stepNumber);
  };
  
  const updateProgress = (stepNumber) => {
    // Update progress bar width
    if (progressIndicator) {
      progressIndicator.style.width = `${(stepNumber / 4) * 100}%`;
    }
    
    // Update step dots
    stepDots.forEach((dot, index) => {
      if (index < stepNumber) {
        dot.classList.remove('active');
        dot.classList.add('completed');
      } else if (index === stepNumber - 1) {
        dot.classList.add('active');
        dot.classList.remove('completed');
      } else {
        dot.classList.remove('active', 'completed');
      }
    });
  };
  
  // Field validation functions
  const validateContactInfo = () => {
    let isValid = true;
    
    // Get all required fields in step 1
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const zip = document.getElementById('zip');
    
    // Validate each field
    if (!name.value.trim()) {
      name.classList.add('border-red-500');
      isValid = false;
    } else {
      name.classList.remove('border-red-500');
    }
    
    if (!email.value.trim() || !email.value.includes('@')) {
      email.classList.add('border-red-500');
      isValid = false;
    } else {
      email.classList.remove('border-red-500');
    }
    
    if (!phone.value.trim()) {
      phone.classList.add('border-red-500');
      isValid = false;
    } else {
      phone.classList.remove('border-red-500');
    }
    
    if (!address.value.trim()) {
      address.classList.add('border-red-500');
      isValid = false;
    } else {
      address.classList.remove('border-red-500');
    }
    
    if (!city.value.trim()) {
      city.classList.add('border-red-500');
      isValid = false;
    } else {
      city.classList.remove('border-red-500');
    }
    
    if (!state.value) {
      state.classList.add('border-red-500');
      isValid = false;
    } else {
      state.classList.remove('border-red-500');
    }
    
    if (!zip.value.trim()) {
      zip.classList.add('border-red-500');
      isValid = false;
    } else {
      zip.classList.remove('border-red-500');
    }
    
    // Check for error display
    if (!isValid) {
      const errorMsg = document.getElementById('step1-error') || document.createElement('div');
      errorMsg.id = 'step1-error';
      errorMsg.className = 'text-red-600 mt-4';
      errorMsg.textContent = 'Please fill in all required fields';
      
      if (!document.getElementById('step1-error')) {
        document.getElementById('step-1').appendChild(errorMsg);
      }
    } else {
      const errorMsg = document.getElementById('step1-error');
      if (errorMsg) {
        errorMsg.remove();
      }
    }
    
    return isValid;
  };
  
  const validateProjectDetails = () => {
    let isValid = true;
    
    // Get the service category
    const serviceCategory = document.getElementById('service-category');
    
    // Check if a service is selected
    if (!serviceCategory.value) {
      serviceCategory.classList.add('border-red-500');
      isValid = false;
    } else {
      serviceCategory.classList.remove('border-red-500');
      
      // Check service-specific options
      const selectedService = serviceCategory.value;
      const serviceOptions = document.getElementById(`${selectedService}-options`);
      
      if (serviceOptions) {
        // For panel services, check if an option is selected
        if (selectedService === 'panel') {
          const panelOptions = serviceOptions.querySelectorAll('input[name="panel-option"]');
          const anyChecked = Array.from(panelOptions).some(option => option.checked);
          
          if (!anyChecked) {
            isValid = false;
            // Add error highlight to the panel options section
            serviceOptions.querySelector('h4').classList.add('text-red-600');
          } else {
            serviceOptions.querySelector('h4').classList.remove('text-red-600');
          }
        }
      }
    }
    
    // Check for error display
    if (!isValid) {
      const errorMsg = document.getElementById('step2-error') || document.createElement('div');
      errorMsg.id = 'step2-error';
      errorMsg.className = 'text-red-600 mt-4';
      errorMsg.textContent = 'Please select a service and fill in all required options';
      
      if (!document.getElementById('step2-error')) {
        document.getElementById('step-2').appendChild(errorMsg);
      }
    } else {
      const errorMsg = document.getElementById('step2-error');
      if (errorMsg) {
        errorMsg.remove();
      }
    }
    
    return isValid;
  };
  
  // Set up navigation button event listeners
  if (next1Button) {
    next1Button.addEventListener('click', function() {
      if (validateContactInfo()) {
        goToStep(2);
      }
    });
  }
  
  if (next2Button) {
    next2Button.addEventListener('click', function() {
      if (validateProjectDetails()) {
        goToStep(3);
      }
    });
  }
  
  if (next3Button) {
    next3Button.addEventListener('click', function() {
      goToStep(4);
    });
  }
  
  if (prev2Button) {
    prev2Button.addEventListener('click', function() {
      goToStep(1);
    });
  }
  
  if (prev3Button) {
    prev3Button.addEventListener('click', function() {
      goToStep(2);
    });
  }
  
  if (prev4Button) {
    prev4Button.addEventListener('click', function() {
      goToStep(3);
    });
  }
  
  // Initialize Google Places Autocomplete for address
  const initGooglePlacesAutocomplete = () => {
    const addressInput = document.getElementById('address');
    if (addressInput && window.google && window.google.maps && window.google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ['address'],
        componentRestrictions: { country: "us" }
      });
      
      autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        
        if (place.address_components) {
          // Extract address components
          for (const component of place.address_components) {
            const componentType = component.types[0];
            
            switch (componentType) {
              case "locality":
                document.getElementById('city').value = component.long_name;
                break;
              case "administrative_area_level_1":
                const stateSelect = document.getElementById('state');
                if (stateSelect) {
                  // Check if this state is in our options
                  const stateValue = component.short_name;
                  for (let i = 0; i < stateSelect.options.length; i++) {
                    if (stateSelect.options[i].value === stateValue) {
                      stateSelect.selectedIndex = i;
                      break;
                    }
                  }
                }
                break;
              case "postal_code":
                document.getElementById('zip').value = component.long_name;
                break;
            }
          }
        }
      });
    }
  };
  
  // Initialize Google Places when the API is loaded
  if (window.google && window.google.maps && window.google.maps.places) {
    initGooglePlacesAutocomplete();
  } else {
    // If the Google Maps script is loaded asynchronously, wait for it
    const googleApiCheckInterval = setInterval(function() {
      if (window.google && window.google.maps && window.google.maps.places) {
        clearInterval(googleApiCheckInterval);
        initGooglePlacesAutocomplete();
      }
    }, 100);
    
    // Give up after 10 seconds
    setTimeout(function() {
      clearInterval(googleApiCheckInterval);
    }, 10000);
  }
  
  // Add this script to the DOM
  const scriptLoaded = document.createElement('div');
  scriptLoaded.id = 'estimate-form-script-loaded';
  scriptLoaded.style.display = 'none';
  document.body.appendChild(scriptLoaded);
});