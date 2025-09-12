/**
 * Validation Manager - Handles data validation and sanitization
 */
class ValidationManager {
    constructor() {
        this.validationRules = new Map();
        this.sanitizers = new Map();
        this.errorMessages = new Map();
        
        this.initializeDefaultRules();
        this.initializeDefaultSanitizers();
        this.initializeErrorMessages();
    }

    /**
     * Initialize default validation rules
     */
    initializeDefaultRules() {
        // Email validation
        this.addRule('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });

        // Phone validation
        this.addRule('phone', (value) => {
            const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
            return value.length >= 10 && phoneRegex.test(value);
        });

        // Required field validation
        this.addRule('required', (value) => {
            return value != null && value.toString().trim().length > 0;
        });

        // Minimum length validation
        this.addRule('minLength', (value, minLength) => {
            return value && value.toString().length >= minLength;
        });

        // Maximum length validation
        this.addRule('maxLength', (value, maxLength) => {
            return !value || value.toString().length <= maxLength;
        });

        // URL validation
        this.addRule('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        // Date validation
        this.addRule('date', (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
        });

        // Alpha numeric validation
        this.addRule('alphaNumeric', (value) => {
            const alphaNumericRegex = /^[a-zA-Z0-9\s]+$/;
            return alphaNumericRegex.test(value);
        });

        // Status validation
        this.addRule('status', (value) => {
            const validStatuses = ['new', 'in_progress', 'completed', 'closed'];
            return validStatuses.includes(value);
        });

        // Form type validation
        this.addRule('formType', (value) => {
            const validTypes = ['estimate', 'schedule', 'inquiry'];
            return validTypes.includes(value);
        });
    }

    /**
     * Initialize default sanitizers
     */
    initializeDefaultSanitizers() {
        // HTML sanitization
        this.addSanitizer('html', (value) => {
            if (!value) return '';
            return value.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        });

        // Trim whitespace
        this.addSanitizer('trim', (value) => {
            return value ? value.toString().trim() : '';
        });

        // Email sanitization
        this.addSanitizer('email', (value) => {
            return value ? value.toString().toLowerCase().trim() : '';
        });

        // Phone sanitization
        this.addSanitizer('phone', (value) => {
            if (!value) return '';
            // Remove all non-digit characters except + at the beginning
            return value.toString().replace(/[^\d\+]/g, '').replace(/(?!^)\+/g, '');
        });

        // SQL injection prevention
        this.addSanitizer('sql', (value) => {
            if (!value) return '';
            return value.toString()
                .replace(/['";\\]/g, '')
                .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '');
        });

        // Remove scripts and dangerous HTML
        this.addSanitizer('xss', (value) => {
            if (!value) return '';
            return value.toString()
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        });

        // Capitalize first letter
        this.addSanitizer('capitalize', (value) => {
            if (!value) return '';
            const str = value.toString().trim();
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        });

        // Remove extra spaces
        this.addSanitizer('spaces', (value) => {
            if (!value) return '';
            return value.toString().replace(/\s+/g, ' ').trim();
        });
    }

    /**
     * Initialize error messages
     */
    initializeErrorMessages() {
        this.errorMessages.set('email', 'Please enter a valid email address');
        this.errorMessages.set('phone', 'Please enter a valid phone number');
        this.errorMessages.set('required', 'This field is required');
        this.errorMessages.set('minLength', 'This field is too short');
        this.errorMessages.set('maxLength', 'This field is too long');
        this.errorMessages.set('url', 'Please enter a valid URL');
        this.errorMessages.set('date', 'Please enter a valid date');
        this.errorMessages.set('alphaNumeric', 'Only letters and numbers are allowed');
        this.errorMessages.set('status', 'Invalid status value');
        this.errorMessages.set('formType', 'Invalid form type');
    }

    /**
     * Add a validation rule
     */
    addRule(name, validator) {
        this.validationRules.set(name, validator);
    }

    /**
     * Add a sanitizer
     */
    addSanitizer(name, sanitizer) {
        this.sanitizers.set(name, sanitizer);
    }

    /**
     * Validate a single value
     */
    validate(value, rules) {
        const errors = [];

        for (const rule of rules) {
            const ruleName = typeof rule === 'string' ? rule : rule.name;
            const ruleParams = typeof rule === 'object' ? rule.params : [];
            const customMessage = typeof rule === 'object' ? rule.message : null;

            const validator = this.validationRules.get(ruleName);
            if (!validator) {
                console.warn(`Unknown validation rule: ${ruleName}`);
                continue;
            }

            const isValid = validator(value, ...ruleParams);
            if (!isValid) {
                const message = customMessage || this.errorMessages.get(ruleName) || 'Validation failed';
                errors.push({
                    rule: ruleName,
                    message: message,
                    params: ruleParams
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanitize a value
     */
    sanitize(value, sanitizers) {
        let cleanValue = value;

        for (const sanitizerName of sanitizers) {
            const sanitizer = this.sanitizers.get(sanitizerName);
            if (sanitizer) {
                cleanValue = sanitizer(cleanValue);
            } else {
                console.warn(`Unknown sanitizer: ${sanitizerName}`);
            }
        }

        return cleanValue;
    }

    /**
     * Validate an object with schema
     */
    validateObject(data, schema) {
        const results = {};
        let isValid = true;

        for (const [field, config] of Object.entries(schema)) {
            const value = data[field];
            const rules = config.rules || [];
            const sanitizers = config.sanitizers || [];
            
            // Sanitize first
            const sanitizedValue = this.sanitize(value, sanitizers);
            
            // Then validate
            const validationResult = this.validate(sanitizedValue, rules);
            
            results[field] = {
                value: sanitizedValue,
                originalValue: value,
                isValid: validationResult.isValid,
                errors: validationResult.errors
            };

            if (!validationResult.isValid) {
                isValid = false;
            }
        }

        return {
            isValid: isValid,
            fields: results,
            sanitizedData: Object.fromEntries(
                Object.entries(results).map(([key, result]) => [key, result.value])
            )
        };
    }

    /**
     * Validate form submission data
     */
    validateFormSubmission(data) {
        const schema = {
            customer_name: {
                rules: ['required', { name: 'minLength', params: [2] }, { name: 'maxLength', params: [100] }],
                sanitizers: ['trim', 'html', 'xss', 'spaces']
            },
            customer_email: {
                rules: ['required', 'email'],
                sanitizers: ['trim', 'email', 'html']
            },
            customer_phone: {
                rules: [{ name: 'minLength', params: [10] }],
                sanitizers: ['trim', 'phone']
            },
            subject: {
                rules: [{ name: 'maxLength', params: [200] }],
                sanitizers: ['trim', 'html', 'xss', 'spaces']
            },
            message: {
                rules: ['required', { name: 'minLength', params: [10] }, { name: 'maxLength', params: [2000] }],
                sanitizers: ['trim', 'html', 'xss']
            },
            form_type: {
                rules: ['required', 'formType'],
                sanitizers: ['trim']
            },
            status: {
                rules: ['status'],
                sanitizers: ['trim']
            }
        };

        return this.validateObject(data, schema);
    }

    /**
     * Validate admin response data
     */
    validateAdminResponse(data) {
        const schema = {
            message: {
                rules: ['required', { name: 'minLength', params: [5] }, { name: 'maxLength', params: [2000] }],
                sanitizers: ['trim', 'html', 'xss']
            },
            send_email: {
                rules: [],
                sanitizers: ['trim']
            }
        };

        return this.validateObject(data, schema);
    }

    /**
     * Validate search query
     */
    validateSearchQuery(query) {
        const schema = {
            q: {
                rules: [{ name: 'minLength', params: [2] }, { name: 'maxLength', params: [100] }],
                sanitizers: ['trim', 'html', 'xss', 'sql']
            }
        };

        return this.validateObject({ q: query }, schema);
    }

    /**
     * Real-time field validation
     */
    validateField(element) {
        const fieldName = element.name || element.id;
        const value = element.value;
        const rules = this.getFieldRules(element);
        
        if (rules.length === 0) return { isValid: true, errors: [] };

        const result = this.validate(value, rules);
        
        // Update UI to show validation status
        this.updateFieldUI(element, result);
        
        return result;
    }

    /**
     * Get validation rules for a field element
     */
    getFieldRules(element) {
        const rules = [];
        
        // Check HTML5 validation attributes
        if (element.required) {
            rules.push('required');
        }
        
        if (element.type === 'email') {
            rules.push('email');
        }
        
        if (element.type === 'tel') {
            rules.push('phone');
        }
        
        if (element.type === 'url') {
            rules.push('url');
        }
        
        if (element.minLength) {
            rules.push({ name: 'minLength', params: [element.minLength] });
        }
        
        if (element.maxLength) {
            rules.push({ name: 'maxLength', params: [element.maxLength] });
        }

        // Check custom data attributes
        if (element.dataset.validate) {
            const customRules = element.dataset.validate.split(',').map(rule => rule.trim());
            rules.push(...customRules);
        }

        return rules;
    }

    /**
     * Update field UI based on validation result
     */
    updateFieldUI(element, result) {
        const container = element.closest('.field-container') || element.parentElement;
        
        // Remove existing validation classes and messages
        element.classList.remove('border-red-500', 'border-green-500');
        const existingError = container.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }

        if (!result.isValid) {
            // Add error styling
            element.classList.add('border-red-500');
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error text-red-600 text-xs mt-1';
            errorDiv.textContent = result.errors[0].message;
            
            if (element.nextElementSibling) {
                container.insertBefore(errorDiv, element.nextElementSibling);
            } else {
                container.appendChild(errorDiv);
            }
        } else if (element.value.trim()) {
            // Add success styling for non-empty valid fields
            element.classList.add('border-green-500');
        }
    }

    /**
     * Initialize real-time validation for form
     */
    initializeFormValidation(formElement) {
        const fields = formElement.querySelectorAll('input, textarea, select');
        
        fields.forEach(field => {
            // Validate on blur
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
            
            // Clear errors on input
            field.addEventListener('input', () => {
                if (field.classList.contains('border-red-500')) {
                    field.classList.remove('border-red-500');
                    const container = field.closest('.field-container') || field.parentElement;
                    const existingError = container.querySelector('.validation-error');
                    if (existingError) {
                        existingError.remove();
                    }
                }
            });
        });

        // Validate entire form on submit
        formElement.addEventListener('submit', (e) => {
            let isValid = true;
            
            fields.forEach(field => {
                const result = this.validateField(field);
                if (!result.isValid) {
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();
                Toast.error('Please fix the validation errors before submitting');
                
                // Focus on first invalid field
                const firstInvalidField = formElement.querySelector('.border-red-500');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
            }
        });
    }

    /**
     * Sanitize all inputs in a form
     */
    sanitizeForm(formElement) {
        const fields = formElement.querySelectorAll('input, textarea');
        const sanitizedData = {};

        fields.forEach(field => {
            const sanitizers = this.getFieldSanitizers(field);
            const sanitizedValue = this.sanitize(field.value, sanitizers);
            
            field.value = sanitizedValue;
            sanitizedData[field.name || field.id] = sanitizedValue;
        });

        return sanitizedData;
    }

    /**
     * Get sanitizers for a field element
     */
    getFieldSanitizers(element) {
        const sanitizers = ['trim', 'html', 'xss'];
        
        if (element.type === 'email') {
            sanitizers.push('email');
        }
        
        if (element.type === 'tel') {
            sanitizers.push('phone');
        }

        // Check custom data attributes
        if (element.dataset.sanitize) {
            const customSanitizers = element.dataset.sanitize.split(',').map(s => s.trim());
            sanitizers.push(...customSanitizers);
        }

        return sanitizers;
    }

    /**
     * Initialize validation for all forms on the page
     */
    initializePageValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            this.initializeFormValidation(form);
        });
    }
}