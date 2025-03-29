document.addEventListener('DOMContentLoaded', function() {
    // Mock data - replace with actual API call
    const mockResponse = {
      "statusCode": 200,
      "data": [
        {
          "coordinates": {
            "type": "Point",
            "coordinates": [75.923173, 26.933167]
          },
          "_id": "67e7f7b35965c1f748b75e3e",
          "reportedBy": {
            "_id": "67e515627ce99684f6fb0665",
            "fullName": "pawan Kumar",
            "phoneNo": "934923982"
          },
          "photoUrl": [
            "http://res.cloudinary.com/doqoexuer/image/upload/v1743255474/knbpxv7d2oxhehetym5h.jpg"
          ],
          "status": "useful",
          "createdAt": "2025-03-29T13:37:55.012Z",
          "__v": 0,
          "mlIdentifiedType": "plastic",
          "userReportedType": "plastic"
        }
      ],
      "message": "Available waste reports fetched successfully",
      "success": true
    };
  
    // DOM elements
    const reportsGrid = document.getElementById('reportsGrid');
    const totalReportsEl = document.getElementById('totalReports');
    const selectedCountEl = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const collectSelectedBtn = document.getElementById('collectSelectedBtn');
    const wasteTypeFilter = document.getElementById('wasteTypeFilter');
    const refreshBtn = document.getElementById('refreshBtn');
  
    let selectedReports = [];
    let allReports = [];
  
    // Initialize dashboard
    function initDashboard() {
      fetchAvailableWaste();
    }
  
    // Fetch available waste reports
    function fetchAvailableWaste() {
    //   In real implementation, this would be an API call:
      fetch('http://localhost:5000/api/v1/vendor/get_available_waste',)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            allReports = data.data;
            renderReports(allReports);
          }
        });
      
      // For demo, using mock data:
    //   allReports = mockResponse.data;
    //   renderReports(allReports);
    }
  
    // Render reports to the grid
    function renderReports(reports) {
      reportsGrid.innerHTML = '';
      totalReportsEl.textContent = reports.length;
      selectedReports = [];
      updateSelectedCount();
  
      if (reports.length === 0) {
        reportsGrid.innerHTML = '<div class="no-reports">No waste reports available</div>';
        return;
      }
  
      reports.forEach(report => {
        const reportCard = document.createElement('div');
        reportCard.className = 'waste-report-card';
        reportCard.dataset.id = report._id;
        reportCard.dataset.type = report.userReportedType;
  
        const reportDate = new Date(report.createdAt);
        const formattedDate = reportDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  
        reportCard.innerHTML = `
          <input type="checkbox" class="select-checkbox" id="select-${report._id}">
          <img src="${report.photoUrl[0]}" alt="Waste photo" class="report-image" onclick="enlargeImage('${report.photoUrl[0]}')">
          <div class="report-details">
            <div class="report-header">
              <span class="report-type">${report.userReportedType}</span>
              <span class="report-status">${report.status}</span>
            </div>
            <div class="report-meta">
              <div class="report-meta-item">
                <i class="fas fa-weight-hanging"></i>
                <span>Identified as: ${report.mlIdentifiedType}</span>
              </div>
              <div class="report-meta-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${report.coordinates.coordinates[1].toFixed(6)}, ${report.coordinates.coordinates[0].toFixed(6)}</span>
              </div>
            </div>
            <div class="reporter-info">
              <i class="fas fa-user"></i>
              <span>${report.reportedBy.fullName}</span>
              <i class="fas fa-phone" style="margin-left: 10px;"></i>
              <span>${report.reportedBy.phoneNo}</span>
            </div>
            <div class="report-date">Reported on ${formattedDate}</div>
          </div>
        `;
  
        const checkbox = reportCard.querySelector('.select-checkbox');
        checkbox.addEventListener('change', function() {
          if (this.checked) {
            selectedReports.push(report._id);
          } else {
            selectedReports = selectedReports.filter(id => id !== report._id);
          }
          updateSelectedCount();
        });
  
        reportsGrid.appendChild(reportCard);
      });
    }
  
    // Update selected count display
    function updateSelectedCount() {
      selectedCountEl.textContent = selectedReports.length;
      collectSelectedBtn.disabled = selectedReports.length === 0;
    }
  
    // Select all reports
    selectAllBtn.addEventListener('click', function() {
      const checkboxes = document.querySelectorAll('.select-checkbox');
      if (selectedReports.length === allReports.length) {
        // Deselect all
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        selectedReports = [];
      } else {
        // Select all
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
          const reportId = checkbox.id.replace('select-', '');
          if (!selectedReports.includes(reportId)) {
            selectedReports.push(reportId);
          }
        });
      }
      updateSelectedCount();
    });
  
    // Collect selected reports
    collectSelectedBtn.addEventListener('click', function() {
      if (selectedReports.length === 0) return;
      
      // In real implementation, this would call your API:
      // fetch('/api/vendor/collect_waste', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer ' + localStorage.getItem('token')
      //   },
      //   body: JSON.stringify({ reportIds: selectedReports })
      // })
      // .then(response => response.json())
      // .then(data => {
      //   if (data.success) {
      //     alert('Selected waste marked as collected!');
      //     fetchAvailableWaste();
      //   }
      // });
      
      alert(`Marking ${selectedReports.length} waste reports as collected...`);
      // Simulate API call
      setTimeout(() => {
        fetchAvailableWaste();
      }, 1000);
    });
  
    // Filter by waste type
    wasteTypeFilter.addEventListener('change', function() {
      const type = this.value;
      if (type === 'all') {
        renderReports(allReports);
      } else {
        const filtered = allReports.filter(report => report.userReportedType === type);
        renderReports(filtered);
      }
    });
  
    // Refresh button
    refreshBtn.addEventListener('click', fetchAvailableWaste);
  
    // Initialize the dashboard
    initDashboard();
  });



  

async function logoutUser() {
    try {
        await fetch(`http://localhost:5000/api/v1/vendor/logout`, {
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


function enlargeImage(src) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.onclick = () => document.body.removeChild(modal);

    const img = document.createElement('img');
    img.src = src;
    img.classList.add('enlarged-image');

    modal.appendChild(img);
    document.body.appendChild(modal);
}