// Signup Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const userTypeSelect = document.getElementById('userType');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsAcceptedCheckbox = document.getElementById('termsAccepted');
    const newsletterCheckbox = document.getElementById('newsletter');
    const signupButton = document.getElementById('signupButton');
    const buttonText = document.querySelector('.button-text');
    const buttonLoader = document.querySelector('.button-loader');
    const messageContainer = document.getElementById('messageContainer');

    // Role-specific field containers
    const residentFields = document.getElementById('residentFields');
    const vendorFields = document.getElementById('vendorFields');
    const collectorFields = document.getElementById('collectorFields');

    // Password toggle functionality
    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const toggleButton = input.parentElement.querySelector('.password-toggle i');
        
        if (input.type === 'password') {
            input.type = 'text';
            toggleButton.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            toggleButton.className = 'fas fa-eye';
        }
    }

    // Make togglePassword function globally available
    window.togglePassword = togglePassword;

    // Show message function
    function showMessage(message, type = 'success') {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        
        messageContainer.appendChild(messageElement);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    }

    // Password strength checker
    function checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        let strength = 0;
        let feedback = '';

        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;

        // Character variety checks
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        // Determine strength level
        if (strength < 3) {
            strengthIndicator.className = 'password-strength weak';
            feedback = 'Weak password';
        } else if (strength < 5) {
            strengthIndicator.className = 'password-strength medium';
            feedback = 'Medium strength password';
        } else {
            strengthIndicator.className = 'password-strength strong';
            feedback = 'Strong password';
        }

        strengthIndicator.textContent = feedback;
        return strength;
    }

    // Show/hide role-specific fields
    function toggleRoleFields(userType) {
        // Hide all role fields first
        [residentFields, vendorFields, collectorFields].forEach(field => {
            if (field) field.style.display = 'none';
        });

        // Show relevant fields based on user type
        switch (userType) {
            case 'resident':
                if (residentFields) residentFields.style.display = 'block';
                break;
            case 'vendor':
                if (vendorFields) vendorFields.style.display = 'block';
                break;
            case 'collector':
                if (collectorFields) collectorFields.style.display = 'block';
                break;
        }
    }

    // Form validation
    function validateForm() {
        const userType = userTypeSelect.value;
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const termsAccepted = termsAcceptedCheckbox.checked;

        // Reset previous error states
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
            const errorMessage = group.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });

        let isValid = true;

        // Validate user type
        if (!userType) {
            showFieldError(userTypeSelect, 'Please select your user type');
            isValid = false;
        }

        // Validate first name
        if (!firstName) {
            showFieldError(firstNameInput, 'First name is required');
            isValid = false;
        } else if (firstName.length < 2) {
            showFieldError(firstNameInput, 'First name must be at least 2 characters long');
            isValid = false;
        }

        // Validate last name
        if (!lastName) {
            showFieldError(lastNameInput, 'Last name is required');
            isValid = false;
        } else if (lastName.length < 2) {
            showFieldError(lastNameInput, 'Last name must be at least 2 characters long');
            isValid = false;
        }

        // Validate email
        if (!email) {
            showFieldError(emailInput, 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Validate phone
        if (!phone) {
            showFieldError(phoneInput, 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phone)) {
            showFieldError(phoneInput, 'Please enter a valid phone number');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showFieldError(passwordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showFieldError(passwordInput, 'Password must be at least 8 characters long');
            isValid = false;
        } else if (checkPasswordStrength(password) < 3) {
            showFieldError(passwordInput, 'Password is too weak');
            isValid = false;
        }

        // Validate confirm password
        if (!confirmPassword) {
            showFieldError(confirmPasswordInput, 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        }

        // Validate terms acceptance
        if (!termsAccepted) {
            showFieldError(termsAcceptedCheckbox, 'You must accept the terms and conditions');
            isValid = false;
        }

        // Role-specific validation
        if (userType === 'resident') {
            const address = document.getElementById('address')?.value.trim();
            const city = document.getElementById('city')?.value.trim();
            const pincode = document.getElementById('pincode')?.value.trim();

            if (!address) {
                showFieldError(document.getElementById('address'), 'Address is required');
                isValid = false;
            }
            if (!city) {
                showFieldError(document.getElementById('city'), 'City is required');
                isValid = false;
            }
            if (!pincode) {
                showFieldError(document.getElementById('pincode'), 'Pincode is required');
                isValid = false;
            }
        }

        if (userType === 'vendor') {
            const companyName = document.getElementById('companyName')?.value.trim();
            const processingType = document.getElementById('processingType')?.value;
            const capacity = document.getElementById('capacity')?.value;

            if (!companyName) {
                showFieldError(document.getElementById('companyName'), 'Company name is required');
                isValid = false;
            }
            if (!processingType) {
                showFieldError(document.getElementById('processingType'), 'Processing type is required');
                isValid = false;
            }
            if (!capacity || capacity <= 0) {
                showFieldError(document.getElementById('capacity'), 'Valid capacity is required');
                isValid = false;
            }
        }

        if (userType === 'collector') {
            const vehicleNumber = document.getElementById('vehicleNumber')?.value.trim();
            const vehicleType = document.getElementById('vehicleType')?.value;

            if (!vehicleNumber) {
                showFieldError(document.getElementById('vehicleNumber'), 'Vehicle number is required');
                isValid = false;
            }
            if (!vehicleType) {
                showFieldError(document.getElementById('vehicleType'), 'Vehicle type is required');
                isValid = false;
            }
        }

        return isValid;
    }

    // Show field error
    function showFieldError(input, message) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.add('error');
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        formGroup.appendChild(errorMessage);
    }

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone validation
    function isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // Show loading state
    function showLoading() {
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'flex';
        signupButton.disabled = true;
    }

    // Hide loading state
    function hideLoading() {
        buttonText.style.display = 'flex';
        buttonLoader.style.display = 'none';
        signupButton.disabled = false;
    }

    // Get API endpoint based on user type
    function getSignupEndpoint(userType) {
        const endpoints = {
            'resident': '/api/v1/residents/register',
            'collector': '/api/v1/collectors/register',
            'vendor': '/api/v1/vendors/register',
            'admin': '/api/v1/admin/register'
        };
        return endpoints[userType] || '/api/v1/residents/register';
    }

    // Prepare signup data based on user type
    function prepareSignupData(userType) {
        const baseData = {
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            password: passwordInput.value,
            newsletter: newsletterCheckbox.checked
        };

        switch (userType) {
            case 'resident':
                return {
                    ...baseData,
                    address: document.getElementById('address')?.value.trim(),
                    city: document.getElementById('city')?.value.trim(),
                    pincode: document.getElementById('pincode')?.value.trim()
                };
            case 'vendor':
                return {
                    ...baseData,
                    companyName: document.getElementById('companyName')?.value.trim(),
                    processingType: document.getElementById('processingType')?.value,
                    capacity: parseInt(document.getElementById('capacity')?.value) || 0
                };
            case 'collector':
                return {
                    ...baseData,
                    vehicleNumber: document.getElementById('vehicleNumber')?.value.trim(),
                    vehicleType: document.getElementById('vehicleType')?.value
                };
            default:
                return baseData;
        }
    }

    // Handle form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            showLoading();

            const userType = userTypeSelect.value;
            const signupData = prepareSignupData(userType);
            const endpoint = getSignupEndpoint(userType);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signupData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('Account created successfully! Please check your email for verification.', 'success');
                
                // Clear form
                signupForm.reset();
                toggleRoleFields('');
                
                // Redirect to login page after 3 seconds
                setTimeout(() => {
                    window.location.href = '/public/HTML/login.html';
                }, 3000);

            } else {
                const errorMessage = result.message || 'Registration failed. Please try again.';
                showMessage(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Signup error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            hideLoading();
        }
    });

    // Event listeners
    userTypeSelect.addEventListener('change', function() {
        toggleRoleFields(this.value);
    });

    passwordInput.addEventListener('input', function() {
        if (this.value) {
            checkPasswordStrength(this.value);
        } else {
            document.getElementById('passwordStrength').textContent = '';
            document.getElementById('passwordStrength').className = 'password-strength';
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        if (this.value && this.value !== password) {
            showFieldError(this, 'Passwords do not match');
        } else {
            this.closest('.form-group').classList.remove('error');
            const errorMessage = this.closest('.form-group').querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    });

    // Real-time validation for all inputs
    const inputs = signupForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });

        input.addEventListener('input', function() {
            // Clear error on input
            this.closest('.form-group').classList.remove('error');
            const errorMessage = this.closest('.form-group').querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    });

    // Field-specific validation
    function validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name;

        switch (fieldName) {
            case 'firstName':
            case 'lastName':
                if (value && value.length < 2) {
                    showFieldError(input, `${fieldName === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters long`);
                }
                break;
            case 'email':
                if (value && !isValidEmail(value)) {
                    showFieldError(input, 'Please enter a valid email address');
                }
                break;
            case 'phone':
                if (value && !isValidPhone(value)) {
                    showFieldError(input, 'Please enter a valid phone number');
                }
                break;
            case 'password':
                if (value && value.length < 8) {
                    showFieldError(input, 'Password must be at least 8 characters long');
                }
                break;
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            signupForm.dispatchEvent(new Event('submit'));
        }
    });

    // Focus management
    userTypeSelect.focus();

    // Accessibility improvements
    signupForm.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            // Handle tab navigation
            const focusableElements = signupForm.querySelectorAll('input, select, button, a');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });

    // Add loading animation to button
    signupButton.addEventListener('click', function() {
        if (this.disabled) return;
        
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // Initialize form
    toggleRoleFields('');
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .signup-button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
