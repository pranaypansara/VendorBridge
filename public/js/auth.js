document.addEventListener('DOMContentLoaded', () => {
  // Password Visibility Toggle
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eye-icon');

  if (toggleBtn && passwordInput && eyeIcon) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      
      // Update eye icon SVG path based on state
      if (isPassword) {
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      }
    });
  }

  // Handle Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      const persistInput = document.getElementById('persist');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'AUTHENTICATING...';

      const data = {
        username: emailInput.value,
        password: passwordInput.value,
        persist: persistInput ? persistInput.checked : false
      };

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showAlert('success', 'Authentication successful! Redirecting to environment...');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1500);
        } else {
          showAlert('error', result.message || 'Login failed. Please check your credentials.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      } catch (error) {
        console.error('Login Error:', error);
        showAlert('error', 'Unable to connect to the authentication server.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  // Handle Registration Form Submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('first_name').value;
      const lastName = document.getElementById('last_name').value;
      const email = document.getElementById('email').value;
      const phone = document.getElementById('phone').value;
      const role = document.getElementById('role').value;
      const country = document.getElementById('country').value;
      const password = document.getElementById('password').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'CREATING ACCOUNT...';

      const data = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        role: role,
        country: country,
        password: password
      };

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showAlert('success', 'Registration successful! Directing to workspace...');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1500);
        } else {
          showAlert('error', result.message || 'Registration failed. Check inputs or database connection.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      } catch (error) {
        console.error('Registration Error:', error);
        showAlert('error', 'Connection to registration server timed out.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
});

// Helper to render alert notifications
function showAlert(type, message) {
  const container = document.getElementById('alert-container');
  if (!container) return;

  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${icon}</span>
      <div>${message}</div>
    </div>
  `;
}
