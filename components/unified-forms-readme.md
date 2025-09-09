# AJ Long Electric - Unified Form System

## Overview

The Unified Form System consolidates all form implementations across the AJ Long Electric website into a single, flexible, and maintainable solution. This system replaces the previous multiple form implementations with a standardized approach that supports:

- **Contact Forms** (simple 1-step)
- **Estimate Forms** (2-step with service details)
- **Comprehensive Service Forms** (3-step with scheduling preferences)

## Key Benefits

✅ **Consistency** - All forms use the same styling and behavior
✅ **Maintainability** - Single codebase for all form types
✅ **Accessibility** - WCAG 2.1 AA compliant
✅ **Mobile Optimized** - Touch-friendly with responsive design
✅ **Reliability** - Built-in fallback to Netlify Forms
✅ **Integration** - Maintains existing Housecall Pro & SendGrid connections

## File Structure

```
/public/
├── components/
│   ├── unified-form.html                    # Main form component
│   ├── netlify-forms-backup.html           # Backup system
│   ├── contact-form-unified.html           # Contact form example
│   ├── estimate-form-unified.html          # Estimate form example
│   └── comprehensive-form-unified.html     # Comprehensive form example
├── js/
│   └── unified-form-handler.js             # JavaScript controller
└── assets/css/
    └── unified-forms.css                   # Consolidated styles
```

## Implementation Guide

### 1. Basic Contact Form

```html
<!-- Include required stylesheets -->
<link rel="stylesheet" href="/assets/css/unified-forms.css">
<link rel="stylesheet" href="/assets/css/accessibility-improvements.css">

<!-- Form container with type specification -->
<div class="unified-form-container" data-form-type="contact">
    <!-- Include the unified form component -->
    <div data-include="/components/unified-form.html"></div>
</div>

<!-- Include backup forms -->
<div data-include="/components/netlify-forms-backup.html"></div>

<!-- Include required scripts -->
<script src="/js/include-html.js"></script>
<script src="/js/unified-form-handler.js"></script>
```

### 2. Estimate Form (2-step)

```html
<div class="unified-form-container" data-form-type="estimate">
    <div data-include="/components/unified-form.html"></div>
</div>
```

### 3. Comprehensive Service Form (3-step)

```html
<div class="unified-form-container" data-form-type="comprehensive">
    <div data-include="/components/unified-form.html"></div>
</div>
```

## Form Configuration

### Data Attributes

- `data-form-type="contact"` - Simple 1-step contact form
- `data-form-type="estimate"` - 2-step estimate form with service details
- `data-form-type="comprehensive"` - 3-step comprehensive form with scheduling

### Automatic Behavior

The form automatically configures itself based on the `data-form-type` attribute:

- **Contact**: Shows only Step 1 (contact information)
- **Estimate**: Shows Steps 1-2 (contact + service details)
- **Comprehensive**: Shows Steps 1-3 (contact + service + scheduling)

## Features

### Multi-Step Navigation
- Progress bar with step indicators
- Previous/Next buttons with validation
- Smooth transitions between steps
- Mobile-optimized navigation

### File Upload System
- Drag and drop support
- Multiple file types (images, videos, PDFs)
- File size validation (5MB max)
- Preview thumbnails with remove functionality
- Maximum 10 files per submission

### Form Validation
- Real-time field validation
- Required field checking
- Email format validation
- Phone number formatting
- Service area validation
- Error message display

### Accessibility Features
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion support
- Proper ARIA labels and roles

### Mobile Optimizations
- Touch-friendly 48px minimum tap targets
- Responsive grid layouts
- Mobile-specific styling
- iOS zoom prevention (16px font size)
- Optimized keyboard interactions

## Integration Points

### Existing Integrations (Maintained)
- **Housecall Pro CRM** - Creates jobs/estimates automatically
- **SendGrid Email** - Fallback email notifications
- **Cloudinary** - File upload and storage
- **Google Places** - Address autocomplete

### Backup System
- **Netlify Forms** - Automatic fallback when main integrations fail
- Preserves all form data even if primary submission fails
- Silent failover with user-friendly error handling

## Form Endpoints

```javascript
// Configured automatically based on form type
const endpoints = {
    contact: '/.netlify/functions/form-handler',
    estimate: '/.netlify/functions/housecall-pro-estimate', 
    comprehensive: '/.netlify/functions/housecall-pro-comprehensive'
};
```

## Customization

### CSS Variables

```css
:root {
    --aj-orange: #FF7200;
    --aj-dark: #222222;
    --form-border-color: #e5e7eb;
    --form-border-radius: 8px;
    --form-focus-color: #0066CC;
    --form-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    --form-transition: all 0.3s ease;
}
```

### Form Titles and Subtitles

The form automatically sets appropriate titles based on type, but these can be customized:

```javascript
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
```

## Migration from Existing Forms

### 1. Replace HTML Structure

**Before:**
```html
<form id="contact-form" method="POST">
    <!-- Custom form fields -->
</form>
```

**After:**
```html
<div class="unified-form-container" data-form-type="contact">
    <div data-include="/components/unified-form.html"></div>
</div>
```

### 2. Update CSS References

Replace existing form CSS files with:
```html
<link rel="stylesheet" href="/assets/css/unified-forms.css">
```

### 3. Update JavaScript

Replace custom form handlers with:
```html
<script src="/js/unified-form-handler.js"></script>
```

## Testing Checklist

- [ ] Form loads correctly on all pages
- [ ] Multi-step navigation works properly
- [ ] File upload functionality works
- [ ] Form validation triggers appropriately
- [ ] Primary submission to Housecall Pro works
- [ ] Backup submission to Netlify Forms works
- [ ] Mobile responsiveness verified
- [ ] Accessibility tested with screen reader
- [ ] Cross-browser compatibility verified

## Support

### Form Submission Endpoints

1. **Primary**: Housecall Pro integration via Netlify Functions
2. **Backup**: Native Netlify Forms processing
3. **Error Handling**: Graceful fallback with user notifications

### Monitoring

Monitor form submissions through:
- Netlify Functions logs
- Netlify Forms dashboard  
- Housecall Pro CRM entries
- SendGrid email delivery logs

### Troubleshooting

Common issues and solutions:

1. **Form not loading**: Check include-html.js is loaded
2. **Styles not applied**: Verify unified-forms.css is included
3. **Submission failing**: Check Netlify Functions deployment
4. **File upload issues**: Verify file size and type restrictions
5. **Mobile layout issues**: Check viewport meta tag and responsive CSS

## Performance Considerations

- Form components are loaded via includes (cached after first load)
- CSS is consolidated to reduce HTTP requests
- JavaScript is optimized for minimal DOM manipulation
- File uploads are compressed automatically via Cloudinary
- Form validation is debounced to improve performance

## Security Features

- CSRF protection via Netlify Forms
- File type validation and size limits
- Server-side validation of all inputs
- No sensitive data stored in client-side code
- Automatic sanitization of user inputs