// Updated sample data with correct Jaipur locations (latitude, longitude order)
    const dashboardData = {
      "statusCode": 200,
      "data": {
        "totalAssigned": 1,
        "pendingPickups": 0,
        "completedPickups": 1,
        "recentPickups": [
          {
            "_id": "67e52054ea5dc6d77a2d6236",
            "wasteReport": {
              "_id": "67e51c4f8df6017b99a2adbb",
              "userReportedType": "metal",
              "mlIdentifiedType": "metal",
              "approximateWeight": 13,
              "coordinates": {
                "coordinates": [26.9124, 75.7873] // Jaipur City (latitude, longitude)
              },
              "assignedZone": "Jaipur City"
            },
            "vendor": {
              "_id": "67e51b1d08b896f5a737370d",
              "companyName": "Jaipur Waste Processing Facility",
              "address": "Jawahar Lal Nehru Marg, Jaipur",
              "processingFacilityLocation": {
                "coordinates": [26.8638, 75.8169] // Jaipur facility (latitude, longitude)
              }
            },
            "status": "completed",
            "createdAt": "2025-03-27T09:54:28.228Z"
          },
          {
            "_id": "67e52054ea5dc6d77a2d6236",
            "wasteReport": {
              "_id": "67e51c4f8df6017b99a2adbb",
              "userReportedType": "metal",
              "mlIdentifiedType": "metal",
              "approximateWeight": 13,
              "coordinates": {
                "coordinates": [26.9124, 75.7873] // Jaipur City (latitude, longitude)
              },
              "assignedZone": "Jaipur City"
            },
            "vendor": {
              "_id": "67e51b1d08b896f5a737370d",
              "companyName": "Jaipur Waste Processing Facility",
              "address": "Jawahar Lal Nehru Marg, Jaipur",
              "processingFacilityLocation": {
                "coordinates": [26.8638, 75.8169] // Jaipur facility (latitude, longitude)
              }
            },
            "status": "pending",
            "createdAt": "2025-03-30T09:54:28.228Z"
          }
        ]
      },
      "message": "Dashboard data fetched successfully",
      "success": true
    };

    // Map variables
    let map;
    let userMarker;
    let pickupMarker;
    let dropoffMarker;
    let watchId;
    let currentPickupLocation = [26.9124, 75.7873]; // Jaipur City (latitude, longitude)
    let currentDropoffLocation = [26.8638, 75.8169]; // Jaipur facility (latitude, longitude)

    document.addEventListener('DOMContentLoaded', function() {
      initDashboard();
      initMap();
      setupEventListeners();
    });

    function initDashboard() {
      document.getElementById('totalAssigned').textContent = dashboardData.data.totalAssigned;
      document.getElementById('pendingPickups').textContent = dashboardData.data.pendingPickups;
      document.getElementById('completedPickups').textContent = dashboardData.data.completedPickups;
    }

    function initMap() {
      // Initialize map centered between pickup and dropoff locations
      map = L.map('collectionMap').setView([26.8881, 75.8021], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add pickup location marker (Jaipur City)
      pickupMarker = L.marker([26.9124, 75.7873], {
        icon: L.divIcon({
          className: 'pickup-marker',
          html: '<i class="fas fa-trash" style="color: #e74c3c; font-size: 24px;"></i>',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      }).addTo(map)
        .bindPopup('<b>Pickup Location</b><br>Jaipur City<br>Waste Type: Metal');

      // Add dropoff location marker (Jaipur Waste Facility)
      dropoffMarker = L.marker([26.8638, 75.8169], {
        icon: L.divIcon({
          className: 'dropoff-marker',
          html: '<i class="fas fa-industry" style="color: #2c3e50; font-size: 24px;"></i>',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      }).addTo(map)
        .bindPopup('<b>Dropoff Location</b><br>Jaipur Waste Processing Facility<br>Jawahar Lal Nehru Marg');

      // Add a line connecting the points
      L.polyline([
        [26.9124, 75.7873], // Pickup
        [26.8638, 75.8169]  // Dropoff
      ], {
        color: '#3498db',
        weight: 3,
        dashArray: '5, 5'
      }).addTo(map);

      locateUser();
    }

    function locateUser() {
      if (navigator.geolocation) {
        if (watchId) navigator.geolocation.clearWatch(watchId);

        watchId = navigator.geolocation.watchPosition(
          position => {
            const { latitude, longitude } = position.coords;
            
            if (userMarker) {
              userMarker.setLatLng([latitude, longitude]);
            } else {
              userMarker = L.marker([latitude, longitude], {
                icon: L.divIcon({
                  className: 'user-marker',
                  html: '<i class="fas fa-user" style="color: #3498db; font-size: 24px;"></i>',
                  iconSize: [30, 30],
                  iconAnchor: [15, 30]
                })
              }).addTo(map).bindPopup('Your Current Location');
            }
            
            map.setView([latitude, longitude], 13);
            document.getElementById('latitude').value = latitude.toFixed(6);
            document.getElementById('longitude').value = longitude.toFixed(6);
          },
          error => {
            console.error('Error getting location:', error);
            alert('Could not get your location. Please enable location services.');
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    }

    function setupEventListeners() {
      document.getElementById('locateMeBtn').addEventListener('click', locateUser);
      document.getElementById('refreshMapBtn').addEventListener('click', () => map.invalidateSize());
      document.getElementById('closeOverlay').addEventListener('click', () => {
        document.getElementById('statusOverlay').style.display = 'none';
      });
      
      // Navigation buttons with proper coordinate order
      document.getElementById('navigateToDropoffBtn').addEventListener('click', () => {
        const [lat, lng] = currentDropoffLocation;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
      });
      
      document.getElementById('navigateToPickupBtn').addEventListener('click', () => {
        const [lat, lng] = currentPickupLocation;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
      });
      
      document.getElementById('statusForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const requestId = document.getElementById('requestId').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        
        console.log('Marking as collected:', { requestId, currentLocation: [parseFloat(latitude), parseFloat(longitude)] });
        alert('Status updated successfully! (Demo)');
        document.getElementById('statusOverlay').style.display = 'none';
      });
    }

    function openStatusOverlay(requestId) {
      const report = dashboardData.data.recentPickups.find(r => r._id === requestId);
      
      if (report) {
        document.getElementById('requestIdDisplay').textContent = report._id;
        document.getElementById('requestId').value = report._id;
        
        currentPickupLocation = [
          report.wasteReport.coordinates.coordinates[0],
          report.wasteReport.coordinates.coordinates[1]
        ];
        
        currentDropoffLocation = [
          report.vendor.processingFacilityLocation.coordinates[0],
          report.vendor.processingFacilityLocation.coordinates[1]
        ];

        // Update map markers when opening overlay
        pickupMarker.setLatLng(currentPickupLocation)
          .setPopupContent(`<b>Pickup Location</b><br>${report.wasteReport.assignedZone}<br>Waste Type: ${report.wasteReport.mlIdentifiedType}`);
        
        dropoffMarker.setLatLng(currentDropoffLocation)
          .setPopupContent(`<b>Dropoff Location</b><br>${report.vendor.companyName}<br>${report.vendor.address}`);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
            document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
          });
        }
        
        document.getElementById('statusOverlay').style.display = 'flex';
      }
    }

    window.addEventListener('beforeunload', function() {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    });