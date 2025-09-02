// Utility function for Snackbar notifications
function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        const newSnackbar = document.createElement('div');
        newSnackbar.id = 'snackbar';
        document.body.appendChild(newSnackbar);
        const style = document.createElement('style');
        style.textContent = `
            #snackbar {
                visibility: hidden;
                min-width: 250px;
                background-color: #333;
                color: #fff;
                text-align: center;
                border-radius: 4px;
                padding: 16px;
                position: fixed;
                z-index: 1000;
                right: 30px;
                bottom: 30px;
                font-size: 14px;
                transition: all 0.5s ease-in-out;
                opacity: 0;
            }
            #snackbar.show {
                visibility: visible;
                opacity: 1;
                bottom: 50px;
            }
            #snackbar.success { background-color: #4CAF50; }
            #snackbar.error { background-color: #f44336; }
            #snackbar.info { background-color: #2196F3; }
        `;
        document.head.appendChild(style);
        return showSnackbar(message, type);
    }

    snackbar.className = `show ${type}`;
    snackbar.textContent = message;

    setTimeout(() => {
        snackbar.className = snackbar.className.replace('show', '');
    }, type === 'error' ? 5000 : 3000);
}

// Chart instances
let wasteTypeChart, reportsTimelineChart, zoneDistributionChart, statusDistributionChart;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize charts with empty data
    initializeCharts();

    // Fetch user data
    fetchCurrentUser();

    // Rest of your existing DOMContentLoaded code...
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
        weightSlider.addEventListener('input', function () {
            const value = parseFloat(this.value);
            weightInput.value = value;
            weightDisplay.textContent = `${value} kg`;
        });

        weightInput.addEventListener('input', function () {
            const value = parseFloat(this.value);
            weightSlider.value = value;
            weightDisplay.textContent = `${value} kg`;
        });
    }

    // Toggle report overlay
    reportButton.addEventListener('click', () => {
        reportOverlay.style.display = 'flex';
        step1.style.display = 'block';
        step2.style.display = 'none';
        resetForm();
    });

    closeOverlay.addEventListener('click', () => {
        reportOverlay.style.display = 'none';
        resetForm();
    });

    reportOverlay.addEventListener('click', (e) => {
        if (e.target === reportOverlay) {
            reportOverlay.style.display = 'none';
            resetForm();
        }
    });

    if (backToForm) {
        backToForm.addEventListener('click', () => {
            step1.style.display = 'block';
            step2.style.display = 'none';
        });
    }

    // Confirm report button now just closes the overlay and refreshes dashboard
    if (confirmReport) {
        confirmReport.addEventListener('click', async () => {
            showSnackbar('Waste report confirmed!', 'success');
            reportOverlay.style.display = 'none';
            resetForm();
            await fetchDashboardData(); // Refresh dashboard
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
                    showSnackbar('Location found!', 'success');
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

    browseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

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
                reader.onload = function (e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = function () {
                        previewItem.remove();
                        const dt = new DataTransfer();
                        const remainingFiles = Array.from(fileInput.files).filter((f, i) => i !== index);
                        remainingFiles.forEach(file => dt.items.add(file));
                        fileInput.files = dt.files;
                    };

                    previewItem.appendChild(img);
                    previewItem.appendChild(removeBtn);
                    previewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            } else {
                showSnackbar(`File ${file.name} is not an image.`, 'error');
            }
        });
    }

    // Form submission: Directly send to Node.js backend
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        showLoadingOverlay();
        try {
            const formData = new FormData(reportForm);

            // The backend will handle calling the ML service
            const response = await fetch('http://localhost:5000/api/v1/residents/report-waste', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${getCookie('accessToken')}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                return next( new ApiError(`Backend API request failed with status ${response.status}: ${errorText}`));


            }

            const result = await response.json();
            hideLoadingOverlay();

            if (result.success) {
                // Display ML results from the backend's response
                displayMLResults(result.data.mlAnalysis); // Use mlAnalysis from backend response
                step1.style.display = 'none';
                step2.style.display = 'block';
            } else {
                showSnackbar(result.message || 'Error submitting report.', 'error');
            }
        } catch (error) {
            console.error('Report submission error:', error);
            hideLoadingOverlay();
            showSnackbar(`Error submitting report: ${error.message}. Please try again.`, 'error');
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

        if (!weight || parseFloat(weight) <= 0) {
            showSnackbar('Please enter a valid weight (must be greater than 0).', 'error');
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

    // Function to display ML results on Step 2 (updated to use backend's mlAnalysis structure)
    function displayMLResults(mlAnalysis) {
        const userPrediction = document.getElementById('userPrediction');
        const aiPrediction = document.getElementById('aiPrediction');
        const confidenceScore = document.getElementById('confidenceScore');
        const mlAnalysisStatus = document.getElementById('mlAnalysisStatus');

        const userType = document.getElementById('wasteType').value;
        const aiType = mlAnalysis.detection_results.detected_waste[0] || 'Unknown';

        userPrediction.textContent = userType;
        aiPrediction.textContent = aiType;
        confidenceScore.textContent = Math.round(mlAnalysis.detection_results.highest_confidence || 0);

        if (userType == aiType) {
            mlAnalysisStatus.innerHTML = '<i class="fas fa-check-circle"></i> Waste Successfully Identified & Matched';
            mlAnalysisStatus.className = 'analysis-status success';
        } else if (mlAnalysis.detection_results.detected_waste.length > 0 && userType != aiType) {
            mlAnalysisStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> AI Identified, but type mismatch. Admin review needed.';
            mlAnalysisStatus.className = 'analysis-status warning';
        } else {
            mlAnalysisStatus.innerHTML = '<i class="fas fa-times-circle"></i> AI could not identify waste. Admin review needed.';
            mlAnalysisStatus.className = 'analysis-status error';
        }

        const recyclabilityStatus = document.getElementById('recyclabilityStatus');
        const energyPotential = document.getElementById('energyPotential');
        const co2Reduction = document.getElementById('co2Reduction');
        const processingMethod = document.getElementById('processingMethod');

        if (mlAnalysis.waste_analysis.waste_details) {
            const wasteDetails = mlAnalysis.waste_analysis.waste_details;
            recyclabilityStatus.textContent = wasteDetails.category;
            recyclabilityStatus.className = `detail-value ${wasteDetails.recyclable ? 'success' : 'warning'}`;

            energyPotential.textContent = `${wasteDetails.energy_potential.toFixed(2)} kWh`;
            co2Reduction.textContent = `${wasteDetails.co2_reduction.toFixed(2)} kg`;
            processingMethod.textContent = wasteDetails.processing_method || 'Unknown';
        } else {
            recyclabilityStatus.textContent = 'N/A';
            energyPotential.textContent = 'N/A';
            co2Reduction.textContent = 'N/A';
            processingMethod.textContent = 'N/A';
        }

        const vendorList = document.getElementById('vendorList');
        if (mlAnalysis.vendor_matching && mlAnalysis.vendor_matching.matched_vendors.length > 0) {
            vendorList.innerHTML = mlAnalysis.vendor_matching.matched_vendors.map(vendor => `
                <div class="vendor-item">
                    <strong>${vendor.name}</strong> - ${vendor.processing_method}
                    <br><small>Rating: ${vendor.rating}/5 | Distance: ${vendor.distance_km} km</small>
                </div>
            `).join('');
        } else {
            vendorList.innerHTML = '<p>No suitable vendors found for this waste type yet.</p>';
        }

        const fraudStatus = document.getElementById('fraudStatus');
        if (mlAnalysis.fraud_detection && mlAnalysis.fraud_detection.is_suspicious) {
            fraudStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Report Flagged for Review (Score: ${mlAnalysis.fraud_detection.suspicion_score.toFixed(3)})`;
            fraudStatus.className = 'fraud-status warning';
        } else {
            fraudStatus.innerHTML = '<i class="fas fa-check-circle"></i> Report Verified';
            fraudStatus.className = 'fraud-status success';
        }
    }

    function showLoadingOverlay(message = 'Loading...') {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.querySelector('h3').textContent = message;
    }

    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
    }

    function resetForm() {
        reportForm.reset();
        previewContainer.innerHTML = '';
        weightDisplay.textContent = '0.5 kg';
        weightSlider.value = 0.5;
        weightInput.value = 0.5;
        latitudeInput.value = '';
        longitudeInput.value = '';
        fileInput.value = '';
        document.getElementById('userPrediction').textContent = '-';
        document.getElementById('aiPrediction').textContent = '-';
        document.getElementById('confidenceScore').textContent = '-';
        document.getElementById('recyclabilityStatus').textContent = '-';
        document.getElementById('energyPotential').textContent = '-';
        document.getElementById('co2Reduction').textContent = '-';
        document.getElementById('processingMethod').textContent = '-';
        document.getElementById('vendorList').innerHTML = '<!-- Vendors will be populated here -->';
        document.getElementById('fraudStatus').innerHTML = '<!-- Dynamic fraud status -->';
        document.getElementById('mlAnalysisStatus').innerHTML = '<!-- Dynamic status message -->';
    }

    fetchDashboardData();
});

// Initialize charts with empty data
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            tooltip: {
                enabled: true,
            }
        }
    };

    // Waste Type Distribution Chart (Pie)
    const wasteTypeCtx = document.getElementById('wasteTypeChart').getContext('2d');
    wasteTypeChart = new Chart(wasteTypeCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#2E7D32',
                    '#1565C0',
                    '#7B1FA2',
                    '#D32F2F',
                    '#FF8F00',
                    '#00897B',
                    '#5D4037',
                    '#455A64',
                    '#E65100'
                ],
                borderWidth: 1
            }]
        },
        options: chartOptions
    });

    // Reports Timeline Chart (Line)
    const reportsTimelineCtx = document.getElementById('reportsTimelineChart').getContext('2d');
    reportsTimelineChart = new Chart(reportsTimelineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Reports',
                data: [],
                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                borderColor: '#2E7D32',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Zone Distribution Chart (Doughnut)
    const zoneDistributionCtx = document.getElementById('zoneDistributionChart').getContext('2d');
    zoneDistributionChart = new Chart(zoneDistributionCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#2E7D32',
                    '#1565C0',
                    '#7B1FA2',
                    '#D32F2F'
                ],
                borderWidth: 1
            }]
        },
        options: chartOptions
    });

    // Status Distribution Chart (Bar)
    const statusDistributionCtx = document.getElementById('statusDistributionChart').getContext('2d');
    statusDistributionChart = new Chart(statusDistributionCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Reports by Status',
                data: [],
                backgroundColor: [
                    '#FFC107',
                    '#2E7D32',
                    '#1565C0',
                    '#00ACC1'
                ],
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update charts with data from dashboard
function updateCharts(data) {
    // Waste Type Distribution
    if (data.reportTypes) {
        const wasteTypes = Object.keys(data.reportTypes);
        const wasteCounts = Object.values(data.reportTypes);

        wasteTypeChart.data.labels = wasteTypes;
        wasteTypeChart.data.datasets[0].data = wasteCounts;
        wasteTypeChart.update();
    }

    // Reports Timeline
    if (data.reportDays) {
        const days = Object.keys(data.reportDays);
        const dayCounts = Object.values(data.reportDays);

        reportsTimelineChart.data.labels = days;
        reportsTimelineChart.data.datasets[0].data = dayCounts;
        reportsTimelineChart.update();
    }

    // Zone Distribution
    if (data.reportZones) {
        const zones = Object.keys(data.reportZones);
        const zoneCounts = Object.values(data.reportZones);

        zoneDistributionChart.data.labels = zones;
        zoneDistributionChart.data.datasets[0].data = zoneCounts;
        zoneDistributionChart.update();
    }

    // Status Distribution
    if (data.reportStatuses) {
        const statuses = Object.keys(data.reportStatuses).map(s =>
            s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        );
        const statusCounts = Object.values(data.reportStatuses);

        statusDistributionChart.data.labels = statuses;
        statusDistributionChart.data.datasets[0].data = statusCounts;
        statusDistributionChart.update();
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/residents/current_user', {
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return next( new ApiError('Failed to fetch user data'));


        }

        const data = await response.json();
        if (data.success) {
            updateUserInfo(data.data);
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');

    if (userName) userName.textContent = user.fullName || 'User';
    if (userEmail) userEmail.textContent = user.email || '';

    if (user.avatar) {
        userAvatar.innerHTML = '';
        userAvatar.style.backgroundImage = `url('${user.avatar}')`;
        userAvatar.style.backgroundSize = 'cover';
    } else {
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

async function fetchDashboardData() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/residents/dashboard', {
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showSnackbar('Session expired or unauthorized. Please login.', 'error');
                showLoginPage();
                return;
            }
            return next( new ApiError('Failed to fetch dashboard data'));


        }

        const data = await response.json();
        if (data.success) {
            updateDashboard(data.data);
            updateCharts(data.data);
        } else {
            showSnackbar(data.message || 'Error fetching dashboard data.', 'error');
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showSnackbar('Error loading dashboard data. Please check console for details.', 'error');
    }
}

function updateDashboard(data) {
    document.getElementById('totalRewards').textContent = data.totalRewards || 0;
    document.getElementById('totalReports').textContent = data.totalReports || 0;
    document.getElementById('pendingReports').textContent = data.pendingReports || 0;
    document.getElementById('energyGenerated').textContent = data.energyGenerated || 0;
    document.getElementById('co2Reduced').textContent = data.co2Reduced || 0;

    const reportsList = document.getElementById('reportsList');
    if (data.reports && data.reports.length > 0) {
        reportsList.innerHTML = data.reports.map(report => `
            <div class="report-card" onclick="showWasteDetails('${report._id}')">
                <img src="${report.photoUrl[0]}" alt="Waste" class="report-image" onerror="this.onerror=null;this.src='https://placehold.co/100x100/cccccc/000000?text=No+Image';">
                <div class="report-details">
                    <div class="report-header">
                        <span class="report-type">${report.userReportedType}</span>
                        <span class="report-status status-${report.status}">${report.status.replace('_', ' ')}</span>
                        
                    </div>
                    
                    <div class="report-meta">
                        <span><i class="fas fa-weight-hanging"></i> ${report.approximateWeight} kg</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${report.assignedZone}</span>
                        ${report.assignedBin ? `<span><i class="fas fa-dumpster"></i> Bin: ${report.assignedBin.binId}</span>` : ''}
                    </div>
                    <div class="report-date">
                        ${new Date(report.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                     <button class="delete-report-btn" onclick="deleteReport('${report._id}', event)">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        reportsList.innerHTML = '<p>No reports yet. Start by reporting your first waste!</p>';
    }
}

async function deleteReport(reportId, event) {
    event.stopPropagation(); // Prevent triggering the card click
    
    if (!confirm('Are you sure you want to delete this report?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/v1/residents/delete-report/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return next( new ApiError('Failed to delete report'));


        }

        const result = await response.json();
        if (result.success) {
            showSnackbar('Report deleted successfully', 'success');
            await fetchDashboardData(); // Refresh the dashboard
        } else {
            showSnackbar(result.message || 'Error deleting report', 'error');
        }
    } catch (error) {
        console.error('Delete report error:', error);
        showSnackbar(`Error deleting report: ${error.message}`, 'error');
    }
}

async function showWasteDetails(wasteId) {
    try {
        const response = await fetch(`http://localhost:5000/api/v1/residents/waste-details/${wasteId}`, {
            headers: {
                'Authorization': `Bearer ${getCookie('accessToken')}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return next( new ApiError('Failed to fetch waste details'));


        }

        const data = await response.json();
        if (data.success) {
            displayWasteDetails(data.data);
            document.getElementById('wasteDetailsOverlay').style.display = 'flex';
        } else {
            showSnackbar(data.message || 'Error loading waste details.', 'error');
        }
    } catch (error) {
        console.error('Error fetching waste details:', error);
        showSnackbar(`Error loading waste details: ${error.message}`, 'error');
    }
}

function displayWasteDetails(waste) {
    // Image Handling
    const mainImageDiv = document.getElementById('mainWasteImage');
    const thumbnailsDiv = document.getElementById('wasteThumbnails');
    const photoUrls = waste.photoUrl || [];

    if (mainImageDiv && thumbnailsDiv) {
        if (photoUrls.length > 0) {
            mainImageDiv.style.backgroundImage = `url('${photoUrls[0]}')`;
            thumbnailsDiv.innerHTML = photoUrls.map((url, index) => `
                <img src="${url}" class="thumbnail-img ${index === 0 ? 'active' : ''}" 
                     onclick="switchMainImage('${url}', this)" 
                     onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/000000?text=No+Image';">
            `).join('');
        } else {
            mainImageDiv.style.backgroundImage = `url('https://placehold.co/200x200/cccccc/000000?text=No+Image')`;
            thumbnailsDiv.innerHTML = '';
        }
    }

    // Helper to safely set text
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // Basic Details
    setText('wasteTypeDetail', waste.userReportedType || 'N/A');

    const statusBadge = document.getElementById('wasteStatus');
    if (statusBadge) {
        statusBadge.textContent = waste.status ? waste.status.replace('_', ' ') : 'unknown';
        statusBadge.className = `detail-value status-${waste.status || 'unknown'}`;
    }

    setText('reportedDate', waste.createdAt ? new Date(waste.createdAt).toLocaleString() : 'N/A');

    // Coordinates
    const coords = waste.coordinates?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
        setText('wasteCoordinates', `${coords[1]?.toFixed(6)}, ${coords[0]?.toFixed(6)}`);
    } else {
        setText('wasteCoordinates', 'N/A');
    }

    // ML Details
    const mlDetails = waste.mlDetails || {};
    setText('aiConfidence', mlDetails.confidence ? `${Math.round(mlDetails.confidence)}%` : 'N/A');
    setText('wasteEnergyPotential', mlDetails.energyPotential ? `${mlDetails.energyPotential.toFixed(2)} kWh` : 'N/A');
    setText('wasteCo2Reduction', mlDetails.co2Reduction ? `${mlDetails.co2Reduction.toFixed(2)} kg` : 'N/A');

    const fraud = mlDetails.fraudDetection;
    setText('wasteFraudulent', fraud?.is_suspicious ? `Yes (Score: ${fraud.suspicion_score.toFixed(3)})` : 'No');
    setText('wasteFraudScore', fraud?.suspicion_score ? fraud.suspicion_score.toFixed(3) : 'N/A');
}

function switchMainImage(url, element) {
    document.getElementById('mainWasteImage').style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    element.classList.add('active');
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

function showLoginPage() {
    window.location.href = '/resident/login';
}

function logoutUser() {
    fetch('http://localhost:5000/api/v1/residents/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${getCookie('accessToken')}`
        }
    })
        .then(() => {
            clearAuthCookies();
            window.location.href = '/resident/login';
        }).catch(err => {
            console.error('Logout failed:', err);
            window.location.href = '/resident/login';
        });
}

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('main-waste-image') || e.target.classList.contains('thumbnail-img') || e.target.classList.contains('report-image')) {
        const enlargedImage = document.getElementById('enlargedImage');
        const imageUrl = e.target.src || (e.target.style.backgroundImage ? e.target.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1') : null);

        if (imageUrl) {
            enlargedImage.src = imageUrl;
            document.getElementById('imageEnlargementOverlay').style.display = 'flex';
        }
    }
});

document.querySelector('.close-enlarged').addEventListener('click', function () {
    document.getElementById('imageEnlargementOverlay').style.display = 'none';
});

document.addEventListener('click', function (e) {
    const wasteDetailsOverlay = document.getElementById('wasteDetailsOverlay');
    const imageEnlargementOverlay = document.getElementById('imageEnlargementOverlay');

    if (e.target === wasteDetailsOverlay) {
        wasteDetailsOverlay.style.display = 'none';
    }

    if (e.target === imageEnlargementOverlay) {
        imageEnlargementOverlay.style.display = 'none';
    }
});

document.querySelectorAll('.overlay .close-overlay').forEach(button => {
    button.addEventListener('click', function () {
        this.closest('.overlay').style.display = 'none';
    });
});