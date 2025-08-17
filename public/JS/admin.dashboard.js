// Utility function for Snackbar notifications
function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        // Create snackbar element if it doesn't exist
        const newSnackbar = document.createElement('div');
        newSnackbar.id = 'snackbar';
        document.body.appendChild(newSnackbar);
        // Add basic styling for snackbar (can be moved to CSS)
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
        return showSnackbar(message, type); // Call itself once style is added
    }

    snackbar.className = `show ${type}`;
    snackbar.textContent = message;

    setTimeout(() => {
        snackbar.className = snackbar.className.replace('show', '');
    }, type === 'error' ? 5000 : 3000);
}

// Global variable to store the ID of the report currently being viewed
let currentReportId = null;
let currentCollectorId = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Load admin profile and dashboard stats initially
    await loadAdminProfile();
    await loadDashboardStats();
    
    // Setup navigation event listeners
    setupNavigation();
    
    // Load default section content (Dashboard or Waste Reports)
    // Based on your HTML, 'Waste Reports' is the initial visible section
    await loadSectionContent('Dashboard'); // Load dashboard content first
    await loadSectionContent('Waste Reports'); // Then load reports to populate the table

    // Setup overlay event listeners
    setupOverlayEventListeners();
});

async function loadAdminProfile() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch admin profile');
        }

        const data = await response.json();
        const adminUser = data.data.user;

        document.getElementById('adminName').textContent = adminUser.fullName;
        document.getElementById('adminAvatar').textContent = adminUser.fullName.split(' ').map(n => n[0]).join('');

    } catch (error) {
        console.error('Error loading admin profile:', error);
        showSnackbar('Session expired or failed to load profile. Please login again.', 'error');
        setTimeout(() => { window.location.href = '/resident/login'; }, 1500); // Redirect to login
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/get_admin_dashboard', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        const stats = data.data;

        document.getElementById('totalReports').textContent = stats.totalReports || 0;
        document.getElementById('pendingApproval').textContent = stats.pendingApproval || 0;
        document.getElementById('activeCollectors').textContent = stats.activeCollectors || 0;
        document.getElementById('registeredUsers').textContent = stats.registeredUsers || 0;
        document.getElementById('totalRequests').textContent = stats.totalRequests || 0;
        document.getElementById('expiredRequests').textContent = stats.expiredRequests || 0;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showSnackbar('Error loading dashboard statistics.', 'error');
    }
}

async function loadPendingReports() {
    showLoadingOverlay('Loading pending waste reports...');
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/get_all_pending_waste_reports', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch pending reports');
        }

        const data = await response.json();
        const reports = data.data;

        const tbody = document.getElementById('pendingReportsTableBody');
        tbody.innerHTML = ''; // Clear existing rows

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No pending waste reports for review.</td></tr>';
        } else {
            reports.forEach(report => {
                const row = document.createElement('tr');
                const photoUrl = report.photoUrl && report.photoUrl.length > 0 ? report.photoUrl[0] : 'https://placehold.co/50x50/cccccc/000000?text=No+Image';

                row.innerHTML = `
                    <td>${report._id.substring(0, 8)}...</td>
                    <td><img src="${photoUrl}" alt="Waste Image" class="report-image" onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/000000?text=No+Image';"></td>
                    <td>
                        <div>${report.reportedBy?.fullName || 'N/A'}</div>
                        <small>${report.reportedBy?.email || 'N/A'}</small>
                    </td>
                    <td>${report.userReportedType || 'N/A'}</td>
                    <td>${report.mlIdentifiedType || 'N/A'}</td>
                    <td>${report.approximateWeight || 'N/A'}</td>
                    <td>${report.assignedZone || 'N/A'}</td>
                    <td><span class="status-badge status-${report.status}">${report.status}</span></td>
                    <td>
                        <button class="action-btn view-btn" data-id="${report._id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading pending reports:', error);
        showSnackbar('Error loading pending reports.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const sectionName = this.dataset.section; // Use data-section attribute
            await loadSectionContent(sectionName);
        });
    });
}

async function loadSectionContent(sectionName) {
    const mainContent = document.querySelector('.main-content');
    const dashboardStats = document.getElementById('dashboardStats');
    const reportsSection = document.getElementById('reports-section-content');
    const collectorsSection = document.getElementById('collectors-section-content');
    const usersSection = document.getElementById('users-section-content');
    const vendorsSection = document.getElementById('vendors-section-content');
    const settingsSection = document.getElementById('settings-section-content');

    // Hide all sections first
    dashboardStats.style.display = 'none';
    reportsSection.style.display = 'none';
    collectorsSection.style.display = 'none';
    usersSection.style.display = 'none';
    vendorsSection.style.display = 'none';
    settingsSection.style.display = 'none';

    // Update header based on section
    mainContent.querySelector('.content-header h1').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1) + ' Management';

    switch(sectionName) {
        case 'dashboard':
            dashboardStats.style.display = 'grid'; // Display as grid
            reportsSection.style.display = 'block'; // Keep reports visible on dashboard for quick access
            mainContent.querySelector('.content-header h1').textContent = 'Admin Dashboard'; // Specific title for dashboard
            await loadDashboardStats();
            await loadPendingReports(); // Refresh pending reports on dashboard view
            break;
        case 'reports':
            reportsSection.style.display = 'block';
            await loadPendingReports();
            break;
        case 'collectors':
            collectorsSection.style.display = 'block';
            collectorsSection.innerHTML = `
                <div class="section-header">
                    <h2>Active Collectors</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary" id="addCollectorBtn">
                            <i class="fas fa-plus"></i> Add Collector
                        </button>
                    </div>
                </div>
                <table id="collectorsTable">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Collector</th>
                            <th>Email</th>
                            <th>Zone</th>
                            <th>Pickups</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="collectorsList">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            `;
            await loadCollectors();
            setupCollectorsEventListeners();
            break;
        case 'users':
            usersSection.style.display = 'block';
            usersSection.innerHTML = `
                <div class="section-header">
                    <h2>Registered Residents</h2>
                </div>
                <table id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Rewards</th>
                            <th>Report Count</th>
                            <!-- <th>Actions</th> -->
                        </tr>
                    </thead>
                    <tbody id="usersList">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            `;
            await loadUsers();
            break;
        case 'vendors':
            vendorsSection.style.display = 'block';
            vendorsSection.innerHTML = `
                <div class="section-header">
                    <h2>Registered Vendors</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary" id="addVendorBtn">
                            <i class="fas fa-plus"></i> Add Vendor
                        </button>
                    </div>
                </div>
                <table id="vendorsTable">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th>License No.</th>
                            <th>Email</th>
                            <th>Waste Types</th>
                            <th>Processed (kg)</th>
                            <th>Energy (kWh)</th>
                            <th>CO2 Reduced (kg)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vendorsList">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            `;
            await loadVendors();
            setupVendorsEventListeners();
            break;
        case 'settings':
            settingsSection.style.display = 'block';
            settingsSection.innerHTML = `
                <div class="section-header">
                    <h2>Settings</h2>
                </div>
                <p>Settings content goes here...</p>
            `;
            break;
        case 'logout':
            // Logout is handled by the onclick in HTML, no content to load here
            break;
        default:
            console.warn('Unknown section:', sectionName);
            break;
    }
}

// Event listeners for action buttons on reports table
document.addEventListener('click', async function (e) {
    if (e.target.closest('.view-btn')) {
        const reportId = e.target.closest('.view-btn').dataset.id;
        await viewReportDetails(reportId);
    }
});

// Setup overlay event listeners (for garbageDetailsOverlay)
function setupOverlayEventListeners() {
    document.getElementById('closeGarbageDetailsOverlay').addEventListener('click', () => {
        document.getElementById('garbageDetailsOverlay').style.display = 'none';
    });

    document.getElementById('approveBtn').addEventListener('click', approveReport);
    document.getElementById('rejectBtn').addEventListener('click', rejectReport);

    document.getElementById('garbageDetailsOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('garbageDetailsOverlay')) {
            document.getElementById('garbageDetailsOverlay').style.display = 'none';
        }
    });

    // Setup collector details overlay close button
    document.getElementById('closeCollectorDetailsOverlay').addEventListener('click', () => {
        document.getElementById('collectorDetailsOverlay').style.display = 'none';
    });

    document.getElementById('collectorDetailsOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('collectorDetailsOverlay')) {
            document.getElementById('collectorDetailsOverlay').style.display = 'none';
        }
    });

    document.getElementById('closeVendorDetailsOverlay').addEventListener('click', () => {
        document.getElementById('vendorDetailsOverlay').style.display = 'none';
    });

    document.getElementById('vendorDetailsOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('vendorDetailsOverlay')) {
            document.getElementById('vendorDetailsOverlay').style.display = 'none';
        }
    });
}

// Approve Report function
async function approveReport() {
    const wasteTypeSelect = document.getElementById('wasteTypeSelect');
    const wasteType = wasteTypeSelect.value;

    if (!wasteType) {
        showSnackbar('Please select a waste type before approving.', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to approve this report as ${wasteType}?`)) {
        return;
    }

    showLoadingOverlay('Approving report...');
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/approve_waste_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId: currentReportId, wasteType: wasteType }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to approve report');
        }

        showSnackbar('Report approved successfully!', 'success');
        document.getElementById('garbageDetailsOverlay').style.display = 'none';
        await loadPendingReports(); // Refresh pending reports table
        await loadDashboardStats(); // Refresh dashboard stats
    } catch (error) {
        console.error('Error approving report:', error);
        showSnackbar(error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// Reject Report function
async function rejectReport() {
    if (!confirm('Are you sure you want to reject this report and send it to landfill?')) {
        return;
    }

    showLoadingOverlay('Rejecting report and assigning to collector...');
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/reject_waste_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId: currentReportId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reject report');
        }

        showSnackbar('Report rejected and assigned to collector!', 'success');
        document.getElementById('garbageDetailsOverlay').style.display = 'none';
        await loadPendingReports(); // Refresh pending reports table
        await loadDashboardStats(); // Refresh dashboard stats
    } catch (error) {
        console.error('Error rejecting report:', error);
        showSnackbar(error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// View Report Details function
async function viewReportDetails(reportId) {
    currentReportId = reportId;
    showLoadingOverlay('Loading report details...');
    try {
        const response = await fetch(`http://localhost:5000/api/v1/admin/report-details/${reportId}`, {
            credentials: 'include'
        });

        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Invalid response data');
        }

        populateGarbageDetailsOverlay(result.data);
        document.getElementById('garbageDetailsOverlay').style.display = 'flex'; // Show overlay
    } catch (error) {
        console.error('Error fetching report details:', error);
        showSnackbar(`Error loading report details: ${error.message}`, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function populateGarbageDetailsOverlay(reportData) {
    const report = reportData.wasteReport; // Extract wasteReport object
    const mlDetails = report.mlDetails || {};
    const reportedBy = reportData.resident; // Extract resident object

    // Format date
    const reportDate = new Date(report.createdAt);
    const formattedDate = reportDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // Format coordinates
    const coordinates = report.coordinates?.coordinates || [0, 0];
    const formattedCoords = `${coordinates[1]?.toFixed(6) || 'N/A'}, ${coordinates[0]?.toFixed(6) || 'N/A'}`;
    
    // Update main image and thumbnails
    const mainImageDiv = document.getElementById('mainGarbageImage');
    const thumbnailsDiv = document.getElementById('garbageThumbnails');
    const photoUrls = report.photoUrl || [];

    if (photoUrls.length > 0) {
        mainImageDiv.style.backgroundImage = `url('${photoUrls[0]}')`;
        thumbnailsDiv.innerHTML = photoUrls.map((url, index) => `
            <img src="${url}" class="thumbnail-img ${index === 0 ? 'active' : ''}" 
                 onclick="switchMainImage('${url}', this)" onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/000000?text=No+Image';">
        `).join('');
    } else {
        mainImageDiv.style.backgroundImage = `url('https://placehold.co/200x200/cccccc/000000?text=No+Image')`;
        thumbnailsDiv.innerHTML = '';
    }

    // Populate general details
    document.getElementById('detail-id').textContent = report._id || 'N/A';
    document.getElementById('detail-reportedBy').textContent = reportedBy?.fullName || 'N/A';
    document.getElementById('detail-phone').textContent = reportedBy?.phoneNo || 'N/A';
    document.getElementById('detail-userType').textContent = report.userReportedType || 'N/A';
    document.getElementById('detail-mlType').textContent = report.mlIdentifiedType || 'N/A';
    document.getElementById('detail-weight').textContent = `${report.approximateWeight || 'N/A'} kg`;
    document.getElementById('detail-zone').textContent = report.assignedZone || 'N/A';
    document.getElementById('detail-coordinates').textContent = formattedCoords;
    document.getElementById('detail-date').textContent = formattedDate;
    
    const statusBadge = document.getElementById('detail-status');
    statusBadge.textContent = report.status || 'unknown';
    statusBadge.className = `status-badge status-${report.status || 'unknown'}`;
    
    document.getElementById('detail-recyclable').textContent = mlDetails.recyclable ? 'Yes' : 'No';

    // Populate ML analysis details
    document.getElementById('detail-confidence').textContent = mlDetails.confidence ? `${mlDetails.confidence.toFixed(2)}%` : 'N/A';
    document.getElementById('detail-energyPotential').textContent = mlDetails.energyPotential ? `${mlDetails.energyPotential.toFixed(2)} kWh` : 'N/A';
    document.getElementById('detail-co2Reduction').textContent = mlDetails.co2Reduction ? `${mlDetails.co2Reduction.toFixed(2)} kg` : 'N/A';
    document.getElementById('detail-fraudulent').textContent = mlDetails.fraudDetection?.is_suspicious ? 'Yes' : 'No';
    document.getElementById('detail-fraudScore').textContent = mlDetails.fraudDetection?.suspicion_score ? mlDetails.fraudDetection.suspicion_score.toFixed(3) : 'N/A';

    // Set selected value for wasteTypeSelect
    const wasteTypeSelect = document.getElementById('wasteTypeSelect');
    if (wasteTypeSelect) {
        const mlType = report.mlIdentifiedType;
        const options = Array.from(wasteTypeSelect.options);
        const matchingOption = options.find(option => option.value === mlType);
        if (matchingOption) {
            wasteTypeSelect.value = mlType;
        } else {
            wasteTypeSelect.value = ''; // Select default "Select correct type"
        }
    }
}

// Helper function for image switching in overlay
function switchMainImage(url, element) {
    document.getElementById('mainGarbageImage').style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    element.classList.add('active');
}

// --- Collector Management Functions ---
async function loadCollectors() {
    showLoadingOverlay('Loading collectors...');
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/get_collectors', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch collectors');
        }
        
        const { data } = await response.json();
        populateCollectorsTable(data);
        
    } catch (error) {
        console.error('Error loading collectors:', error);
        showSnackbar('Failed to load collectors. Please try again.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function populateCollectorsTable(collectors) {
    const tbody = document.getElementById('collectorsList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (collectors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No collectors registered yet.</td></tr>';
        return;
    }

    collectors.forEach(collector => {
        const row = document.createElement('tr');
        const initials = collector.fullName ? collector.fullName.split(' ').map(n => n[0]).join('') : 'N/A';
        
        row.innerHTML = `
            <td>${collector.employeeId || 'N/A'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="collector-avatar">${initials}</div>
                    <div>${collector.fullName || 'N/A'}</div>
                </div>
            </td>
            <td>${collector.email || 'N/A'}</td>
            <td>${collector.assignedZone || 'N/A'}</td>
            <td>${collector.assignedPickups?.length || 0}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>
                <button class="action-btn view-collector-btn" data-id="${collector._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function setupCollectorsEventListeners() {
    document.getElementById('addCollectorBtn')?.addEventListener('click', () => {
        showSnackbar('Add new collector functionality (form/modal) would go here.', 'info');
    });

    // Event delegation for view collector button
    document.getElementById('collectorsTable')?.addEventListener('click', async (e) => {
        if (e.target.closest('.view-collector-btn')) {
            currentCollectorId = e.target.closest('.view-collector-btn').dataset.id;
            await viewCollectorDetails(currentCollectorId);
        }
    });
}

async function viewCollectorDetails(collectorId) {
    showLoadingOverlay('Loading collector details...');
    try {
        const response = await fetch(`http://localhost:5000/api/v1/admin/get_collector/${collectorId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Invalid response data');
        }

        populateCollectorOverlay(result.data);
        document.getElementById('collectorDetailsOverlay').style.display = 'flex';
        
    } catch (error) {
        console.error('Error fetching collector details:', error);
        showSnackbar(`Error loading collector details: ${error.message}`, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

let collectorMapInstance = null; // keep it global
let collectorMapMarker = null;
function populateCollectorOverlay(collector) {
    const overlay = document.getElementById('collectorDetailsOverlay');
    if (!overlay) return;
    
    // Format date
    const joinDate = new Date(collector.createdAt);
    const formattedDate = joinDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Format coordinates
    const coordinates = collector.currentLocation?.coordinates || [0, 0];
    const formattedCoords = `${coordinates[1]?.toFixed(6) || 'N/A'}, ${coordinates[0]?.toFixed(6) || 'N/A'}`;
    
    document.getElementById('collector-employeeId').textContent = collector.employeeId || 'N/A';
    document.getElementById('collector-fullName').textContent = collector.fullName || 'N/A';
    document.getElementById('collector-email').textContent = collector.email || 'N/A';
    document.getElementById('collector-zone').textContent = collector.assignedZone || 'N/A';
    document.getElementById('collector-location').textContent = formattedCoords;
    document.getElementById('collector-pickups').textContent = `${collector.assignedPickups?.length || 0} active pickups`;
    document.getElementById('collector-createdAt').textContent = formattedDate;

    // TODO: Initialize map if needed
       if (typeof L !== 'undefined' && document.getElementById('collectorMap')) {
        const mapElement = document.getElementById('collectorMap');

        if (!collectorMapInstance) {
            // Create map only once
            collectorMapInstance = L.map('collectorMap').setView([coordinates[1], coordinates[0]], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(collectorMapInstance);
        } else {
            // Just move the map view if it already exists
            collectorMapInstance.setView([coordinates[1], coordinates[0]], 13);
        }

        // Remove old marker if it exists
        if (collectorMapMarker) {
            collectorMapInstance.removeLayer(collectorMapMarker);
        }

        // Add new marker
        collectorMapMarker = L.marker([coordinates[1], coordinates[0]])
            .addTo(collectorMapInstance)
            .bindPopup(`${collector.fullName}'s Location`)
            .openPopup();

        collectorMapInstance.invalidateSize();
    }

    // Reassign and Message buttons' event listeners are already set up globally
}

function reassignCollector(collectorId) {
    showSnackbar(`Reassign collector ${collectorId} to a new zone (functionality to be implemented).`, 'info');
}

function messageCollector(collectorId, collectorName) {
    showSnackbar(`Open messaging interface for ${collectorName} (functionality to be implemented).`, 'info');
}

// --- User Management Functions (Residents) ---
async function loadUsers() {
    showLoadingOverlay('Loading registered users...');
    try {
        // Assuming an API endpoint for fetching all residents
        const response = await fetch('http://localhost:5000/api/v1/admin/get_all_residents', { // You might need to create this endpoint
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const { data } = await response.json();
        populateUsersTable(data);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showSnackbar('Failed to load registered users. Please ensure the API endpoint exists.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function populateUsersTable(users) {
    const tbody = document.getElementById('usersList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No registered users yet.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        const initials = user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'N/A';

        row.innerHTML = `
            <td>${user._id.substring(0, 8)}...</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="collector-avatar">${initials}</div>
                    <div>${user.fullName || 'N/A'}</div>
                </div>
            </td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.phoneNo || 'N/A'}</td>
            <td>${user.rewardCoins || 0}</td>
            <td>${user.wasteReports?.length || 0}</td>
            <!-- <td>
                <button class="action-btn view-user-btn" data-id="${user._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td> -->
        `;
        tbody.appendChild(row);
    });

    // Add event listener for view user details (if needed)
    // document.getElementById('usersTable')?.addEventListener('click', (e) => {
    //     if (e.target.closest('.view-user-btn')) {
    //         const userId = e.target.closest('.view-user-btn').dataset.id;
    //         showSnackbar(`View details for user ${userId} (functionality to be implemented).`, 'info');
    //     }
    // });
}


// --- Vendor Management Functions ---
async function loadVendors() {
    showLoadingOverlay('Loading registered vendors...');
    try {
        // Assuming an API endpoint for fetching all vendors
        const response = await fetch('http://localhost:5000/api/v1/admin/get_all_vendors', { // You might need to create this endpoint
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch vendors');
        }
        
        const { data } = await response.json();
        populateVendorsTable(data);
        
    } catch (error) {
        console.error('Error loading vendors:', error);
        showSnackbar('Failed to load registered vendors. Please ensure the API endpoint exists.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function populateVendorsTable(vendors) {
    const tbody = document.getElementById('vendorsList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (vendors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No registered vendors yet.</td></tr>';
        return;
    }

    vendors.forEach(vendor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vendor.companyName || 'N/A'}</td>
            <td>${vendor.licenseNo || 'N/A'}</td>
            <td>${vendor.email || 'N/A'}</td>
            <td>${(vendor.requiredWasteTypes || []).join(', ') || 'N/A'}</td>
            <td>${vendor.wasteProcessed || 0}</td>
            <td>${vendor.energyProduced || 0}</td>
            <td>${vendor.co2Reduced || 0}</td>
            <td>
                <button class="action-btn view-vendor-btn" data-id="${vendor._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event listener for view vendor details (if needed)
    document.getElementById('vendorsTable')?.addEventListener('click', (e) => {
        if (e.target.closest('.view-vendor-btn')) {
            const vendorId = e.target.closest('.view-vendor-btn').dataset.id;
            showSnackbar(`View details for vendor ${vendorId} (functionality to be implemented).`, 'info');
        }
    });
}

function setupVendorsEventListeners() {
    document.getElementById('addVendorBtn')?.addEventListener('click', () => {
        showSnackbar('Add new vendor functionality (form/modal) would go here.', 'info');
    });

    document.getElementById('vendorsTable')?.addEventListener('click', async (e) => {
        if (e.target.closest('.view-vendor-btn')) {
            currentVendorId = e.target.closest('.view-vendor-btn').dataset.id;
            await viewVendorDetails(currentVendorId);
        }
    });
}


async function viewVendorDetails(VendorId) {
    showLoadingOverlay('Loading collector details...');
    try {
        const response = await fetch(`http://localhost:5000/api/v1/admin/get_vendor/${VendorId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Invalid response data');
        }

        populateVendorOverlay(result.data);
        document.getElementById('vendorDetailsOverlay').style.display = 'flex';
        
    } catch (error) {
        console.error('Error fetching vendor details:', error);
        showSnackbar(`Error loading vendor details: ${error.message}`, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

let vendorMapInstance = null; // keep it global
let vendorMapMarker = null;

function populateVendorOverlay(vendor) {
    const overlay = document.getElementById('vendorDetailsOverlay');
    if (!overlay) return;
    
    // Format date
    const joinDate = new Date(vendor.createdAt);
    const formattedDate = joinDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Format coordinates
    const coordinates = vendor.processingFacilityLocation?.coordinates || [0, 0];
    const formattedCoords = `${coordinates[1]?.toFixed(6) || 'N/A'}, ${coordinates[0]?.toFixed(6) || 'N/A'}`;
    
    document.getElementById('vendor-employeeId').textContent = vendor._id || 'N/A';
    document.getElementById('vendor-companyName').textContent = vendor.companyName || 'N/A';
    document.getElementById('vendor-licenseNo').textContent = vendor.licenseNo || 'N/A';
    document.getElementById('vendor-email').textContent = vendor.email || 'N/A';
    document.getElementById('vendor-address').textContent = vendor.address || 'N/A';
    document.getElementById('vendor-processingMethod').textContent = vendor.processingMethod || 'N/A';
    document.getElementById('vendor-location').textContent = formattedCoords;
    document.getElementById('vendor-certifications').textContent = `${vendor.certifications || 0}`;
    document.getElementById('vendor-createdAt').textContent = formattedDate;

    // TODO: Initialize map if needed
       if (typeof L !== 'undefined' && document.getElementById('vendorMap')) {
        const mapElement = document.getElementById('vendorMap');

        if (!vendorMapInstance) {
            // Create map only once
            vendorMapInstance = L.map('vendorMap').setView([coordinates[1], coordinates[0]], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(vendorMapInstance);
        } else {
            // Just move the map view if it already exists
            vendorMapInstance.setView([coordinates[1], coordinates[0]], 13);
        }

        // Remove old marker if it exists
        if (vendorMapMarker) {
            vendorMapInstance.removeLayer(vendorMapMarker);
        }

        // Add new marker
        vendorMapMarker = L.marker([coordinates[1], coordinates[0]])
            .addTo(vendorMapInstance)
            .bindPopup(`${vendor.companyName}'s Location`)
            .openPopup();

        vendorMapInstance.invalidateSize();
    }

    // Reassign and Message buttons' event listeners are already set up globally
}

// --- Common UI Functions ---
function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.querySelector('p').textContent = message;
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

async function logoutUser() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            clearAuthCookies();
            showSnackbar('Logged out successfully.', 'success');
            setTimeout(() => { window.location.href = '/resident/login'; }, 1000); // Redirect to login
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showSnackbar(`Logout failed: ${error.message}`, 'error');
        // Even if API logout fails, clear cookies and redirect for client-side logout
        clearAuthCookies();
        setTimeout(() => { window.location.href = '/resident/login'; }, 1000);
    }
}

function clearAuthCookies() {
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function showLoginPage() {
    window.location.href = '/resident/login';
}

