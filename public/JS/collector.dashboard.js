// // Utility function for Snackbar notifications
// function showSnackbar(message, type = 'success') {
//     const snackbar = document.getElementById('snackbar');
//     if (!snackbar) {
//         // Create snackbar element if it doesn't exist
//         const newSnackbar = document.createElement('div');
//         newSnackbar.id = 'snackbar';
//         document.body.appendChild(newSnackbar);
//         // Add basic styling for snackbar (can be moved to CSS)
//         const style = document.createElement('style');
//         style.textContent = `
//             #snackbar {
//                 visibility: hidden;
//                 min-width: 250px;
//                 background-color: #333;
//                 color: #fff;
//                 text-align: center;
//                 border-radius: 4px;
//                 padding: 16px;
//                 position: fixed;
//                 z-index: 1000;
//                 right: 30px;
//                 bottom: 30px;
//                 font-size: 14px;
//                 transition: all 0.5s ease-in-out;
//                 opacity: 0;
//             }
//             #snackbar.show {
//                 visibility: visible;
//                 opacity: 1;
//                 bottom: 50px;
//             }
//             #snackbar.success { background-color: #4CAF50; }
//             #snackbar.error { background-color: #f44336; }
//             #snackbar.info { background-color: #2196F3; }
//         `;
//         document.head.appendChild(style);
//         return showSnackbar(message, type); // Call itself once style is added
//     }

//     snackbar.className = `show ${type}`;
//     snackbar.textContent = message;

//     setTimeout(() => {
//         snackbar.className = snackbar.className.replace('show', '');
//     }, type === 'error' ? 5000 : 3000);
// }

// // Map variables
// let map;
// let userMarker;
// let pickupMarkers = []; // Array to hold all pickup markers
// let dropoffMarkers = []; // Array to hold all dropoff markers
// let routePolyline; // To store the route line
// let watchId; // For geolocation watchPosition

// // Global variables for waste details overlay
// let currentWasteDetails = null;
// let detailsMap = null;
// let detailsPickupMarker = null;
// let detailsDropoffMarker = null;
// let detailsRoute = null;

// document.addEventListener('DOMContentLoaded', function() {
//     init();
//     setupOverlayEventListeners(); // Setup listeners for the waste details overlay
// });

// async function init() {
//     await loadCollectorProfile(); // Load collector profile
//     initMap();
//     setupEventListeners();
//     await loadData();
//     startLocationTracking();
// }

// async function loadCollectorProfile() {
//     try {
//         const response = await fetch('http://localhost:5000/api/v1/collector/me', { // Assuming a /me endpoint for collector
//             method: 'GET',
//             headers: { 'Content-Type': 'application/json' },
//             credentials: 'include'
//         });

//         if (!response.ok) {
//             throw new Error('Failed to fetch collector profile');
//         }

//         const data = await response.json();
//         const collectorUser = data.data.user;

//         document.getElementById('collectorName').textContent = collectorUser.fullName;
//         document.getElementById('collectorAvatar').textContent = collectorUser.fullName.split(' ').map(n => n[0]).join('');

//     } catch (error) {
//         console.error('Error loading collector profile:', error);
//         showSnackbar('Session expired or failed to load profile. Please login again.', 'error');
//         setTimeout(() => { window.location.href = '/resident/login'; }, 1500); // Redirect to login
//     }
// }

// // Initialize the main map
// function initMap() {
//     map = L.map('collectionMap').setView([20.5937, 78.9629], 5); // Default to India view

//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//     }).addTo(map);
// }

// // Setup main event listeners
// function setupEventListeners() {
//     document.getElementById('locateMeBtn').addEventListener('click', locateUser);
//     document.getElementById('refreshMapBtn').addEventListener('click', () => {
//         map.invalidateSize();
//         showSnackbar('Map refreshed', 'success');
//     });

//     // Navigation menu items
//     document.querySelectorAll('.nav-item').forEach(item => {
//         item.addEventListener('click', async function() {
//             document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
//             this.classList.add('active');
            
//             const sectionName = this.dataset.section;
//             await loadSectionContent(sectionName);
//         });
//     });
// }

// async function loadSectionContent(sectionName) {
//     const dashboardStats = document.getElementById('dashboardStats');
//     const mapSection = document.getElementById('map-section-content');
//     const pickupsSection = document.getElementById('pickups-section-content');
//     const historySection = document.getElementById('history-section-content');

//     // Hide all sections first
//     dashboardStats.style.display = 'none';
//     mapSection.style.display = 'none';
//     pickupsSection.style.display = 'none';
//     historySection.style.display = 'none';

//     // Update header based on section
//     document.querySelector('.main-content .content-header h1').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

//     switch(sectionName) {
//         case 'dashboard':
//             dashboardStats.style.display = 'grid';
//             pickupsSection.style.display = 'block'; // Show pickups table on dashboard
//             document.querySelector('.main-content .content-header h1').textContent = 'Collector Dashboard';
//             await loadData(); // Reload all data
//             break;
//         case 'map':
//             mapSection.style.display = 'block';
//             map.invalidateSize(); // Important for map to render correctly
//             await loadData(); // Reload data to ensure map is updated
//             break;
//         case 'history':
//             historySection.style.display = 'block';
//             historySection.innerHTML = `
//                 <div class="section-header">
//                     <h2>Collection History</h2>
//                 </div>
//                 <table id="historyTable">
//                     <thead>
//                         <tr>
//                             <th>Request ID</th>
//                             <th>Waste Type</th>
//                             <th>Weight</th>
//                             <th>Status</th>
//                             <th>Date</th>
//                             <th>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody id="fullHistoryTableBody">
//                         <!-- Will be populated by JavaScript -->
//                     </tbody>
//                 </table>
//             `;
//             await loadCollectionHistory();
//             break;
//         case 'logout':
//             // Logout is handled by the onclick in HTML, no content to load here
//             break;
//         default:
//             console.warn('Unknown section:', sectionName);
//             break;
//     }
// }


// // Load data from backend
// async function loadData() {
//     showLoadingOverlay('Loading dashboard data...');
//     try {
//         const dashboardData = await fetchDashboardData();
//         const assignedPickups = await fetchAssignedPickups();

//         updateDashboard(dashboardData);
//         updatePickupsTable(assignedPickups);
//         plotPickupsOnMap(assignedPickups);
//     } catch (error) {
//         showSnackbar('Failed to load data: ' + error.message, 'error');
//     } finally {
//         hideLoadingOverlay();
//     }
// }

// // Fetch dashboard data from API
// async function fetchDashboardData() {
//     const response = await fetch('http://localhost:5000/api/v1/collector/get_collector_dashboard', {
//         credentials: 'include'
//     });
//     if (!response.ok) {
//         throw new Error('Failed to fetch dashboard data');
//     }
//     const { data } = await response.json();
//     return data;
// }

// // Fetch assigned pickups from API
// async function fetchAssignedPickups() {
//     const response = await fetch('http://localhost:5000/api/v1/collector/get_assigned_pickups', {
//         credentials: 'include'
//     });
//     if (!response.ok) {
//         throw new Error('Failed to fetch assigned pickups');
//     }
//     const { data } = await response.json();
//     return data;
// }

// // Fetch full collection history (for history tab)
// async function loadCollectionHistory() {
//     showLoadingOverlay('Loading collection history...');
//     try {
//         // Assuming an API endpoint that returns all processing requests for the collector
//         const response = await fetch('http://localhost:5000/api/v1/collector/get_all_processing_history', { // You might need to create this endpoint
//             credentials: 'include'
//         });
//         if (!response.ok) {
//             throw new Error('Failed to fetch collection history');
//         }
//         const { data } = await response.json();
//         populateCollectionHistoryTable(data);
//     } catch (error) {
//         console.error('Error loading collection history:', error);
//         showSnackbar('Failed to load collection history.', 'error');
//     } finally {
//         hideLoadingOverlay();
//     }
// }

// function populateCollectionHistoryTable(history) {
//     const tbody = document.getElementById('fullHistoryTableBody');
//     if (!tbody) return;

//     tbody.innerHTML = '';
//     if (history.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No collection history found.</td></tr>';
//         return;
//     }

//     history.forEach(item => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td>${item._id.substring(0, 8)}...</td>
//             <td>${item.wasteReport?.mlIdentifiedType || 'N/A'}</td>
//             <td>${item.wasteReport?.approximateWeight || 'N/A'} kg</td>
//             <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
//             <td>${new Date(item.createdAt).toLocaleDateString()}</td>
//             <td>
//                 <button class="action-btn" title="View Details" onclick="showDetails('${item.wasteReport?._id || item._id}')">
//                     <i class="fas fa-eye"></i>
//                 </button>
//             </td>
//         `;
//         tbody.appendChild(row);
//     });
// }


// // Update dashboard stats
// function updateDashboard(data) {
//     document.getElementById('totalAssigned').textContent = data.totalAssigned || 0;
//     document.getElementById('pendingPickups').textContent = data.pendingPickups || 0;
//     document.getElementById('deliveredPickups').textContent = data.deliveredPickups || 0;
// }

// // Update pickups table
// function updatePickupsTable(pickups) {
//     const tbody = document.getElementById('pickupsTableBody');
//     tbody.innerHTML = '';
//     if (pickups.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No assigned pickups.</td></tr>';
//         return;
//     }

//     pickups.forEach(pickup => {
//         const row = document.createElement('tr');
//         const wasteReportId = pickup.wasteReport?._id || pickup._id; // Use wasteReport ID for details
//         const pickupCoords = pickup.wasteReport?.coordinates || [0,0]; // Ensure coordinates exist
//         const dropoffCoords = pickup.vendor?.processingFacilityLocation?.coordinates || [0,0]; // Ensure coordinates exist

//         row.innerHTML = `
//             <td>${pickup._id.substring(0, 8)}...</td>
//             <td>${pickup.wasteReport?.mlIdentifiedType || 'N/A'}</td>
//             <td>${pickup.wasteReport?.approximateWeight || 'N/A'} kg</td>
//             <td><span class="status-badge ${getStatusClass(pickup.status)}">${pickup.status}</span></td>
//             <td>${new Date(pickup.createdAt).toLocaleDateString()}</td>
//             <td>
//                 <button class="action-btn" title="View Details" onclick="showDetails('${wasteReportId}')">
//                     <i class="fas fa-eye"></i>
//                 </button>
//                 <button class="action-btn" title="Navigate to Pickup" onclick="navigateToExternalMap(${pickupCoords[1]}, ${pickupCoords[0]})">
//                     <i class="fas fa-map-marker-alt"></i>
//                 </button>
//                 ${pickup.status === 'accepted' ? `
//                 <button class="action-btn" title="Mark Collected" onclick="markStatusChange('${pickup._id}', 'collected')">
//                     <i class="fas fa-check-circle"></i>
//                 </button>` : ''}
//                 ${pickup.status === 'collected' ? `
//                 <button class="action-btn" title="Mark Delivered" onclick="markStatusChange('${pickup._id}', 'delivered')">
//                     <i class="fas fa-truck"></i>
//                 </button>` : ''}
//             </td>
//         `;
//         tbody.appendChild(row);
//     });
// }

// // Get CSS class for status badge
// function getStatusClass(status) {
//     const statusClasses = {
//         pending_vendor: 'status-pending_vendor',
//         accepted: 'status-accepted',
//         collected: 'status-collected',
//         delivered: 'status-delivered',
//         rejected: 'status-rejected',
//         expired: 'status-expired'
//     };
//     return statusClasses[status] || '';
// }

// // Plot all pickups and dropoffs on the map
// function plotPickupsOnMap(pickups) {
//     // Clear existing markers and polylines
//     pickupMarkers.forEach(marker => map.removeLayer(marker));
//     dropoffMarkers.forEach(marker => map.removeLayer(marker));
//     if (routePolyline) map.removeLayer(routePolyline);
//     pickupMarkers = [];
//     dropoffMarkers = [];

//     const bounds = [];

//     pickups.forEach(pickup => {
//         if (!pickup.wasteReport || !pickup.wasteReport.coordinates) return; // Skip if no waste report or coordinates

//         // Convert from [lng, lat] to [lat, lng] for Leaflet
//         const pickupCoords = [
//             pickup.wasteReport.coordinates[1],
//             pickup.wasteReport.coordinates[0]
//         ];
//         bounds.push(pickupCoords);

//         // Create pickup marker
//         const pickupMarker = L.marker(pickupCoords, {
//             icon: L.divIcon({
//                 className: 'pickup-marker-icon',
//                 html: `<i class="fas fa-trash-alt" style="color: ${getMarkerColor(pickup.status)}; font-size: 24px;"></i>`,
//                 iconSize: [30, 30]
//             })
//         }).bindPopup(`
//             <b>Pickup: ${pickup.wasteReport.mlIdentifiedType}</b><br>
//             Weight: ${pickup.wasteReport.approximateWeight}kg<br>
//             Status: ${pickup.status}<br>
//             Reporter: ${pickup.wasteReport.reportedBy?.fullName || 'N/A'}
//         `).addTo(map);
//         pickupMarkers.push(pickupMarker);

//         // If there's a vendor and processing facility, add dropoff marker and route
//         if (pickup.vendor && pickup.vendor.processingFacilityLocation && pickup.vendor.processingFacilityLocation.coordinates) {
//             const dropoffCoords = [
//                 pickup.vendor.processingFacilityLocation.coordinates[1],
//                 pickup.vendor.processingFacilityLocation.coordinates[0]
//             ];
//             bounds.push(dropoffCoords);

//             const dropoffMarker = L.marker(dropoffCoords, {
//                 icon: L.divIcon({
//                     className: 'dropoff-marker-icon',
//                     html: '<i class="fas fa-industry" style="color: #2c3e50; font-size: 24px;"></i>',
//                     iconSize: [30, 30]
//                 })
//             }).bindPopup(`
//                 <b>Dropoff: ${pickup.vendor.companyName}</b><br>
//                 Method: ${pickup.vendor.processingMethod || 'N/A'}
//             `).addTo(map);
//             dropoffMarkers.push(dropoffMarker);

//             // Draw line between pickup and dropoff
//             L.polyline([pickupCoords, dropoffCoords], {
//                 color: getRouteColor(pickup.status),
//                 weight: 3,
//                 opacity: 0.7
//             }).addTo(map);
//         }
//     });

//     // Fit map to show all markers
//     if (bounds.length > 0) {
//         map.fitBounds(bounds, { padding: [50, 50] });
//     }
// }

// // Get marker color based on status
// function getMarkerColor(status) {
//     const colors = {
//         pending_vendor: '#e74c3c', // Red - initial request
//         accepted: '#f39c12', // Orange - accepted by vendor, awaiting collector
//         collected: '#3498db', // Blue - collected by collector
//         delivered: '#2ecc71', // Green - delivered to vendor
//         rejected: '#95a5a6', // Grey - rejected
//         expired: '#7f8c8d' // Dark Grey - expired
//     };
//     return colors[status] || '#e74c3c';
// }

// // Get route color based on status
// function getRouteColor(status) {
//     const colors = {
//         pending_vendor: '#e74c3c',
//         accepted: '#f39c12',
//         collected: '#3498db',
//         delivered: '#2ecc71',
//         rejected: '#95a5a6',
//         expired: '#7f8c8d'
//     };
//     return colors[status] || '#e74c3c';
// }

// // Start tracking user location
// function startLocationTracking() {
//     if (navigator.geolocation) {
//         watchId = navigator.geolocation.watchPosition(
//             position => {
//                 const { latitude, longitude } = position.coords;
//                 updateUserPosition(latitude, longitude);
//                 // Optionally send location to backend periodically
//                 // sendLocationToBackend(latitude, longitude);
//             },
//             error => {
//                 console.error('Location error:', error);
//                 showSnackbar('Location error: ' + error.message, 'error');
//             },
//             { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
//         );
//     } else {
//         showSnackbar('Geolocation not supported by your browser.', 'error');
//     }
// }

// // Update user position on map
// function updateUserPosition(lat, lng) {
//     if (userMarker) {
//         userMarker.setLatLng([lat, lng]);
//     } else {
//         userMarker = L.marker([lat, lng], {
//             icon: L.divIcon({
//                 className: 'user-marker',
//                 html: '<i class="fas fa-user-circle" style="color: #3498db; font-size: 28px;"></i>',
//                 iconSize: [30, 30],
//                 iconAnchor: [15, 15]
//             }),
//             zIndexOffset: 1000
//         }).bindPopup('Your Location').addTo(map);
//     }
//     // Optionally center map on user's location initially
//     // map.setView([lat, lng], 13);
// }

// // Locate user button handler
// function locateUser() {
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//             position => {
//                 const { latitude, longitude } = position.coords;
//                 updateUserPosition(latitude, longitude);
//                 map.setView([latitude, longitude], 15);
//                 showSnackbar('Location found', 'success');
//             },
//             error => {
//                 showSnackbar('Could not get location: ' + error.message, 'error');
//             }
//         );
//     }
// }

// // Navigate to external map (Google Maps)
// function navigateToExternalMap(lat, lng) {
//     window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
// }

// // --- Waste Details Overlay Functions ---

// // Function to show waste details
// async function showDetails(wasteId) {
//     showLoadingOverlay('Loading waste details...');
//     try {
//         // Fetch waste details from your backend API
//         const response = await fetch(`http://localhost:5000/api/v1/collector/waste/${wasteId}`, {
//             credentials: 'include'
//         });

//         if (!response.ok) {
//             throw new Error('Failed to fetch waste details');
//         }

//         const data = await response.json();
//         if (!data.success || !data.data) {
//             throw new Error(data.message || 'Invalid response data');
//         }
//         currentWasteDetails = data.data; // Store fetched data globally

//         updateWasteDetailsUI();
//         initDetailsMap(); // Initialize/update the mini map
//         document.getElementById('wasteDetailsOverlay').style.display = 'flex'; // Show the overlay
//     } catch (error) {
//         console.error('Error fetching waste details:', error);
//         showSnackbar('Failed to load waste details: ' + error.message, 'error');
//     } finally {
//         hideLoadingOverlay();
//     }
// }

// // Update the UI with waste details
// function updateWasteDetailsUI() {
//     if (!currentWasteDetails) return;

//     const waste = currentWasteDetails.wasteReport;
//     const resident = currentWasteDetails.resident;
//     const currentProcessing = currentWasteDetails.currentProcessing;

//     // Basic waste info
//     document.getElementById('detail-waste-id').textContent = waste._id.substring(0, 8) + '...';
//     document.getElementById('detail-waste-type').textContent =
//         `${waste.wasteType.mlIdentified} (Reported: ${waste.wasteType.userReported})`;
//     document.getElementById('detail-waste-weight').textContent = `${waste.weight} kg`;

//     // Status
//     const statusElement = document.getElementById('detail-waste-status');
//     statusElement.textContent = waste.status;
//     statusElement.className = 'status-badge ' + getStatusClass(waste.status);

//     // Dates
//     document.getElementById('detail-waste-date').textContent = new Date(waste.createdAt).toLocaleString();

//     // Resident info
//     document.getElementById('detail-resident-name').textContent = resident.name || 'N/A';
//     document.getElementById('detail-resident-contact').textContent = resident.contact || 'N/A';
//     document.getElementById('detail-resident-address').textContent = resident.address || 'N/A'; // Assuming address is a string or populated

//     // Location info
//     const pickupCoords = waste.location.coordinates; // [lng, lat]
//     document.getElementById('detail-pickup-location').textContent =
//         `Lat: ${pickupCoords[1].toFixed(4)}, Lng: ${pickupCoords[0].toFixed(4)}`;
    
//     let dropoffLocationText = 'N/A';
//     if (currentProcessing && currentProcessing.vendor && currentProcessing.vendor.companyName && currentProcessing.vendor.processingFacilityLocation) {
//         const dropoffCoords = currentProcessing.vendor.processingFacilityLocation; // [lng, lat]
//         dropoffLocationText = `${currentProcessing.vendor.companyName} (Lat: ${dropoffCoords[1].toFixed(4)}, Lng: ${dropoffCoords[0].toFixed(4)})`;
//     } else {
//         dropoffLocationText = 'Landfill (Default)'; // Or based on actual landfill coordinates
//     }
//     document.getElementById('detail-dropoff-location').textContent = dropoffLocationText;

//     // Update status buttons based on current status
//     updateStatusButtons(waste.status);

//     // Processing history
//     updateProcessingHistory(currentWasteDetails.processingHistory);
// }

// // Initialize the mini map in the overlay
// function initDetailsMap() {
//     if (!currentWasteDetails) return;

//     const waste = currentWasteDetails.wasteReport;
//     const currentProcessing = currentWasteDetails.currentProcessing;

//     // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
//     const pickupCoords = [waste.location.coordinates[1], waste.location.coordinates[0]];

//     let dropoffCoords = null;
//     if (currentProcessing && currentProcessing.vendor && currentProcessing.vendor.processingFacilityLocation) {
//         dropoffCoords = [currentProcessing.vendor.processingFacilityLocation[1], currentProcessing.vendor.processingFacilityLocation[0]];
//     } else {
//         // Fallback to a default landfill location if no vendor is assigned or location is missing
//         dropoffCoords = [26.8365, 75.8169]; // Example Landfill coordinates (lat, lng)
//     }

//     // Initialize map if not already done, or set new view
//     if (!detailsMap) {
//         detailsMap = L.map('wasteDetailsMap').setView(pickupCoords, 13);
//         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailsMap);
//     } else {
//         detailsMap.setView(pickupCoords, 13);
//         detailsMap.invalidateSize(); // Crucial if map div was hidden
//     }

//     // Clear existing markers and route
//     if (detailsPickupMarker) detailsMap.removeLayer(detailsPickupMarker);
//     if (detailsDropoffMarker) detailsMap.removeLayer(detailsDropoffMarker);
//     if (detailsRoute) detailsMap.removeLayer(detailsRoute);

//     // Add pickup marker
//     detailsPickupMarker = L.marker(pickupCoords, {
//         icon: L.divIcon({
//             className: 'pickup-marker-icon',
//             html: '<i class="fas fa-trash-alt" style="color: #e74c3c; font-size: 20px;"></i>',
//             iconSize: [25, 25]
//         })
//     })
//         .bindPopup('Pickup Location')
//         .addTo(detailsMap);

//     // Add dropoff marker
//     detailsDropoffMarker = L.marker(dropoffCoords, {
//         icon: L.divIcon({
//             className: 'dropoff-marker-icon',
//             html: '<i class="fas fa-industry" style="color: #2c3e50; font-size: 20px;"></i>',
//             iconSize: [25, 25]
//         })
//     })
//         .bindPopup(currentProcessing?.vendor?.companyName || 'Landfill')
//         .addTo(detailsMap);

//     // Draw route
//     detailsRoute = L.polyline([pickupCoords, dropoffCoords], {
//         color: getRouteColor(waste.status),
//         weight: 3,
//         opacity: 0.7
//     }).addTo(detailsMap);

//     // Fit map to show both points
//     detailsMap.fitBounds([pickupCoords, dropoffCoords], { padding: [20, 20] });
// }

// // Update processing history table
// function updateProcessingHistory(history) {
//     const tbody = document.getElementById('historyTableBody');
//     tbody.innerHTML = '';
//     if (history.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No processing history yet.</td></tr>';
//         return;
//     }
//     history.forEach(item => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td>${new Date(item.date).toLocaleString()}</td>
//             <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
//             <td>${item.collector?.name || 'N/A'}</td>
//             <td>${item.vendor?.companyName || 'N/A'}</td>
//         </tr>
//     `;
//         tbody.appendChild(row);
//     });
// }

// // Update status buttons based on current status
// function updateStatusButtons(currentStatus) {
//     const collectedBtn = document.getElementById('markCollectedBtn');
//     const deliveredBtn = document.getElementById('markDeliveredBtn');

//     collectedBtn.disabled = true;
//     deliveredBtn.disabled = true;

//     if (currentStatus === 'accepted') {
//         collectedBtn.disabled = false;
//     } else if (currentStatus === 'collected') {
//         deliveredBtn.disabled = false;
//     }
// }

// // Mark status change (collected or delivered)
// async function markStatusChange(requestId, newStatus) {
//     if (!currentWasteDetails) {
//         showSnackbar('No waste details loaded.', 'error');
//         return;
//     }

//     if (currentWasteDetails.currentProcessing?._id !== requestId) {
//         showSnackbar('Mismatch between current details and requested ID. Please refresh.', 'error');
//         return;
//     }

//     showLoadingOverlay(`Marking as ${newStatus}...`);
//     try {
//         const position = await new Promise((resolve, reject) => {
//             navigator.geolocation.getCurrentPosition(resolve, reject);
//         });

//         const longitude = position.coords.longitude;
//         const latitude = position.coords.latitude;

//         let apiEndpoint = '';
//         if (newStatus === 'collected') {
//             apiEndpoint = 'mark_as_collected';
//         } else if (newStatus === 'delivered') {
//             apiEndpoint = 'mark_as_delivered';
//         } else {
//             throw new Error('Invalid status update request.');
//         }

//         const response = await fetch(`http://localhost:5000/api/v1/collector/${apiEndpoint}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 requestId: requestId,
//                 currentLocation: [longitude, latitude] // [lng, lat]
//             }),
//             credentials: 'include'
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.message || `Failed to mark as ${newStatus}`);
//         }

//         showSnackbar(`Waste marked as ${newStatus} successfully!`, 'success');
//         document.getElementById('wasteDetailsOverlay').style.display = 'none'; // Close overlay
//         await loadData(); // Refresh main dashboard data
//     } catch (error) {
//         console.error(`Error marking as ${newStatus}:`, error);
//         showSnackbar(`Error: ${error.message}`, 'error');
//     } finally {
//         hideLoadingOverlay();
//     }
// }

// // Close the waste details overlay
// function closeWasteDetailsOverlay() {
//     document.getElementById('wasteDetailsOverlay').style.display = 'none';
// }

// // Setup event listeners for the waste details overlay
// function setupOverlayEventListeners() {
//     document.getElementById('closeWasteDetailsOverlay').addEventListener('click', closeWasteDetailsOverlay);
//     document.getElementById('navigatePickupBtn').addEventListener('click', () => {
//         if (currentWasteDetails && currentWasteDetails.wasteReport?.location?.coordinates) {
//             navigateToExternalMap(currentWasteDetails.wasteReport.location.coordinates[1], currentWasteDetails.wasteReport.location.coordinates[0]);
//         } else {
//             showSnackbar('Pickup location not available.', 'error');
//         }
//     });
//     document.getElementById('navigateDropoffBtn').addEventListener('click', () => {
//         if (currentWasteDetails && currentWasteDetails.currentProcessing?.vendor?.processingFacilityLocation) {
//             navigateToExternalMap(currentWasteDetails.currentProcessing.vendor.processingFacilityLocation[1], currentWasteDetails.currentProcessing.vendor.processingFacilityLocation[0]);
//         } else {
//             showSnackbar('Dropoff location not available.', 'error');
//         }
//     });

//     document.getElementById('markCollectedBtn').addEventListener('click', () => {
//         if (currentWasteDetails && currentWasteDetails.currentProcessing?._id) {
//             markStatusChange(currentWasteDetails.currentProcessing._id, 'collected');
//         }
//     });
//     document.getElementById('markDeliveredBtn').addEventListener('click', () => {
//         if (currentWasteDetails && currentWasteDetails.currentProcessing?._id) {
//             markStatusChange(currentWasteDetails.currentProcessing._id, 'delivered');
//         }
//     });

//     // Close overlay when clicking outside content
//     document.getElementById('wasteDetailsOverlay').addEventListener('click', (e) => {
//         if (e.target === document.getElementById('wasteDetailsOverlay')) {
//             closeWasteDetailsOverlay();
//         }
//     });
// }

// // --- Common UI Functions ---
// function showLoadingOverlay(message = 'Loading...') {
//     const overlay = document.getElementById('loadingOverlay');
//     if (overlay) {
//         overlay.style.display = 'flex';
//         overlay.querySelector('p').textContent = message;
//     }
// }

// function hideLoadingOverlay() {
//     const overlay = document.getElementById('loadingOverlay');
//     if (overlay) {
//         overlay.style.display = 'none';
//     }
// }

// async function logoutUser() {
//     try {
//         const response = await fetch('http://localhost:5000/api/v1/collector/logout', {
//             method: 'POST',
//             credentials: 'include'
//         });

//         if (response.ok) {
//             clearAuthCookies();
//             showSnackbar('Logged out successfully.', 'success');
//             setTimeout(() => { window.location.href = '/resident/login'; }, 1000); // Redirect to login
//         } else {
//             const errorData = await response.json();
//             throw new Error(errorData.message || 'Logout failed');
//         }
//     } catch (error) {
//         console.error('Logout error:', error);
//         showSnackbar(`Logout failed: ${error.message}`, 'error');
//         // Even if API logout fails, clear cookies and redirect for client-side logout
//         clearAuthCookies();
//         setTimeout(() => { window.location.href = '/resident/login'; }, 1000);
//     }
// }

// function clearAuthCookies() {
//     document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
//     document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
// }

// function showLoginPage() {
//     window.location.href = '/resident/login';
// }


document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let map;
    let userMarker;
    let pickupMarkers = L.layerGroup();
    let routePolylines = L.layerGroup();
    let pickupStatusChart;
    let allPickups = [];

    // --- DOM ELEMENTS ---
    const collectorNameEl = document.getElementById('collectorName');
    const totalAssignedEl = document.getElementById('totalAssigned');
    const pendingPickupsEl = document.getElementById('pendingPickups');
    const inTransitEl = document.getElementById('inTransit');
    const deliveredPickupsEl = document.getElementById('deliveredPickups');
    const taskListEl = document.getElementById('taskList');
    const modalEl = document.getElementById('detailsOverlay');
    const modalContentEl = document.getElementById('modalContent');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const locateMeBtn = document.getElementById('locateMeBtn');
    const refreshMapBtn = document.getElementById('refreshMapBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- INITIALIZATION ---
    async function init() {
        showLoading(true);
        initMap();
        initChart();
        setupEventListeners();
        await loadInitialData();
        startLocationTracking();
        showLoading(false);
    }

    async function loadInitialData() {
        try {
            const [profile, dashboardStats, pickups] = await Promise.all([
                fetchData('/api/v1/collector/me'),
                fetchData('/api/v1/collector/get_collector_dashboard'),
                fetchData('/api/v1/collector/get_assigned_pickups')
            ]);

            updateProfile(profile.user);
            updateDashboardStats(dashboardStats);
            allPickups = pickups;
            renderTaskList(pickups);
            updateChartData(dashboardStats);
            plotPickupsOnMap(pickups);

        } catch (error) {
            showSnackbar(`Initialization failed: ${error.message}`, 'error');
            if (error.message.includes("401") || error.message.includes("403")) {
                 setTimeout(() => window.location.href = '/resident/login', 2000);
            }
        }
    }

    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        locateMeBtn.addEventListener('click', locateUser);
        refreshMapBtn.addEventListener('click', loadInitialData);
        logoutBtn.addEventListener('click', logoutUser);
        closeModalBtn.addEventListener('click', () => modalEl.style.display = 'none');
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) modalEl.style.display = 'none';
        });
    }

    // --- API & DATA HANDLING ---
    async function fetchData(url, options = {}) {

    const response = await fetch(url, {
        credentials: 'include',   // keep cookies/session
        ...options                // forward method, headers, body
    });


    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: Failed to fetch ${url}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || `API error for ${url}`);
    }

    return result.data;
}


    // --- UI RENDERING & UPDATES ---
    function updateProfile(user) {
        collectorNameEl.textContent = user.fullName || 'Collector';
    }

    function updateDashboardStats(stats) {
        totalAssignedEl.textContent = stats.totalAssigned || 0;
        pendingPickupsEl.textContent = stats.pendingPickups || 0;
        inTransitEl.textContent = allPickups.filter(p => p.status === 'collected_from_bin').length;
        deliveredPickupsEl.textContent = stats.deliveredPickups || 0;
    }

    function renderTaskList(pickups) {
        taskListEl.innerHTML = '';
        if (pickups.length === 0) {
            taskListEl.innerHTML = '<p class="no-data">No assigned pickups found.</p>';
            return;
        }

        pickups.forEach(pickup => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.dataset.requestId = pickup.requestId;
            taskItem.innerHTML = `
                <div class="task-icon ${pickup.status === 'collected_from_bin' ? 'dropoff' : 'pickup'}">
                    <i class="fa-solid ${pickup.status === 'collected_from_bin' ? 'fa-industry' : 'fa-trash-can'}"></i>
                </div>
                <div class="task-info">
                    <strong>${pickup.status === 'collected_from_bin' ? 'Dropoff at' : 'Pickup from'} Bin ${pickup.bin.binId}</strong>
                    <p>${pickup.bin.wasteType} waste - Approx. ${pickup.bin.fillLevel.toFixed(0)}% full</p>
                </div>
                <span class="task-status status-${pickup.status}">${pickup.status.replace(/_/g, ' ')}</span>
            `;
            taskItem.addEventListener('click', () => {
                document.querySelectorAll('.task-item').forEach(item => item.classList.remove('active'));
                taskItem.classList.add('active');
                showDetailsModal(pickup.requestId);
                panToPickup(pickup.requestId);
            });
            taskListEl.appendChild(taskItem);
        });
    }

    // --- CHART.JS IMPLEMENTATION ---
    function initChart() {
        const ctx = document.getElementById('pickupStatusChart').getContext('2d');
        pickupStatusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'In Transit'],
                datasets: [{
                    label: 'Number of Pickups',
                    data: [0, 0],
                    backgroundColor: ['rgba(243, 156, 18, 0.7)', 'rgba(52, 152, 219, 0.7)'],
                    borderColor: ['#f39c12', '#3498db'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateChartData(stats) {
        const inTransitCount = allPickups.filter(p => p.status === 'collected_from_bin').length;
        pickupStatusChart.data.datasets[0].data = [stats.pendingPickups, inTransitCount];
        pickupStatusChart.update();
    }

    // --- MAP (LEAFLET.JS) IMPLEMENTATION ---
    function initMap() {
        map = L.map('collectionMap').setView([28.6139, 77.2090], 10); // Default to Delhi
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        pickupMarkers.addTo(map);
        routePolylines.addTo(map);
    }

    function plotPickupsOnMap(pickups) {
        pickupMarkers.clearLayers();
        routePolylines.clearLayers();

        pickups.forEach(pickup => {
            const pickupLatLng = [pickup.pickupLocation.coordinates[1], pickup.pickupLocation.coordinates[0]];
            const dropoffLatLng = [pickup.dropoffLocation.coordinates[1], pickup.dropoffLocation.coordinates[0]];

            // Pickup Marker
            L.marker(pickupLatLng, {
                icon: createIcon('fa-trash-can', '#e74c3c')
            }).bindPopup(`<b>Pickup: Bin ${pickup.bin.binId}</b>`).addTo(pickupMarkers);

            // Dropoff Marker
            L.marker(dropoffLatLng, {
                icon: createIcon('fa-industry', '#27ae60')
            }).bindPopup(`<b>Dropoff: ${pickup.vendor?.name || 'Landfill'}</b>`).addTo(pickupMarkers);

            // Route Line
            L.polyline([pickupLatLng, dropoffLatLng], {
                color: pickup.status === 'collected_from_bin' ? '#3498db' : '#b2bec3',
                weight: 3,
                dashArray: '5, 5'
            }).addTo(routePolylines);
        });
    }

    function createIcon(iconName, color) {
        return L.divIcon({
            html: `<i class="fa-solid ${iconName}" style="color: ${color}; font-size: 24px;"></i>`,
            className: 'map-marker-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }
    
    function panToPickup(requestId) {
        const pickup = allPickups.find(p => p.requestId === requestId);
        if (pickup) {
            const latLng = [pickup.pickupLocation.coordinates[1], pickup.pickupLocation.coordinates[0]];
            map.flyTo(latLng, 15);
        }
    }

    // --- GEOLOCATION ---
    function startLocationTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateUserPosition(latitude, longitude);
                },
                (error) => console.error('Geolocation error:', error),
                { enableHighAccuracy: true }
            );
        }
    }

    function updateUserPosition(lat, lng) {
        const latLng = [lat, lng];
        if (!userMarker) {
            userMarker = L.marker(latLng, {
                icon: createIcon('fa-user', '#3498db')
            }).bindPopup('Your Location').addTo(map);
        } else {
            userMarker.setLatLng(latLng);
        }
    }

    function locateUser() {
        if (userMarker) {
            map.flyTo(userMarker.getLatLng(), 16);
        } else {
            showSnackbar('Your location is not yet available.', 'info');
        }
    }

    // --- MODAL & ACTIONS ---
    function showDetailsModal(requestId) {
        const pickup = allPickups.find(p => p.requestId === requestId);
        if (!pickup) return;

        modalContentEl.innerHTML = `
            <div class="detail-group">
                <h3>Bin & Waste Info</h3>
                <div class="detail-row"><span class="detail-label">Bin ID:</span> <span>${pickup.bin.binId}</span></div>
                <div class="detail-row"><span class="detail-label">Waste Type:</span> <span>${pickup.bin.wasteType}</span></div>
                <div class="detail-row"><span class="detail-label">Fill Level:</span> <span>${pickup.bin.fillLevel.toFixed(0)}%</span></div>
            </div>
            <div class="detail-group">
                <h3>Pickup Location</h3>
                <div class="detail-row"><span class="detail-label">Address:</span> <span>${pickup.bin.representativeReport?.reporter?.address || 'N/A'}</span></div>
            </div>
            <div class="detail-group">
                <h3>Dropoff Destination</h3>
                <div class="detail-row"><span class="detail-label">Facility:</span> <span>${pickup.vendor?.name || 'Landfill'}</span></div>
                <div class="detail-row"><span class="detail-label">Address:</span> <span>${pickup.vendor?.address || 'N/A'}</span></div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn btn-navigate" id="navigateBtn"><i class="fa-solid fa-diamond-turn-right"></i> Navigate</button>
                <button class="modal-btn btn-collect" id="collectBtn" ${pickup.status !== 'collector_assigned' ? 'disabled' : ''}><i class="fa-solid fa-check"></i> Mark Collected</button>
                <button class="modal-btn btn-deliver" id="deliverBtn" ${pickup.status !== 'collected_from_bin' ? 'disabled' : ''}><i class="fa-solid fa-truck"></i> Mark Delivered</button>
            </div>
        `;
        modalEl.style.display = 'flex';

        // Add event listeners for modal buttons
        document.getElementById('navigateBtn').onclick = () => {
            const loc = pickup.status === 'collected_from_bin' ? pickup.dropoffLocation : pickup.pickupLocation;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.coordinates[1]},${loc.coordinates[0]}`, '_blank');
        };
        document.getElementById('collectBtn').onclick = () => handleStatusUpdate(requestId, 'collected_from_bin');
        document.getElementById('deliverBtn').onclick = () => handleStatusUpdate(requestId, 'delivered_to_vendor');
    }

    async function handleStatusUpdate(requestId, newStatus) {
        if (!confirm(`Are you sure you want to mark this pickup as "${newStatus.replace(/_/g, ' ')}"?`)) return;

        showLoading(true, `Updating status...`);
        try {
            const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }));
            const { latitude, longitude } = position.coords;

            const endpoint = newStatus === 'collected_from_bin' ? '/api/v1/collector/mark_as_collected' : '/api/v1/collector/mark_as_delivered';
            await fetchData(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: requestId,
                    currentLocation: [longitude, latitude]
                })
            })

            showSnackbar('Status updated successfully!', 'success');
            modalEl.style.display = 'none';
            await loadInitialData();

        } catch (error) {
            showSnackbar(`Update failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    // --- UTILITIES ---
    function showSnackbar(message, type = 'info') {
        const snackbar = document.getElementById('snackbar');
        snackbar.textContent = message;
        snackbar.className = `show ${type}`;
        setTimeout(() => snackbar.className = snackbar.className.replace('show', ''), 3000);
    }

    function showLoading(isLoading, message = '') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = isLoading ? 'flex' : 'none';
    }

    function logoutUser() {
        fetch('/api/v1/collector/logout', { method: 'POST', credentials: 'include' })
            .finally(() => {
                document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.href = '/resident/login';
            });
    }

    // --- START ---
    init();
});
