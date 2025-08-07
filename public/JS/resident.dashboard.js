
function showSnackbar(message, type = 'success') {
    const snackbar = document.createElement('div');
    snackbar.classList.add('snackbar');
    snackbar.classList.add(type);
    snackbar.textContent = message;
  
    document.body.appendChild(snackbar);
  
    setTimeout(() => {
      snackbar.classList.add('show');
    }, 100);
  
    setTimeout(() => {
      snackbar.classList.remove('show');
      document.body.removeChild(snackbar);
    }, 3000);
  }

document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const reportButton = document.getElementById('reportButton');
    const reportOverlay = document.getElementById('reportOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const reportForm = document.getElementById('reportForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const backToForm = document.getElementById('backToForm');
    const confirmReport = document.getElementById('confirmReport');

    // Weight slider functionality
    const weightSlider = document.getElementById('weightSlider');
    const weightInput = document.getElementById('weight');
    const weightDisplay = document.querySelector('.weight-display');

    if (weightSlider && weightInput && weightDisplay) {
        weightSlider.addEventListener('input', function() {
            const value = this.value;
            weightInput.value = value;
            weightDisplay.textContent = `${value} kg`;
        });

        weightInput.addEventListener('input', function() {
            const value = this.value;
            weightSlider.value = value;
            weightDisplay.textContent = `${value} kg`;
        });
    }

    // Toggle overlay
    reportButton.addEventListener('click', () => {
        reportOverlay.style.display = 'flex';
        step1.style.display = 'block';
        step2.style.display = 'none';
    });

    closeOverlay.addEventListener('click', () => {
        reportOverlay.style.display = 'none';
        resetForm();
    });

    // Close overlay when clicking outside content
    reportOverlay.addEventListener('click', (e) => {
        if (e.target === reportOverlay) {
            reportOverlay.style.display = 'none';
            resetForm();
        }
    });

    // Back to form button
    if (backToForm) {
        backToForm.addEventListener('click', () => {
            step1.style.display = 'block';
            step2.style.display = 'none';
        });
    }

    // Confirm report button
    if (confirmReport) {
        confirmReport.addEventListener('click', async () => {
            try {
                await submitFinalReport();
            } catch (error) {
                console.error('Error submitting final report:', error);
                showSnackbar('Error submitting report. Please try again.', 'error');
            }
        });
    }

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
                    showSnackbar('Could not get your location. Please enable location services or enter coordinates manually.', 'error');
                    getLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get My Location';
                    getLocationBtn.disabled = false;
                }
            );
        } else {
            showSnackbar('Geolocation is not supported by your browser.', 'error');
            getLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Get My Location';
            getLocationBtn.disabled = false;
        }
    });

    // Drag and drop file upload
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('images');
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

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, unhighlight, false);
    });

    dropzone.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropzone.classList.add('active');
    }

    function unhighlight() {
        dropzone.classList.remove('active');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        previewContainer.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
            const reader = new FileReader();
                reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';

                const img = document.createElement('img');
                img.src = e.target.result;
                    img.alt = file.name;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = function() {
                    previewItem.remove();
                        // Remove from file input
                        const dt = new DataTransfer();
                        const remainingFiles = Array.from(fileInput.files).filter((_, i) => i !== index);
                        remainingFiles.forEach(file => dt.items.add(file));
                        fileInput.files = dt.files;
                    };

                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewContainer.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
            }
        });
    }

    // Form submission with ML analysis
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

        if (!validateForm()) {
        return;
    }

        try {
            showLoadingOverlay();
            await performMLAnalysis();
        } catch (error) {
            console.error('Error during ML analysis:', error);
            hideLoadingOverlay();
            showSnackbar('Error analyzing waste. Please try again.', 'error');
        }
    });

    function validateForm() {
        const wasteType = document.getElementById('wasteType').value;
        const weight = document.getElementById('weight').value;
        const zone = document.getElementById('zone').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const files = fileInput.files;

        if (!wasteType) {
            showSnackbar('Please select a waste type.', 'error');
            return false;
        }

        if (!weight || weight < 1) {
            showSnackbar('Please enter a valid weight.', 'error');
            return false;
        }

        if (!zone) {
            showSnackbar('Please select a zone.', 'error');
            return false;
        }

        if (!latitude || !longitude) {
            showSnackbar('Please get your location.', 'error');
            return false;
        }

        if (!files || files.length === 0) {
            showSnackbar('Please upload at least one image.', 'error');
            return false;
        }

        return true;
    }

    async function performMLAnalysis() {
        const formData = new FormData(reportForm);
        
        // Add user ID if available
        const userId = getCookie('userId') || 'unknown';
        formData.append('user_id', userId);

        try {
            // First, send to ML API for analysis
            const mlResponse = await fetch('http://localhost:3000/detect', {
                method: 'POST',
                body: formData
            });

            if (!mlResponse.ok) {
                throw new Error('ML API request failed');
            }

            const mlResult = await mlResponse.json();
            hideLoadingOverlay();
            
            if (mlResult.success) {
                displayMLResults(mlResult);
                step1.style.display = 'none';
                step2.style.display = 'block';
            } else {
                showSnackbar('Could not analyze waste. Please try again.', 'error');
            }
        } catch (error) {
            console.error('ML Analysis Error:', error);
            hideLoadingOverlay();
            showSnackbar('Error connecting to AI service. Please try again.', 'error');
        }
    }

    function displayMLResults(mlResult) {
        // Display user vs AI prediction
        const userPrediction = document.getElementById('userPrediction');
        const aiPrediction = document.getElementById('aiPrediction');
        const confidenceScore = document.getElementById('confidenceScore');
        
        const userType = document.getElementById('wasteType').value;
        const aiType = mlResult.detected_waste[0] || 'Unknown';
        
        userPrediction.textContent = userType;
        aiPrediction.textContent = aiType;
        confidenceScore.textContent = Math.round(mlResult.confidence || 0);

        // Display waste details
        const recyclabilityStatus = document.getElementById('recyclabilityStatus');
        const energyPotential = document.getElementById('energyPotential');
        const co2Reduction = document.getElementById('co2Reduction');
        const processingMethod = document.getElementById('processingMethod');

        if (mlResult.waste_details) {
            recyclabilityStatus.textContent = mlResult.waste_details.category;
            recyclabilityStatus.className = `detail-value ${mlResult.waste_details.category === 'Recyclable' ? 'success' : 'warning'}`;
            
            energyPotential.textContent = `${mlResult.energy_potential || 0} kWh`;
            co2Reduction.textContent = `${mlResult.co2_reduction || 0} kg`;
            processingMethod.textContent = mlResult.waste_details.processing_method || 'Unknown';
        }

        // Display vendor matches
        const vendorList = document.getElementById('vendorList');
        if (mlResult.vendor_matches && mlResult.vendor_matches.length > 0) {
            vendorList.innerHTML = mlResult.vendor_matches.map(vendor => `
                <div class="vendor-item">
                    <strong>${vendor.name}</strong> - ${vendor.processing_method}
                    <br><small>Rating: ${vendor.rating}/5 | Capacity: ${vendor.capacity}kg</small>
                </div>
            `).join('');
        } else {
            vendorList.innerHTML = '<p>No suitable vendors found for this waste type.</p>';
        }

        // Display fraud detection status
        const fraudStatus = document.getElementById('fraudStatus');
        if (mlResult.fraud_detection && mlResult.fraud_detection.is_suspicious) {
            fraudStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Report Flagged for Review';
            fraudStatus.className = 'fraud-status warning';
        } else {
            fraudStatus.innerHTML = '<i class="fas fa-check-circle"></i> Report Verified';
            fraudStatus.className = 'fraud-status success';
        }
    }

    async function submitFinalReport() {
        try {
            const formData = new FormData(reportForm);
            
            const response = await fetch('/api/v1/residents/report-waste', {
            method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${getCookie('accessToken')}`
                }
            });

            const result = await response.json();

            if (result.success) {
                showSnackbar('Waste report submitted successfully!', 'success');
                reportOverlay.style.display = 'none';
                resetForm();
                await fetchDashboardData(); // Refresh dashboard
            } else {
                showSnackbar(result.message || 'Error submitting report.', 'error');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            showSnackbar('Error submitting report. Please try again.', 'error');
        }
    }

    function showLoadingOverlay() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
    }

    function resetForm() {
        reportForm.reset();
        previewContainer.innerHTML = '';
        weightDisplay.textContent = '5 kg';
        weightSlider.value = 5;
        weightInput.value = 5;
        latitudeInput.value = '';
        longitudeInput.value = '';
    }

    // Initialize dashboard
        fetchDashboardData();
});

// Dashboard data fetching
    async function fetchDashboardData() {
        try {
        const response = await fetch('/api/v1/residents/dashboard', {
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            }
            });

            if (!response.ok) {
                if (response.status === 401) {
                showLoginPage();
                    return;
                }
            throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
        if (data.success) {
            updateDashboard(data.data);
        }
        } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showSnackbar('Error loading dashboard data.', 'error');
    }
}

function updateDashboard(data) {
    // Update stats
    document.getElementById('totalRewards').textContent = data.totalRewards || 0;
    document.getElementById('totalReports').textContent = data.totalReports || 0;
    document.getElementById('pendingReports').textContent = data.pendingReports || 0;
    document.getElementById('energyGenerated').textContent = data.energyGenerated || 0;
    document.getElementById('co2Reduced').textContent = data.co2Reduced || 0;

    // Update reports list
  const reportsList = document.getElementById('reportsList');
    if (data.reports && data.reports.length > 0) {
        reportsList.innerHTML = data.reports.map(report => `
            <div class="report-card" onclick="showWasteDetails('${report._id}')">
                <img src="${report.photoUrl[0]}" alt="Waste" class="report-image">
      <div class="report-details">
        <div class="report-header">
          <span class="report-type">${report.userReportedType}</span>
                        <span class="report-status status-${report.status}">${report.status}</span>
        </div>
        <div class="report-meta">
                        <span><i class="fas fa-weight-hanging"></i> ${report.approximateWeight} kg</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${report.assignedZone}</span>
                    </div>
                    <div class="report-date">
                        ${new Date(report.createdAt).toLocaleDateString()}
                    </div>
        </div>
      </div>
        `).join('');
    } else {
        reportsList.innerHTML = '<p>No reports yet. Start by reporting your first waste!</p>';
    }
}

async function showWasteDetails(garbageId) {
  try {
        const response = await fetch(`/api/v1/residents/waste-details/${garbageId}`, {
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch waste details');
    }

        const data = await response.json();
        if (data.success) {
            displayWasteDetails(data.data);
            document.getElementById('wasteDetailsOverlay').style.display = 'flex';
        }
  } catch (error) {
    console.error('Error fetching waste details:', error);
        showSnackbar('Error loading waste details.', 'error');
  }
}

function displayWasteDetails(waste) {
  // Set main image
  const mainImage = document.getElementById('mainWasteImage');
  if (waste.photoUrl && waste.photoUrl.length > 0) {
    mainImage.style.backgroundImage = `url(${waste.photoUrl[0]})`;
  }

  // Set thumbnails
    const thumbnails = document.getElementById('wasteThumbnails');
  if (waste.photoUrl && waste.photoUrl.length > 1) {
        thumbnails.innerHTML = waste.photoUrl.map((url, index) => `
            <img src="${url}" alt="Waste" class="thumbnail-img ${index === 0 ? 'active' : ''}" 
                 onclick="switchMainImage('${url}', this)">
        `).join('');
    } else {
        thumbnails.innerHTML = '';
  }

  // Set waste info
    document.getElementById('wasteTypeDetail').textContent = waste.userReportedType;
    document.getElementById('wasteStatus').textContent = waste.status;
    document.getElementById('reportedBy').textContent = waste.reportedBy?.fullName || 'Unknown';
    document.getElementById('reportedPhone').textContent = waste.reportedBy?.phone || 'N/A';
    document.getElementById('reportedDate').textContent = new Date(waste.createdAt).toLocaleString();
    document.getElementById('wasteCoordinates').textContent = 
        `${waste.coordinates.coordinates[1]}, ${waste.coordinates.coordinates[0]}`;

    // Set ML analysis details if available
    if (waste.mlDetails) {
        document.getElementById('aiConfidence').textContent = 
            waste.mlDetails.confidence ? `${Math.round(waste.mlDetails.confidence)}%` : 'N/A';
        document.getElementById('wasteEnergyPotential').textContent = 
            waste.mlDetails.energyPotential ? `${waste.mlDetails.energyPotential} kWh` : 'N/A';
        document.getElementById('wasteCo2Reduction').textContent = 
            waste.mlDetails.co2Reduction ? `${waste.mlDetails.co2Reduction} kg` : 'N/A';
    }
}

function switchMainImage(url, element) {
    document.getElementById('mainWasteImage').style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    element.classList.add('active');
}

async function logoutUser() {
    try {
        const response = await fetch('/api/v1/residents/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            }
        });

        if (response.ok) {
            clearAuthCookies();
        showLoginPage();
        }
    } catch (error) {
        console.error('Logout error:', error);
        clearAuthCookies();
        showLoginPage();
    }
}

async function showLoginPage() {
    window.location.href = '/resident/login';
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function clearAuthCookies() {
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Image enlargement functionality
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('main-waste-image') || e.target.classList.contains('thumbnail-img')) {
        const enlargedImage = document.getElementById('enlargedImage');
        enlargedImage.src = e.target.src || e.target.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
        document.getElementById('imageEnlargementOverlay').style.display = 'flex';
    }
});

document.querySelector('.close-enlarged').addEventListener('click', function() {
    document.getElementById('imageEnlargementOverlay').style.display = 'none';
});

// Close overlays when clicking outside
document.addEventListener('click', function(e) {
    const wasteDetailsOverlay = document.getElementById('wasteDetailsOverlay');
    const imageEnlargementOverlay = document.getElementById('imageEnlargementOverlay');
    
    if (e.target === wasteDetailsOverlay) {
        wasteDetailsOverlay.style.display = 'none';
    }
    
    if (e.target === imageEnlargementOverlay) {
        imageEnlargementOverlay.style.display = 'none';
    }
});

// Close buttons for overlays
document.querySelectorAll('.close-overlay').forEach(button => {
    button.addEventListener('click', function() {
        this.closest('.overlay').style.display = 'none';
    });
});



