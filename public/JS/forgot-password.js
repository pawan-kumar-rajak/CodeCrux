// Forgot Password JS
// Handles: email submission, OTP verification, password reset
// Uses: /api/v1/residents/send_forgot_password_otp, /api/v1/residents/verify_otp, /api/v1/residents/change_current_password

document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailForm');
    const otpForm = document.getElementById('otpForm');
    const userTypeSelect = document.getElementById('userType');
    const emailInput = document.getElementById('email');
    const resetButton = emailForm.querySelector('.reset-button');
    const buttonText = resetButton.querySelector('.button-text');
    const buttonLoader = resetButton.querySelector('.button-loader');
    const messageContainer = document.getElementById('messageContainer');

    // OTP fields
    const otpInputs = Array.from(document.querySelectorAll('.otp-input'));
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const otpResetButton = otpForm.querySelector('.reset-button');
    const otpButtonText = otpResetButton.querySelector('.button-text');
    const otpButtonLoader = otpResetButton.querySelector('.button-loader');
    const passwordStrength = document.getElementById('passwordStrength');

    let currentEmail = '';
    let currentUserType = '';

    // Password toggle
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const toggleButton = input.parentElement.querySelector('.password-toggle i');
        if (input.type === 'password') {
            input.type = 'text';
            toggleButton.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            toggleButton.className = 'fas fa-eye';
        }
    };

    // Show message
    function showMessage(message, type = 'success') {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        messageContainer.appendChild(messageElement);
        setTimeout(() => {
            if (messageElement.parentNode) messageElement.parentNode.removeChild(messageElement);
        }, 5000);
    }

    // Password strength
    function checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        if (strength < 3) {
            passwordStrength.className = 'password-strength weak';
            passwordStrength.textContent = 'Weak password';
        } else if (strength < 5) {
            passwordStrength.className = 'password-strength medium';
            passwordStrength.textContent = 'Medium strength password';
        } else {
            passwordStrength.className = 'password-strength strong';
            passwordStrength.textContent = 'Strong password';
        }
        return strength;
    }

    // Step 1: Email submission
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const userType = userTypeSelect.value;
        const email = emailInput.value.trim();
        if (!userType) {
            showMessage('Please select your account type.', 'error');
            return;
        }
        if (!email) {
            showMessage('Please enter your email address.', 'error');
            return;
        }
        showLoading(resetButton, buttonText, buttonLoader);
        try {
            // Only resident implemented here, but you can add others
            let endpoint = '';
            if (userType === 'resident') {
                endpoint = '/api/v1/residents/send_forgot_password_otp';
            } else {
                showMessage('Forgot password only implemented for residents in this demo.', 'error');
                hideLoading(resetButton, buttonText, buttonLoader);
                return;
            }
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showMessage('OTP sent to your email. Please check your inbox.', 'success');
                currentEmail = email;
                currentUserType = userType;
                emailForm.style.display = 'none';
                otpForm.style.display = 'block';
                otpInputs[0].focus();
            } else {
                showMessage(result.message || 'Failed to send OTP.', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            hideLoading(resetButton, buttonText, buttonLoader);
        }
    });

    // OTP input auto-advance
    otpInputs.forEach((input, idx) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && idx < otpInputs.length - 1) {
                otpInputs[idx + 1].focus();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                otpInputs[idx - 1].focus();
            }
        });
    });

    // Step 2: OTP verification and password reset
    otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const otp = otpInputs.map(input => input.value).join('');
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;
        if (otp.length !== 6) {
            showMessage('Please enter the 6-digit verification code.', 'error');
            return;
        }
        if (!newPassword || !confirmNewPassword) {
            showMessage('Please enter and confirm your new password.', 'error');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }
        if (checkPasswordStrength(newPassword) < 3) {
            showMessage('Password is too weak.', 'error');
            return;
        }
        showLoading(otpResetButton, otpButtonText, otpButtonLoader);
        try {
            // 1. Verify OTP
            let verifyEndpoint = '';
            let changePasswordEndpoint = '';
            if (currentUserType === 'resident') {
                verifyEndpoint = '/api/v1/residents/verify_otp';
                changePasswordEndpoint = '/api/v1/residents/change_current_password';
            } else {
                showMessage('Forgot password only implemented for residents in this demo.', 'error');
                hideLoading(otpResetButton, otpButtonText, otpButtonLoader);
                return;
            }
            // Verify OTP
            const verifyRes = await fetch(verifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, otp })
            });
            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok || !verifyResult.success) {
                showMessage(verifyResult.message || 'Invalid or expired OTP.', 'error');
                hideLoading(otpResetButton, otpButtonText, otpButtonLoader);
                return;
            }
            // Change password
            const changeRes = await fetch(changePasswordEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: '', newPassword })
            });
            const changeResult = await changeRes.json();
            if (changeRes.ok && changeResult.success) {
                showMessage('Password reset successful! You can now log in.', 'success');
                setTimeout(() => {
                    window.location.href = '/public/HTML/login.html';
                }, 2000);
            } else {
                showMessage(changeResult.message || 'Failed to reset password.', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            hideLoading(otpResetButton, otpButtonText, otpButtonLoader);
        }
    });

    // Password strength feedback
    newPasswordInput.addEventListener('input', function() {
        if (this.value) {
            checkPasswordStrength(this.value);
        } else {
            passwordStrength.textContent = '';
            passwordStrength.className = 'password-strength';
        }
    });

    // Loading helpers
    function showLoading(btn, text, loader) {
        text.style.display = 'none';
        loader.style.display = 'flex';
        btn.disabled = true;
    }
    function hideLoading(btn, text, loader) {
        text.style.display = 'flex';
        loader.style.display = 'none';
        btn.disabled = false;
    }
});
