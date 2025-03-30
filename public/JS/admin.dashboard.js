
document.addEventListener('DOMContentLoaded', async function() {
    // Load admin profile
    await loadAdminProfile();
    
    // Load dashboard stats
    await loadDashboardStats();
    
    // Load pending reports
    await loadPendingReports();
    
    // Setup event listeners (including overlay)
    setupEventListeners();
    
    // Make sure overlay exists but is hidden initially
    const overlay = document.getElementById('garbageDetailsOverlay');
    if (!overlay) {
        // Create overlay if it doesn't exist
        const overlayHTML = `
            <div id="garbageDetailsOverlay" class="overlay">
                <div class="overlay-content"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
    } else {
        overlay.style.display = 'none';
    }
});
    async function loadAdminProfile() {
      try {

        const response = await fetch('http://localhost:5000/api/v1/admin/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // body: JSON.stringify({ email, password }),
          credentials: 'include' // Important for cookies
        });

        if (!response.ok) {
          throw new Error('Failed to fetch admin profile');
        }

        const data = await response.json();
        const adminUser = data.data.user;

        // Update UI
        document.querySelector('.user-name').textContent = adminUser.fullName;
        document.querySelector('.user-avatar').textContent =
          adminUser.fullName.split(' ').map(n => n[0]).join('');

      } catch (error) {
        console.error('Error loading admin profile:', error);
        alert('Session expired. Please login again.');
        window.location.href = '/resident/login';
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

        // Update stats cards
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.totalReports || 0;
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = stats.pendingApproval || 0;
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = stats.activeCollectors || 0;
        document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = stats.registeredUsers || 0;
        document.querySelector('.stat-card:nth-child(5) .stat-value').textContent = stats.totalRequests || 0;
        document.querySelector('.stat-card:nth-child(6) .stat-value').textContent = stats.pendingApproval || 0;

      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // You might want to show a more user-friendly error message
      }
    }

    async function loadPendingReports() {
      try {
        const response = await fetch('http://localhost:5000/api/v1/admin/get_all_pending_waste_reports', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pending reports');
        }

        const data = await response.json();
        const reports = data.data;

        console.log("reports: ", reports)

        // Clear existing table rows (except header)
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';

        // Add new rows
        reports.forEach(report => {
          const row = document.createElement('tr');

          row.innerHTML = `
                <td>${report._id}</td>
                <td><img src="${report.photoUrl[0]}" class="report-image"></td>
                <td>
                    <div>${report?.reportedBy?.fullName}</div>
                    <small>${report?.reportedBy?.email}</small>
                </td>
                <td>${report.userReportedType}</td>
                <td>${report.mlIdentifiedType}</td>
                <td>${report.approximateWeight}</td>
                <td>${report.assignedZone}</td>
                <td><span class="status-badge status-${report.status}">${report.status}</span></td>
                <td>
                    <button class="action-btn approve-btn" data-id="${report._id}" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject-btn" data-id="${report._id}" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="action-btn view-btn" data-id="${report._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

          tbody.appendChild(row);
        });

      } catch (error) {
        console.error('Error loading pending reports:', error);
      }
    }

    function setupEventListeners() {
      // Handle approve/reject/view buttons
      document.addEventListener('click', async function (e) {
        if (e.target.closest('.approve-btn')) {
          const reportId = e.target.closest('.approve-btn').dataset.id;
          await updateReportStatus(reportId, 'approved');
        }

        if (e.target.closest('.reject-btn')) {
          const reportId = e.target.closest('.reject-btn').dataset.id;
          await updateReportStatus(reportId, 'rejected');
        }

        if (e.target.closest('.view-btn')) {
          const reportId = e.target.closest('.view-btn').dataset.id;
          viewReportDetails(reportId);
        }
      });

      // Nav menu items
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
          document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
          this.classList.add('active');

          // You would load different content based on which nav item was clicked
          const navText = this.querySelector('span').textContent;
          console.log(`Loading ${navText} section...`);
        });
      });
    }

    // Update the approve/reject functions
async function approveReport() {
    const wasteType = document.getElementById('wasteTypeSelect').value;
    
    try {   
        const response = await fetch('http://localhost:5000/api/v1/admin/approve_waste_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reportId: currentReportId,
                wasteType: wasteType
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to approve report');
        }

        const data = await response.json();
        alert('Report approved successfully!');
        
        // Refresh the dashboard
        await loadPendingReports();
        await loadDashboardStats();
        
        // Close overlay
        document.getElementById('garbageDetailsOverlay').style.display = 'none';

    } catch (error) {
        console.error('Error approving report:', error);
        showSnackbar(error.message,"error")
        // alert(error.message);
    }
}

async function rejectReport() {
    if (!confirm('Are you sure you want to reject this report and send it to landfill?')) {
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/reject_waste_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reportId: currentReportId
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to reject report');
        }

        const data = await response.json();
        alert('Report rejected and assigned to collector!');
        
        // Refresh the dashboard
        await loadPendingReports();
        await loadDashboardStats();
        
        // Close overlay
        document.getElementById('garbageDetailsOverlay').style.display = 'none';

    } catch (error) {
        console.error('Error rejecting report:', error);
        alert(error.message);
    }
}

// Update the setupOverlayEventListeners function
function setupOverlayEventListeners() {
    // Close button
    document.querySelector('.close-overlay')?.addEventListener('click', () => {
        document.getElementById('garbageDetailsOverlay').style.display = 'none';
    });

    // Accept button
    document.getElementById('acceptBtn')?.addEventListener('click', approveReport);

    // Reject button
    document.getElementById('rejectBtn')?.addEventListener('click', rejectReport);

    // Close when clicking outside content
    document.getElementById('garbageDetailsOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('garbageDetailsOverlay')) {
            document.getElementById('garbageDetailsOverlay').style.display = 'none';
        }
    });
}

    // Add these variables at the top
    let currentReportId = null;

    // Update the viewReportDetails function
    async function viewReportDetails(reportId) {
    currentReportId = reportId;
    try {
        // Show overlay with loading state
        const overlay = document.getElementById('garbageDetailsOverlay');
        overlay.style.display = 'block';
        overlay.querySelector('.overlay-content').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                <p>Loading report details...</p>
            </div>
        `;

        // Fetch report details
        const response = await fetch(`http://localhost:5000/api/v1/vendor/view_garbage_details/${reportId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Invalid response data');
        }

        populateOverlay(result.data);
        
    } catch (error) {
        console.error('Error fetching report details:', error);
        const overlayContent = document.querySelector('.overlay-content');
        if (overlayContent) {
            overlayContent.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 24px;"></i>
                    <p>Error loading report details</p>
                    <p>${error.message}</p>
                    <button onclick="document.getElementById('garbageDetailsOverlay').style.display='none'" 
                            style="padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        }
    }
}
function populateOverlay(report) {
    const overlay = document.getElementById('garbageDetailsOverlay');
    if (!overlay) {
        console.error('Overlay element not found');
        return;
    }

    // Format date
    const reportDate = new Date(report.createdAt);
    const formattedDate = reportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format coordinates
    const coordinates = report.coordinates?.coordinates || [0, 0];
    const formattedCoords = `${coordinates[1]?.toFixed(6) || 'N/A'}, ${coordinates[0]?.toFixed(6) || 'N/A'}`;
    
    // Create the overlay content HTML
    const overlayContent = `
        <span class="close-overlay">&times;</span>
        
        <div class="garbage-details-container">
            <!-- Images Section -->
            <div class="garbage-images">
                <div id="mainGarbageImage" class="main-image" 
                     style="background-image: url('${report.photoUrl?.[0] || ''}')"></div>
                <div id="garbageThumbnails" class="thumbnails">
                    ${(report.photoUrl || []).map((url, index) => `
                        <img src="${url}" class="thumbnail-img ${index === 0 ? 'active' : ''}" 
                             onclick="switchMainImage('${url}', this)">
                    `).join('')}
                </div>
            </div>
            
            <!-- Details Section -->
            <div class="garbage-info">
                <h2>Waste Report Details</h2>
                
                ${[
                    ['Report ID', report._id || 'N/A'],
                    ['Reported By', report.reportedBy?.fullName || 'N/A'],
                    ['Phone', report.reportedBy?.phoneNo || 'N/A'],
                    ['User Reported Type', report.userReportedType || 'N/A'],
                    ['ML Identified Type', report.mlIdentifiedType || 'N/A'],
                    ['Weight', `${report.approximateWeight || 'N/A'} kg`],
                    ['Zone', report.assignedZone || 'N/A'],
                    ['Coordinates', formattedCoords],
                    ['Reported On', formattedDate],
                    ['Status', `<span class="status-badge status-${report.status || 'unknown'}">${report.status || 'unknown'}</span>`],
                    ['Recyclable', report.mlDetails?.isRecyclable ? 'Yes' : 'No']
                ].map(([label, value]) => `
                    <div class="detail-row">
                        <span class="detail-label">${label}:</span>
                        <span class="detail-value">${value}</span>
                    </div>
                `).join('')}
                
                <!-- Waste Type Selection for Approval -->
                <div class="detail-row">
                    <span class="detail-label">Confirm Waste Type:</span>
                    <select id="wasteTypeSelect" class="detail-value">
                        <option value="" disabled selected>Select correct type</option>
                        <option value="plasti waste" ${report.mlIdentifiedType === 'plastic waste' ? 'selected' : ''}>Plastic</option>
                        <option value="paper waste" ${report.mlIdentifiedType === 'paper waste' ? 'selected' : ''}>Paper</option>
                        <option value="metal waste" ${report.mlIdentifiedType === 'metal waste' ? 'selected' : ''}>Metal</option>
                        <option value="glass waste" ${report.mlIdentifiedType === 'glass waste' ? 'selected' : ''}>Glass</option>
                        <option value="organic waste" ${report.mlIdentifiedType === 'organic waste' ? 'selected' : ''}>Organic</option>
                        <option value="E-waste" ${report.mlIdentifiedType === 'E-waste' ? 'selected' : ''}>E-waste</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button id="acceptBtn" class="btn btn-success">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button id="rejectBtn" class="btn btn-danger">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        </div>
    `;

    // Set the content
    overlay.querySelector('.overlay-content').innerHTML = overlayContent;
    
    // Reattach event listeners
    setupOverlayEventListeners();
}


// Helper function for image switching
function switchMainImage(url, element) {
    document.getElementById('mainGarbageImage').style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    element.classList.add('active');
}


    // Add event listeners for overlay
    document.querySelector('.close-overlay').addEventListener('click', () => {
      document.getElementById('garbageDetailsOverlay').style.display = 'none';
    });

    document.getElementById('acceptBtn').addEventListener('click', async () => {
      await updateReportStatus(currentReportId, 'approved');
      document.getElementById('garbageDetailsOverlay').style.display = 'none';
    });

    document.getElementById('rejectBtn').addEventListener('click', async () => {
      await updateReportStatus(currentReportId, 'rejected');
      document.getElementById('garbageDetailsOverlay').style.display = 'none';
    });

    // Close overlay when clicking outside content
    document.getElementById('garbageDetailsOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('garbageDetailsOverlay')) {
        document.getElementById('garbageDetailsOverlay').style.display = 'none';
      }
    });

    
    // Helper function to get cookies
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    }


    function setupOverlayEventListeners() {
    // Close button
    const closeBtn = document.querySelector('.close-overlay');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('garbageDetailsOverlay').style.display = 'none';
        });
    }

    // Accept button
    const acceptBtn = document.getElementById('acceptBtn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', async () => {
            await approveReport()
            document.getElementById('garbageDetailsOverlay').style.display = 'none';
        });
    }

    // Reject button
    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', async () => {
            await rejectReport()
            document.getElementById('garbageDetailsOverlay').style.display = 'none';
        });
    }

    // Close when clicking outside content
    const overlay = document.getElementById('garbageDetailsOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }
}

  



// Add these variables at the top
let currentCollectorId = null;

// Add to DOMContentLoaded
document.addEventListener('DOMContentLoaded', async function() {
    // ... existing code ...
    
    // Setup navigation
    setupNavigation();
    
    // Load initial content based on active nav item
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        await loadSectionContent(activeNav.querySelector('span').textContent);
    }
});

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const sectionName = this.querySelector('span').textContent;
            await loadSectionContent(sectionName);
        });
    });
}

async function loadSectionContent(sectionName) {
    const mainContent = document.querySelector('.main-content');
    
    switch(sectionName) {
        case 'Collectors':
            mainContent.innerHTML = `
                <header class="content-header">
                    <h1>Collectors Management</h1>
                    <div class="user-profile">
                        <div class="user-avatar">CC</div>
                        <div class="user-info">
                            <span class="user-name">Code Crux</span>
                            <span class="user-role">Admin</span>
                        </div>
                    </div>
                </header>
                
                <section class="collectors-section">
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
                </section>
            `;
            
            await loadCollectors();
            setupCollectorsEventListeners();
            break;
            
        case 'Waste Reports':
            // Your existing waste reports content
            break;
            
        // Add cases for other sections
    }
}

async function loadCollectors() {
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
        alert('Failed to load collectors. Please try again.');
    }
}

function populateCollectorsTable(collectors) {
    const tbody = document.getElementById('collectorsList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    collectors.forEach(collector => {
        const row = document.createElement('tr');
        const initials = collector.fullName.split(' ').map(n => n[0]).join('');
        
        row.innerHTML = `
            <td>${collector.employeeId}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="collector-avatar">${initials}</div>
                    <div>${collector.fullName}</div>
                </div>
            </td>
            <td>${collector.email}</td>
            <td>${collector.assignedZone}</td>
            <td>${collector.assignedPickups?.length || 0}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>
                <button class="view-collector-btn" data-id="${collector._id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function setupCollectorsEventListeners() {
    // View collector details
    document.querySelectorAll('.view-collector-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            currentCollectorId = e.currentTarget.dataset.id;
            console.log("collector id: ", currentCollectorId)
            await viewCollectorDetails(currentCollectorId);
        });
    });
    
    // Add new collector
    document.getElementById('addCollectorBtn')?.addEventListener('click', () => {
        // Implement add collector functionality
        alert('Add new collector functionality would go here');
    });
}

async function viewCollectorDetails(collectorId) {
    try {
        // // Show loading state
        // const overlay = document.getElementById('collectorDetailsOverlay');
        // overlay.style.display = 'block';
        // overlay.querySelector('.overlay-content').innerHTML = `
        //     <div style="padding: 20px; text-align: center;">
        //         <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
        //         <p>Loading collector details...</p>
        //     </div>
        // `;

        // Fetch collector details
        const response = await fetch(`http://localhost:5000/api/v1/admin/get_collector/${collectorId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("collector details: ", result)
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Invalid response data');
        }

        populateCollectorOverlay(result.data);
        
    } catch (error) {
        console.error('Error fetching collector details:', error);
        const overlayContent = document.querySelector('#collectorDetailsOverlay .overlay-content');
        if (overlayContent) {
            overlayContent.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 24px;"></i>
                    <p>Error loading collector details</p>
                    <p>${error.message}</p>
                    <button onclick="document.getElementById('collectorDetailsOverlay').style.display='none'" 
                            style="padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        }
    }
}

function populateCollectorOverlay(collector) {
    const overlay = document.getElementById('collectorDetailsOverlay');
    if (!overlay) return;
    
    // Format date
    const joinDate = new Date(collector.createdAt);
    const formattedDate = joinDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Format coordinates
    const coordinates = collector.currentLocation?.coordinates || [0, 0];
    const formattedCoords = `${coordinates[1]?.toFixed(6) || 'N/A'}, ${coordinates[0]?.toFixed(6) || 'N/A'}`;
    
    // Create the overlay content
    const overlayContent = `
        <span class="close-overlay">&times;</span>
        
        <div class="collector-details-container">
            <!-- Collector Info Section -->
            <div class="collector-info">
                <h2>Collector Details</h2>
                
                ${[
                    ['Employee ID', collector.employeeId || 'N/A'],
                    ['Full Name', collector.fullName || 'N/A'],
                    ['Email', collector.email || 'N/A'],
                    ['Assigned Zone', collector.assignedZone || 'N/A'],
                    ['Current Location', formattedCoords],
                    ['Member Since', formattedDate]
                ].map(([label, value]) => `
                    <div class="detail-row">
                        <span class="detail-label">${label}:</span>
                        <span class="detail-value">${value}</span>
                    </div>
                `).join('')}
                
                <div class="detail-row">
                    <span class="detail-label">Assigned Pickups:</span>
                    <div class="detail-value">
                        ${collector.assignedPickups?.length || 0} active pickups
                    </div>
                </div>
            </div>
            
            <!-- Map Section -->
            <div class="collector-map">
                <div id="collectorMap" style="height: 300px; background: #f5f5f5; border-radius: 8px;">
                    <p class="map-placeholder">Map would display here</p>
                </div>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
            <button id="reassignCollectorBtn" class="btn btn-warning">
                <i class="fas fa-random"></i> Reassign Zone
            </button>
            <button id="messageCollectorBtn" class="btn btn-primary">
                <i class="fas fa-envelope"></i> Send Message
            </button>
        </div>
    `;
    
    // Set the content
    overlay.querySelector('.overlay-content').innerHTML = overlayContent;
    
    // Setup event listeners
    document.querySelector('#collectorDetailsOverlay .close-overlay').addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    
    document.getElementById('reassignCollectorBtn')?.addEventListener('click', () => {
        reassignCollector(collector._id);
    });
    
    document.getElementById('messageCollectorBtn')?.addEventListener('click', () => {
        messageCollector(collector._id, collector.fullName);
    });
    
    // Here you would initialize the map with the collector's location
    // initCollectorMap(collector.currentLocation.coordinates);
}

function reassignCollector(collectorId) {
    // Implement reassign functionality
    alert(`Would reassign collector ${collectorId} to a new zone`);
}

function messageCollector(collectorId, collectorName) {
    // Implement messaging functionality
    alert(`Would open messaging interface for ${collectorName}`);
}