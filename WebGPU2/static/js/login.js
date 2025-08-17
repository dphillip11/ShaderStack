// Login Modal Component
class LoginModal {
    constructor() {
        this.modal = document.getElementById('login-modal');
        this.loginBtn = document.getElementById('login-btn');
        this.closeBtn = document.querySelector('.modal-close');
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('login-username');
        this.passwordInput = document.getElementById('login-password');
        this.submitBtn = document.querySelector('#login-form button[type="submit"]');
        this.errorMessage = document.getElementById('login-error');
        
        this.isLoading = false;
    }

    initialize() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {
        // Open modal button
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                this.openModal();
            });
        }

        // Close modal button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Close modal when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Form submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Input validation on keyup
        if (this.usernameInput) {
            this.usernameInput.addEventListener('keyup', () => {
                this.validateInputs();
            });
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('keyup', () => {
                this.validateInputs();
            });
        }
    }

    setupKeyboardShortcuts() {
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Ctrl+L or Cmd+L to open login modal (when not authenticated)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'l' && this.loginBtn && !this.isModalOpen()) {
                e.preventDefault();
                this.openModal();
            }
        });
    }

    openModal() {
        if (!this.modal) return;

        this.modal.style.display = 'flex';
        this.clearForm();
        this.clearError();
        
        // Focus on username input
        if (this.usernameInput) {
            setTimeout(() => {
                this.usernameInput.focus();
            }, 100);
        }

        // Add body class to prevent scrolling
        document.body.classList.add('modal-open');
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        this.clearForm();
        this.clearError();
        this.setLoading(false);

        // Remove body class
        document.body.classList.remove('modal-open');
    }

    isModalOpen() {
        return this.modal && this.modal.style.display === 'flex';
    }

    clearForm() {
        if (this.usernameInput) this.usernameInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
        this.validateInputs();
    }

    clearError() {
        if (this.errorMessage) {
            this.errorMessage.textContent = '';
            this.errorMessage.style.display = 'none';
        }
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        }
    }

    validateInputs() {
        const username = this.usernameInput ? this.usernameInput.value.trim() : '';
        const password = this.passwordInput ? this.passwordInput.value : '';
        
        const isValid = username.length >= 3 && password.length >= 3;
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !isValid || this.isLoading;
        }

        return isValid;
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        if (this.submitBtn) {
            this.submitBtn.disabled = loading || !this.validateInputs();
            this.submitBtn.innerHTML = loading ? 
                '<i class="fas fa-spinner fa-spin"></i> Logging in...' : 
                '<i class="fas fa-sign-in-alt"></i> Login';
        }

        // Disable form inputs during loading
        if (this.usernameInput) this.usernameInput.disabled = loading;
        if (this.passwordInput) this.passwordInput.disabled = loading;
    }

    async handleLogin() {
        if (!this.validateInputs() || this.isLoading) return;

        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;

        this.clearError();
        this.setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.handleLoginSuccess(data);
            } else {
                const errorText = await response.text();
                this.handleLoginError(errorText || 'Login failed');
            }
        } catch (error) {
            this.handleLoginError('Network error: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    handleLoginSuccess(data) {
        this.showNotification('Login successful! Welcome back.', 'success');
        
        // Close modal
        this.closeModal();
        
        // Reload page to update authentication state
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    handleLoginError(errorMessage) {
        this.showError(errorMessage);
        
        // Focus back on username input
        if (this.usernameInput) {
            this.usernameInput.focus();
        }

        this.showNotification('Login failed: ' + errorMessage, 'error');
    }

    showNotification(message, type = 'info') {
        // Use the global notification function if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback to console if notification system not available
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Demo/Guest login functionality
class GuestLogin {
    static async loginAsDemo() {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username: 'demo', 
                    password: 'demo123' 
                }),
                credentials: 'include'
            });

            if (response.ok) {
                showNotification('Logged in as demo user!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error('Demo login failed');
            }
        } catch (error) {
            showNotification('Demo login failed: ' + error.message, 'error');
        }
    }

    static setupDemoButton() {
        const demoBtn = document.getElementById('demo-login-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                GuestLogin.loginAsDemo();
            });
        }
    }
}

// Initialize login functionality
function setupLoginModal() {
    const loginModal = new LoginModal();
    loginModal.initialize();
    
    // Setup demo login if available
    GuestLogin.setupDemoButton();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LoginModal,
        GuestLogin,
        setupLoginModal
    };
}