// API Configuration
const API_BASE = 'http://localhost:5000/api/v1';

// Snackbar implementation
function showSnackbar(message, type = 'success') {
    const snackbar = document.createElement('div');
    snackbar.classList.add('snackbar');
    snackbar.classList.add(type);  // Add success or error type classes
    snackbar.textContent = message;
  
    // Append the snackbar to the body
    document.body.appendChild(snackbar);
  
    // Show the snackbar and then remove it after some time
    setTimeout(() => {
      snackbar.classList.add('show');
    }, 100);
  
    setTimeout(() => {
      snackbar.classList.remove('show');
      document.body.removeChild(snackbar);
    }, 3000); // Remove after 3 seconds
  }


// Add some basic styling for the snackbar
const style = document.createElement('style');
style.textContent = `
.snackbar {
  visibility: hidden;
  min-width: 250px;
  margin-left: -125px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 2px;
  padding: 16px;
  position: fixed;
  z-index: 1;
  left: 50%;
  bottom: 30px;
  font-size: 14px;
  transition: all 0.5s;
  opacity: 0;
}

.snackbar.show {
  visibility: visible;
  opacity: 1;
  bottom: 50px;
}

.snackbar.success {
  background-color: #4CAF50;
}

.snackbar.error {
  background-color: #F44336;
}
`;
document.head.appendChild(style);


//get data of login form
// Handle the form submission
document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();  // Prevent the default form submission

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const user = await loginUser(email, password);
      console.log('Logged in user:', user);  // You can redirect or perform other actions here
    } catch (error) {
        showSnackbar(error, 'error');
      console.log('Login failed:', error);
    }
  });

// Auth Utility Functions
function setAuthCookies(accessToken, refreshToken) {
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${60 * 60}`; // 1 hour
  document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
}

function clearAuthCookies() {
  document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function isLoggedIn() {
  return !!getCookie('accessToken');
}

// API Functions
async function loginUser(email, password) {
    try {
      const response = await fetch(`${API_BASE}/residents/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
  
      const responseData = await response.json();
  
      if (response.ok) {
        // If response is OK (200-299), handle successful login
        setAuthCookies(responseData.data.accessToken, responseData.data.refreshToken);
        showSnackbar(responseData.message);
        return responseData.data.user;
      } else if (response.status === 401) {
        // Handle Unauthorized error (Invalid user credentials)
        const errorMessage = responseData.message || 'Invalid user credentials';
        showSnackbar(errorMessage, 'error');  // Display error message in snackbar
        throw new Error(errorMessage);  // Throw error to be caught
      } else {
        // Handle other errors (e.g., server errors)
        const errorMessage = responseData.message || 'Login failed. Please try again.';
        showSnackbar(errorMessage, 'error');
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      showSnackbar('An error occurred during login.', 'error');  // Show generic error
      throw error;
    }
  }
  
async function logoutUser() {
  clearAuthCookies();
  showSnackbar('Logged out successfully.');
}

async function submitWasteReport(reportData) {
  const accessToken = getCookie('accessToken');
  if (!accessToken) {
    showSnackbar('Please login to submit waste reports.', 'error');
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch(`${API_BASE}/residents/submit_waste_report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(reportData),
      credentials: 'include',
    });

    const responseData = await response.json();

    if (response.ok) {
      showSnackbar(responseData.message);
      return responseData.data;
    } else {
      const errorMessage = responseData.message || 'Failed to submit waste report.';
      showSnackbar(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error submitting waste report:', error);
    showSnackbar('Error submitting waste report.', 'error');
    throw error;
  }
}

async function getResidentDashboard() {
  const accessToken = getCookie('accessToken');
  if (!accessToken) {
    showSnackbar('Please login to view dashboard.', 'error');
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch(`${API_BASE}/residents/get_resident_dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    const responseData = await response.json();

    if (response.ok) {
      return responseData.data;
    } else {
      const errorMessage = responseData.message || 'Failed to fetch dashboard data.';
      showSnackbar(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    showSnackbar('Error fetching dashboard data.', 'error');
    throw error;
  }
}

// Example usage:
/*
// Login example
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const user = await loginUser(email, password);
    console.log('Logged in user:', user);
    // Redirect or update UI
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// Submit waste report example
async function handleSubmitWaste() {
  const reportData = {
    userReportedType: 'plastic',
    approximateWeight: 5,
    assignedZone: 'North District',
    coordinates: [79.3434, 23.42323]
  };
  
  try {
    const result = await submitWasteReport(reportData);
    console.log('Waste report submitted:', result);
    // Update UI
  } catch (error) {
    console.error('Submission failed:', error);
  }
}

// Get dashboard data example
async function loadDashboard() {
  try {
    const dashboardData = await getResidentDashboard();
    console.log('Dashboard data:', dashboardData);
    // Update UI with dashboard data
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}
*/