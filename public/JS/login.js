// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const userTypeSelect = document.getElementById('userType');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.querySelector('.button-text');
    const buttonLoader = document.querySelector('.button-loader');
    const messageContainer = document.getElementById('messageContainer');

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

    // Form validation
    function validateForm() {
        const userType = userTypeSelect.value;
        const email = emailInput.value.trim();
        const password = passwordInput.value;

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

        // Validate email
        if (!email) {
            showFieldError(emailInput, 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showFieldError(passwordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showFieldError(passwordInput, 'Password must be at least 6 characters long');
            isValid = false;
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

    // Show loading state
    function showLoading() {
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'flex';
        loginButton.disabled = true;
    }

    // Hide loading state
    function hideLoading() {
        buttonText.style.display = 'flex';
        buttonLoader.style.display = 'none';
        loginButton.disabled = false;
    }

    // Get API endpoint based on user type
    function getLoginEndpoint(userType) {
        const endpoints = {
            'resident': '/api/v1/residents/login',
            'collector': '/api/v1/collectors/login',
            'vendor': '/api/v1/vendors/login',
            'admin': '/api/v1/admin/login'
        };
        return endpoints[userType] || '/api/v1/residents/login';
    }

    // Get dashboard URL based on user type
    function getDashboardUrl(userType) {
        const dashboards = {
            'resident': '/public/HTML/resident.dashboard.html',
            'collector': '/public/HTML/collector.dashboard.html',
            'vendor': '/public/HTML/vendor.dashboard.html',
            'admin': '/public/HTML/admin.dashboard.html'
        };
        return dashboards[userType] || '/public/HTML/resident.dashboard.html';
    }

    // Set authentication cookies
    function setAuthCookies(accessToken, refreshToken) {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days
        
        document.cookie = `accessToken=${accessToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
        document.cookie = `refreshToken=${refreshToken}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    }

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            showLoading();

            const userType = userTypeSelect.value;
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = rememberMeCheckbox.checked;

            const loginData = {
                email: email,
                password: password
            };

            const endpoint = getLoginEndpoint(userType);
            
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Store tokens
                if (result.data.accessToken && result.data.refreshToken) {
                    setAuthCookies(result.data.accessToken, result.data.refreshToken);
                }

                // Store user info in localStorage if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('userType', userType);
                    localStorage.setItem('userEmail', email);
                } else {
                    localStorage.removeItem('userType');
                    localStorage.removeItem('userEmail');
                }

                showMessage('Login successful! Redirecting...', 'success');

                // Redirect to appropriate dashboard
                setTimeout(() => {
                    const dashboardUrl = getDashboardUrl(userType);
                    window.location.href = dashboardUrl;
                }, 1500);

            } else {
                const errorMessage = result.message || 'Login failed. Please check your credentials.';
                showMessage(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            hideLoading();
        }
    });

    // Auto-fill form if remember me data exists
    function loadRememberedData() {
        const rememberedUserType = localStorage.getItem('userType');
        const rememberedEmail = localStorage.getItem('userEmail');

        if (rememberedUserType) {
            userTypeSelect.value = rememberedUserType;
        }

        if (rememberedEmail) {
            emailInput.value = rememberedEmail;
            rememberMeCheckbox.checked = true;
        }
    }

    // Load remembered data on page load
    loadRememberedData();

    // Real-time validation
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !isValidEmail(email)) {
            showFieldError(this, 'Please enter a valid email address');
        } else {
            this.closest('.form-group').classList.remove('error');
            const errorMessage = this.closest('.form-group').querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    });

    passwordInput.addEventListener('blur', function() {
        const password = this.value;
        if (password && password.length < 6) {
            showFieldError(this, 'Password must be at least 6 characters long');
        } else {
            this.closest('.form-group').classList.remove('error');
            const errorMessage = this.closest('.form-group').querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    });

    // Clear errors on input
    emailInput.addEventListener('input', function() {
        this.closest('.form-group').classList.remove('error');
        const errorMessage = this.closest('.form-group').querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    });

    passwordInput.addEventListener('input', function() {
        this.closest('.form-group').classList.remove('error');
        const errorMessage = this.closest('.form-group').querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Focus management
    userTypeSelect.focus();

    // Accessibility improvements
    loginForm.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            // Handle tab navigation
            const focusableElements = loginForm.querySelectorAll('input, select, button, a');
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
    loginButton.addEventListener('click', function() {
        if (this.disabled) return;
        
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // Check if user is already logged in
    function checkAuthStatus() {
        const accessToken = getCookie('accessToken');
        if (accessToken) {
            // User is already logged in, redirect to appropriate dashboard
            const userType = localStorage.getItem('userType') || 'resident';
            const dashboardUrl = getDashboardUrl(userType);
            window.location.href = dashboardUrl;
        }
    }

    // Get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Check auth status on page load
    checkAuthStatus();
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .login-button {
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
