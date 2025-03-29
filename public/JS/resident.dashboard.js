
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


document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const reportButton = document.getElementById('reportButton');
    const reportOverlay = document.getElementById('reportOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const reportForm = document.getElementById('reportForm');

    // Toggle overlay
    reportButton.addEventListener('click', () => {
        reportOverlay.style.display = 'flex';
    });

    closeOverlay.addEventListener('click', () => {
        reportOverlay.style.display = 'none';
    });

    // Close overlay when clicking outside content
    reportOverlay.addEventListener('click', (e) => {
        if (e.target === reportOverlay) {
            reportOverlay.style.display = 'none';
        }
    });

    // Geolocation
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const getLocationBtn = document.getElementById('getLocation');

    getLocationBtn.addEventListener('click', () => {
        getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        getLocationBtn.disabled = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    latitudeInput.value = lat;
                    longitudeInput.value = lng;
                    getLocationBtn.innerHTML = '<i class="fas fa-check-circle"></i> Location Found';
                    setTimeout(() => {
                        getLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get My Location';
                        getLocationBtn.disabled = false;
                    }, 2000);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Could not get your location. Please enable location services or enter coordinates manually.');
                    getLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get My Location';
                    getLocationBtn.disabled = false;
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
            getLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get My Location';
            getLocationBtn.disabled = false;
        }
    });

    // Drag and drop file upload
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('images');
    console.log("fileInput", fileInput);
    const previewContainer = document.getElementById('previewContainer');
    const browseButton = dropzone.querySelector('.browse-button');

    // Click to select files
    browseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropzone.classList.add('active');
    }

    function unhighlight() {
        dropzone.classList.remove('active');
    }

    dropzone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        previewContainer.innerHTML = '';

        if (files.length > 5) {
            alert('Maximum 5 images allowed');
            return;
        }

        [...files].forEach(file => {
            if (!file.type.match('image.*')) {
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';

                const img = document.createElement('img');
                img.src = e.target.result;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', () => {
                    previewItem.remove();
                    // Remove file from input
                    const newFileList = Array.from(fileInput.files).filter(f => f !== file);
                    const dataTransfer = new DataTransfer();
                    newFileList.forEach(f => dataTransfer.items.add(f));
                    fileInput.files = dataTransfer.files;
                });

                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewContainer.appendChild(previewItem);
            };

            reader.readAsDataURL(file);
        });

        // Update file input
        const dataTransfer = new DataTransfer();
        [...files].forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
    }

    
   // Form submission - Modified for proper file upload
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate coordinates
    if (!latitudeInput.value || !longitudeInput.value) {
        alert('Please get your location first');
        return;
    }

    // Validate files
    if (fileInput.files.length === 0) {
        alert('Please upload at least one image');
        return;
    }

    const submitButton = reportForm.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        // Create FormData object
        const formData = new FormData();
        
        // Append all form data
        formData.append('userReportedType', document.getElementById('wasteType').value);
        formData.append('approximateWeight', document.getElementById('weight').value);
        formData.append('assignedZone', document.getElementById('zone').value);
        formData.append('longitude', longitudeInput.value);
        formData.append('latitude', latitudeInput.value);
        
        // Append each image file with the name 'images' (what your backend expects)
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('images', fileInput.files[i]);
        }

        // Debug: Log FormData contents
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        const response = await fetch('http://localhost:5000/api/v1/residents/submit_waste_report', {
            method: 'POST',
            body: formData,  // Send FormData directly
            credentials: 'include' // For cookies
            // Don't set Content-Type header - let the browser set it with boundary
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error:', errorData);
            
            if (response.status === 401) {
                window.location.href = '/resident/login';
                return;
            }
            
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Success:", data);

        // Handle successful submission
        alert('Waste report submitted successfully!');
        reportOverlay.style.display = 'none';
        reportForm.reset();
        previewContainer.innerHTML = '';
        fetchDashboardData();
        
    } catch (error) {
        console.error('Submission error:', error);
        alert(error.message || 'Failed to submit report. Please try again.');
        
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            alert('Network error. Please check your connection.');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Report';
    }
});

    // Fetch dashboard data - Modified for cookie-based auth
    async function fetchDashboardData() {
        try {
            const response = await fetch('http://localhost:5000/api/v1/residents/get_resident_dashboard', {
                credentials: 'include' // Send cookies with the request
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showSnackbar('Failed to load dashboard data', 'error');
                console.error('Dashboard fetch error:', errorData);
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                
                throw new Error(errorData.message || 'Failed to load dashboard data');
            }

            const data = await response.json();
            updateDashboard(data.data);
            showSnackbar('Dashboard loaded successfully!');
            
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            alert(error.message || 'Failed to load dashboard');
        }
    }

    // Add this near the top with your other DOM element selections
const wasteDetailsOverlay = document.getElementById('wasteDetailsOverlay');
const closeWasteOverlay = document.querySelector('.close-overlay');
const imageEnlargementOverlay = document.getElementById('imageEnlargementOverlay');
const closeEnlarged = document.querySelector('.close-enlarged');
const enlargedImage = document.getElementById('enlargedImage');

// Add this to your existing event listeners
closeWasteOverlay.addEventListener('click', () => {
  wasteDetailsOverlay.style.display = 'none';
});

closeEnlarged.addEventListener('click', () => {
  imageEnlargementOverlay.style.display = 'none';
});

// Close overlays when clicking outside content
wasteDetailsOverlay.addEventListener('click', (e) => {
  if (e.target === wasteDetailsOverlay) {
    wasteDetailsOverlay.style.display = 'none';
  }
});

imageEnlargementOverlay.addEventListener('click', (e) => {
  if (e.target === imageEnlargementOverlay) {
    imageEnlargementOverlay.style.display = 'none';
  }
});

// Modify your updateDashboard function to make report cards clickable
function updateDashboard(data) {
  document.getElementById('totalReports').textContent = data.totalReports;
  document.getElementById('totalRewards').textContent = data.totalRewards;
  document.getElementById('pendingReports').textContent = data.pendingReports;

  const reportsList = document.getElementById('reportsList');
  reportsList.innerHTML = '';

  data.recentReports.forEach(report => {
    const reportCard = document.createElement('div');
    reportCard.className = 'report-card';
    reportCard.dataset.id = report._id; // Store the ID for fetching details

    const reportDate = new Date(report.createdAt);
    const formattedDate = reportDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let statusClass = '';
    if (report.status.includes('pending')) statusClass = 'status-pending';
    else if (report.status.includes('approved')) statusClass = 'status-approved';
    else if (report.status.includes('assigned')) statusClass = 'status-assigned';
    else if (report.status.includes('useful')) statusClass = 'status-useful';

    reportCard.innerHTML = `
      <img src="${report.photoUrl[0]}" alt="Report photo" class="report-image">
      <div class="report-details">
        <div class="report-header">
          <span class="report-type">${report.userReportedType}</span>
          <span class="report-status ${statusClass}">${report.status.replace('_', ' ')}</span>
        </div>
        <div class="report-meta">
          <span>Weight: ${report.approximateWeight} kg</span>
          ${report.assignedZone ? `<span>Zone: ${report.assignedZone}</span>` : ''}
        </div>
        <div class="report-date">Reported on ${formattedDate}</div>
      </div>
    `;

    // Add click event to show waste details
    reportCard.addEventListener('click', () => {
      showWasteDetails(report._id);
    });

    reportsList.appendChild(reportCard);
  });
}

// Function to fetch and show waste details
async function showWasteDetails(garbageId) {
  try {
    const response = await fetch(`http://localhost:5000/api/v1/vendor/view_garbage_details/${garbageId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch waste details');
    }

    const { data } = await response.json();
    displayWasteDetails(data);
  } catch (error) {
    console.error('Error fetching waste details:', error);
    alert(error.message);
  }
}

// Function to display waste details in overlay
function displayWasteDetails(waste) {
  // Set main image
  const mainImage = document.getElementById('mainWasteImage');
  if (waste.photoUrl && waste.photoUrl.length > 0) {
    mainImage.style.backgroundImage = `url(${waste.photoUrl[0]})`;
    mainImage.onclick = () => {
      enlargedImage.src = waste.photoUrl[0];
      imageEnlargementOverlay.style.display = 'block';
    };
  }

  // Set thumbnails
  const thumbnailsContainer = document.getElementById('wasteThumbnails');
  thumbnailsContainer.innerHTML = '';
  
  if (waste.photoUrl && waste.photoUrl.length > 1) {
    waste.photoUrl.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.className = `thumbnail-img ${index === 0 ? 'active' : ''}`;
      img.onclick = () => {
        // Update main image
        mainImage.style.backgroundImage = `url(${url})`;
        // Update active thumbnail
        document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
        img.classList.add('active');
        // Update enlarged image click
        mainImage.onclick = () => {
          enlargedImage.src = url;
          imageEnlargementOverlay.style.display = 'block';
        };
      };
      thumbnailsContainer.appendChild(img);
    });
  }

  // Set waste info
  document.getElementById('wasteTypeDetail').textContent = waste.userReportedType || waste.mlIdentifiedType || 'Unknown';
  document.getElementById('wasteStatus').textContent = waste.status.replace('_', ' ');
  
  if (waste.reportedBy) {
    document.getElementById('reportedBy').textContent = waste.reportedBy.fullName || 'Unknown';
    document.getElementById('reportedPhone').textContent = waste.reportedBy.phoneNo || 'Not provided';
  } else {
    document.getElementById('reportedBy').textContent = 'Unknown';
    document.getElementById('reportedPhone').textContent = 'Not provided';
  }

  // Format date
  const reportedDate = new Date(waste.createdAt);
  document.getElementById('reportedDate').textContent = reportedDate.toLocaleString();

  // Format coordinates
  if (waste.coordinates && waste.coordinates.coordinates) {
    const [lng, lat] = waste.coordinates.coordinates;
    document.getElementById('wasteCoordinates').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } else {
    document.getElementById('wasteCoordinates').textContent = 'Not available';
  }

  // Show the overlay
  wasteDetailsOverlay.style.display = 'block';
}

    // Initial data fetch
    fetchDashboardData();
});




async function logoutUser() {
    try {
        await fetch(`http://localhost:5000/api/v1/residents/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        showLoginPage();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function showLoginPage() {
    window.location.href = '/resident/login'; // Redirect to login page
}


