document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & CONFIG ---
    let wasteTypeChart;
    let selectedBinIds = new Set();
    let allAvailableBins = [];
    let allDashboardData = {};
    const API_BASE_URL = '/api/v1/vendor';
    const WASTE_TYPES = ["E-waste", "automobile wastes", "battery waste", "glass waste", "light bulbs", "metal waste", "organic waste", "paper waste", "plastic waste"];

    // --- DOM ELEMENT CACHE ---
    const cache = {
        vendorName: document.getElementById('vendorName'),
        stats: {
            co2: document.getElementById('totalCo2Reduced'),
            energy: document.getElementById('totalEnergyProduced'),
            processed: document.getElementById('totalWasteProcessed'),
            available: document.getElementById('totalAvailableBins')
        },
        binsGrid: document.getElementById('binsGrid'),
        awaitingProcessingList: document.getElementById('awaitingProcessingList'),
        wasteTypeFilter: document.getElementById('wasteTypeFilter'),
        selectAllBtn: document.getElementById('selectAllBtn'),
        requestSelectedBtn: document.getElementById('requestSelectedBtn'),
        selectedCount: document.getElementById('selectedCount'),
        detailsOverlay: document.getElementById('detailsOverlay'),
        detailsModalContent: document.getElementById('detailsModalContent'),
        closeDetailsModal: document.getElementById('closeDetailsModal'),
        processOverlay: document.getElementById('processOverlay'),
        processForm: document.getElementById('processForm'),
        processRequestId: document.getElementById('processRequestId'),
        closeProcessModal: document.getElementById('closeProcessModal'),
        logoutBtn: document.getElementById('logoutBtn'),
        requestedDeliveriesList: document.getElementById('requestedDeliveriesList'),
        processedDeliveriesList: document.getElementById('processedDeliveriesList'),
    };

    // --- INITIALIZATION ---
    async function init() {
        showLoading(true);
        populateWasteTypeFilter();
        initChart();
        setupEventListeners();
        await loadInitialData();
        showLoading(false);
    }

    async function loadInitialData() {
        showLoading(true);
        try {
            const [dashboardData, availableBins] = await Promise.all([
                fetchData(`${API_BASE_URL}/get_vendor_dashboard`),
                fetchData(`${API_BASE_URL}/get_available_waste`)
            ]);

            allDashboardData = dashboardData;
            allAvailableBins = availableBins;

            updateUI();

        } catch (error) {
            handleApiError(error);
        } finally {
            showLoading(false);
        }
    }

   function updateUI() {
    cache.vendorName.textContent = allDashboardData.companyName || 'Vendor';
    updateDashboardStats(allDashboardData);
    updateChart(allDashboardData);
    renderAwaitingProcessing(allDashboardData.recentRequests || []);
    renderBins(allAvailableBins);
    
    // Enhanced delivery rendering
    const requests = allDashboardData.recentRequests || [];
    const requestedDeliveries = requests.filter(req => req.status === 'requested_by_vendor');
    const deliveredDeliveries = requests.filter(req => req.status === 'delivered_to_vendor');
    const processedDeliveries = requests.filter(req => req.status === 'processed_by_vendor');
    
    renderDeliveryList(cache.requestedDeliveriesList, requestedDeliveries, 'requested');
    renderDeliveryList(cache.awaitingProcessingList, deliveredDeliveries, 'delivered');
    renderDeliveryList(cache.processedDeliveriesList, processedDeliveries, 'processed');
    
    updateSelectionUI();
}
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', loadInitialData);
        cache.wasteTypeFilter.addEventListener('change', () => renderBins(allAvailableBins));
        cache.selectAllBtn.addEventListener('click', toggleSelectAll);
        cache.requestSelectedBtn.addEventListener('click', requestSelectedBins);
        cache.closeDetailsModal.addEventListener('click', () => cache.detailsOverlay.style.display = 'none');
        cache.closeProcessModal.addEventListener('click', () => cache.processOverlay.style.display = 'none');
        cache.processForm.addEventListener('submit', handleProcessFormSubmit);
        cache.logoutBtn.addEventListener('click', logoutUser);

    }

    // --- API & DATA HANDLING ---
    async function fetchData(url, options = {}) {
        const response = await fetch(url, { credentials: 'include', ...options });
        const result = await response.json();
        if (!response.ok) return next( new ApiError(result.message || `HTTP error ${response.status}`));


        if (!result.success) return next( new ApiError(result.message || 'API error'));


        return result.data;
    }

    function handleApiError(error) {
        console.error('API Error:', error);
        showSnackbar(error.message, 'error');
        if (error.message.includes("401") || error.message.includes("403")) {
            setTimeout(() => window.location.href = '/resident/login', 2000);
        }
    }

    // --- UI RENDERING ---
    function updateDashboardStats(data) {
        cache.stats.co2.textContent = `${Math.round(data.co2Reduced) || 0} kg`;
        cache.stats.energy.textContent = `${Math.round(data.energyProduced) || 0} kWh`;
        cache.stats.processed.textContent = `${Math.round(data.wasteProcessed) || 0} kg`;
    }

    function populateWasteTypeFilter() {
        WASTE_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            cache.wasteTypeFilter.appendChild(option);
        });
    }

    function renderBins(bins) {
        const filterValue = cache.wasteTypeFilter.value;
        const filteredBins = filterValue === 'all'
            ? bins
            : bins.filter(bin => bin.currentWasteComposition && bin.currentWasteComposition[filterValue]);

        cache.binsGrid.innerHTML = '';
        cache.stats.available.textContent = filteredBins.length;

        if (filteredBins.length === 0) {
            cache.binsGrid.innerHTML = '<p class="no-data">No available bins match your criteria.</p>';
            return;
        }

        filteredBins.forEach(bin => {
            const totalWeight = Object.values(bin.currentWasteComposition || {}).reduce((a, b) => a + b, 0);
            const photoUrl = bin.assignedReports?.[0]?.photoUrl?.[0] || 'https://placehold.co/300x150/EAECEE/566573?text=Bin';

            const card = document.createElement('div');
            card.className = 'bin-card';
            card.dataset.binId = bin._id;
            card.innerHTML = `
                <img src="${photoUrl}" alt="Bin photo" class="bin-card-image">
                <input type="checkbox" class="select-checkbox" data-bin-id="${bin._id}">
                <div class="bin-card-content">
                    <div class="bin-card-header">
                        <span class="bin-card-title">Bin ${bin.binId}</span>
                        <span class="bin-card-status">${Math.round(bin.fillLevel)}% Full</span>
                    </div>
                    <div class="bin-card-meta">
                        <span><i class="fa-solid fa-weight-hanging"></i> ${totalWeight.toFixed(1)} kg</span>
                        <span><i class="fa-solid fa-file-alt"></i> ${bin.assignedReports?.length || 0} reports</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') showDetailsModal(bin._id);
            });
            card.querySelector('.select-checkbox').addEventListener('change', handleSelectionChange);
            cache.binsGrid.appendChild(card);
        });

    }


    function renderDeliveries() {
        const requests = allDashboardData.recentRequests || [];

        // Requested deliveries (status: requested_by_vendor)
        const requestedDeliveries = requests.filter(req => req.status === 'requested_by_vendor');
        renderDeliveryList(cache.requestedDeliveriesList, requestedDeliveries, 'requested');

        // Processed deliveries (status: processed_by_vendor)
        const processedDeliveries = requests.filter(req => req.status === 'processed_by_vendor');
        renderDeliveryList(cache.processedDeliveriesList, processedDeliveries, 'processed');
    }

    async function renderDeliveryList(container, deliveries, type) {
    container.innerHTML = '';

    if (deliveries.length === 0) {
        container.innerHTML = '<p class="no-data">No deliveries found</p>';
        return;
    }

    for (const delivery of deliveries) {
        console.log("delivery: ", delivery)
        const item = document.createElement('div');
        item.className = 'delivery-item';
        item.dataset.requestId = delivery._id;

        const statusClass = type === 'requested' ? 'status-requested' : 
                          type === 'delivered' ? 'status-delivered' : 'status-processed';
                          
        const statusText = type === 'requested' ? 'Requested' : 
                         type === 'delivered' ? 'Delivered' : 'Processed';

        item.innerHTML = `
            <div class="delivery-item-header">
                <div class="delivery-item-title">
                    <i class="fa-solid ${type === 'processed' ? 'fa-check-circle' : 'fa-truck'}"></i>
                    ${delivery.binId || 'N/A'} (${delivery.requestedWasteType || 'N/A'})
                </div>
                <span class="delivery-item-status ${statusClass}">${statusText}</span>
            </div>
            <div class="delivery-item-meta">
                <span>${new Date(delivery.createdAt).toLocaleDateString()}</span>
                <span>${delivery.requestedWasteWeight || 0} kg</span>
            </div>
            <div class="delivery-details" id="details-${delivery._id}">
                <div class="loading-details">Loading details...</div>
            </div>
        `;

        // Add click handler
        item.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
            
            item.classList.toggle('active');
            
            if (item.classList.contains('active')) {
                const detailsDiv = item.querySelector(`#details-${delivery._id}`);
                if (detailsDiv.innerHTML.includes('Loading details') || 
                    detailsDiv.innerHTML.includes('Failed to load')) {
                    try {
                        // Use the correct API endpoint here
                        const data = await fetchData(`${API_BASE_URL}/processing-request/${delivery._id}`);
                        detailsDiv.innerHTML = formatDeliveryDetails(data);
                    } catch (error) {
                        detailsDiv.innerHTML = '<p class="error">Failed to load details</p>';
                        console.error('Error loading delivery details:', error);
                    }
                }
            }
        });

        container.appendChild(item);
    }
}

    function formatDeliveryDetails(data) {
    const delivery = data.data || data; // Handle both direct response and nested data
    const bin = delivery.bin || {};
    const collector = delivery.collector || {};
    const vendor = delivery.vendor || {};
    
    const collectionDetails = delivery.collectionDetails || {};
    const deliveryDetails = delivery.deliveryDetails || {};
    const processingDetails = delivery.processingDetails || {};
    
    const collectionDate = collectionDetails.timestamp ? 
        new Date(collectionDetails.timestamp).toLocaleString() : 'N/A';
    const deliveryDate = deliveryDetails.timestamp ? 
        new Date(deliveryDetails.timestamp).toLocaleString() : 'N/A';
    const processingDate = processingDetails.timestamp ? 
        new Date(processingDetails.timestamp).toLocaleString() : 'N/A';
    
    let wasteComposition = '';
    if (bin.currentWasteComposition) {
        wasteComposition = Object.entries(bin.currentWasteComposition)
            .map(([type, weight]) => `<div class="delivery-detail-row">
                <span>${type}</span>
                <span>${weight} kg</span>
            </div>`)
            .join('');
    }
    
    let processingInfo = '';
    if (delivery.status === 'processed_by_vendor') {
        processingInfo = `
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Processing Date:</span>
                <span>${processingDate}</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Energy Generated:</span>
                <span>${processingDetails.energyGenerated || 0} kWh</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">CO₂ Reduced:</span>
                <span>${processingDetails.co2Reduced || 0} kg</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Processing Method:</span>
                <span>${processingDetails.processingMethod || 'N/A'}</span>
            </div>
        `;
    }
    
    return `
        <div class="delivery-detail-group">
            <h4>Request Information</h4>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Request ID:</span>
                <span>${delivery._id}</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Status:</span>
                <span class="delivery-status ${delivery.status.replace(/_/g, '-')}">
                    ${delivery.status.replace(/_/g, ' ')}
                </span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Created At:</span>
                <span>${new Date(delivery.createdAt).toLocaleString()}</span>
            </div>
        </div>
        
        <div class="delivery-detail-group">
            <h4>Bin Information</h4>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Bin ID:</span>
                <span>${bin.binId || 'N/A'}</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Location:</span>
                <span>${bin.location?.coordinates ? bin.location.coordinates.join(', ') : 'N/A'}</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Fill Level:</span>
                <span>${bin.fillLevel || 0}%</span>
            </div>
        </div>
        
        <div class="delivery-detail-group">
            <h4>Collection Information</h4>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Collector:</span>
                <span>${collector.fullName || 'N/A'} (${collector.employeeId || 'N/A'})</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Vehicle:</span>
                <span>${collector.vehicleNo || 'N/A'} (${collector.vehicleType || 'N/A'})</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Collection Date:</span>
                <span>${collectionDate}</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Delivery Date:</span>
                <span>${deliveryDate}</span>
            </div>
        </div>
        
        <div class="delivery-detail-group">
            <h4>Waste Information</h4>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Total Weight:</span>
                <span>${delivery.requestedWasteWeight || 0} kg</span>
            </div>
            <div class="delivery-detail-row">
                <span class="delivery-detail-label">Waste Type:</span>
                <span>${delivery.requestedWasteType || 'Mixed'}</span>
            </div>
            <h5 style="margin-top: 8px;">Waste Composition:</h5>
            ${wasteComposition || '<p>No composition data</p>'}
        </div>
        
        ${processingInfo}
    `;
}


    function renderAwaitingProcessing(requests) {
        const deliveredRequests = requests.filter(req => req.status === 'delivered_to_vendor');
        cache.awaitingProcessingList.innerHTML = '';

        if (deliveredRequests.length === 0) {
            cache.awaitingProcessingList.innerHTML = '<p class="no-data" style="padding: 10px 0;">None</p>';
            return;
        }

        deliveredRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'processing-item';
            // The bin might not be populated in the dashboard data, so we need to handle that.
            const binId = req.bin?._id;
            if (binId) {
                // Set a data attribute to find it later if needed.
                item.dataset.binId = binId;
                // Add click listener to the entire item to show details.
                item.addEventListener('click', () => showDetailsModal(binId));
            }

            item.innerHTML = `
            <div>
                <strong>Request: ${req._id.substring(0, 8)}...</strong>
                <small style="display: block;">Bin: ${req.bin?.binId || 'N/A'}</small>
            </div>
            <button class="btn-process" data-request-id="${req._id}"><i class="fa-solid fa-check"></i> Process</button>
        `;

            // Add a separate listener for the button.
            const processButton = item.querySelector('.btn-process');
            processButton.addEventListener('click', (e) => {
                // Stop the click from bubbling up to the parent div, which would open the details modal.
                e.stopPropagation();
                showProcessModal(req._id);
            });

            cache.awaitingProcessingList.appendChild(item);
        });
    }

    // --- CHART LOGIC ---
    function initChart() {
        const ctx = document.getElementById('wasteTypeChart').getContext('2d');
        wasteTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#2E7D32', '#F1C40F', '#3498DB', '#E74C3C', '#8E44AD', '#2C3E50', '#16A085', '#D35400'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15 } } } }
        });
    }

    function updateChart(data) {
        const wasteComposition = {};
        data.recentRequests.forEach(req => {
            if (req.status === 'processed_by_vendor' && req.requestedWasteType) {
                wasteComposition[req.requestedWasteType] = (wasteComposition[req.requestedWasteType] || 0) + (req.requestedWasteWeight || 0);
            }
        });
        wasteTypeChart.data.labels = Object.keys(wasteComposition);
        wasteTypeChart.data.datasets[0].data = Object.values(wasteComposition);
        wasteTypeChart.update();
    }

    // --- ACTIONS & SELECTION ---
    function handleSelectionChange(e) {
        const binId = e.target.dataset.binId;
        if (e.target.checked) selectedBinIds.add(binId);
        else selectedBinIds.delete(binId);
        updateSelectionUI();
    }

    function toggleSelectAll() {
        const checkboxes = cache.binsGrid.querySelectorAll('.select-checkbox');
        const shouldSelectAll = selectedBinIds.size < checkboxes.length;
        checkboxes.forEach(cb => {
            cb.checked = shouldSelectAll;
            const binId = cb.dataset.binId;
            if (shouldSelectAll) selectedBinIds.add(binId);
            else selectedBinIds.delete(binId);
        });
        updateSelectionUI();
    }

    function updateSelectionUI() {
        const count = selectedBinIds.size;
        cache.selectedCount.textContent = count;
        cache.requestSelectedBtn.disabled = count === 0;
        cache.binsGrid.querySelectorAll('.bin-card').forEach(card => {
            card.classList.toggle('selected', selectedBinIds.has(card.dataset.binId));
        });
    }

    async function requestSelectedBins() {
        if (selectedBinIds.size === 0) return;
        if (!confirm(`Request collection for ${selectedBinIds.size} bin(s)?`)) return;

        showLoading(true);
        try {
            await fetchData(`${API_BASE_URL}/request_waste_collection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ binIds: Array.from(selectedBinIds) }),
            });
            showSnackbar('Bins successfully requested!', 'success');
            selectedBinIds.clear();
            await loadInitialData();
        } catch (error) {
            handleApiError(error);
        } finally {
            showLoading(false);
        }
    }

    async function rejectBinRequest(requestId) {
        if (!confirm(`Are you sure you want to reject this request? This may make the bin available to other vendors.`)) return;

        showLoading(true);
        try {
            await fetchData(`${API_BASE_URL}/reject_waste_request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: requestId }),
            });
            showSnackbar('Request rejected.', 'success');
            cache.detailsOverlay.style.display = 'none';
            await loadInitialData();
        } catch (error) {
            handleApiError(error);
        } finally {
            showLoading(false);
        }
    }

    // --- MODAL LOGIC ---
    async function showDetailsModal(binId) {
        showLoading(true);
        try {
            const data = await fetchData(`${API_BASE_URL}/view_garbage_details/${binId}`);
            const bin = data.bin;
            const reportsHTML = bin.assignedReports.map(r => `
                <div class="detail-row">
                    <span>${r.mlIdentifiedType || r.userReportedType}</span>
                    <span>${r.approximateWeight} kg</span>
                </div>`).join('');

            cache.detailsModalContent.innerHTML = `
                <h2>Bin ${bin.binId}</h2>
                <div class="modal-grid">
                    <div class="modal-images">
                        <img src="${bin.assignedReports?.[0]?.photoUrl?.[0] || 'https://placehold.co/300x200/EAECEE/566573?text=No+Image'}" class="modal-main-image">
                        <div class="modal-thumbnails">
                            ${bin.assignedReports.slice(0, 4).map(r => `<img src="${r.photoUrl?.[0]}" class="modal-thumb">`).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="detail-group">
                            <h3>Summary</h3>
                            <div class="detail-row"><span class="detail-label">Fill Level:</span> <span>${Math.round(bin.fillLevel)}%</span></div>
                            <div class="detail-row"><span class="detail-label">Total Weight:</span> <span>${Object.values(bin.currentWasteComposition || {}).reduce((a, b) => a + b, 0).toFixed(1)} kg</span></div>
                            <div class="detail-row"><span class="detail-label">Reports:</span> <span>${bin.assignedReports.length}</span></div>
                        </div>
                        <div class="detail-group">
                            <h3>Contents</h3>
                            ${reportsHTML || '<p>No reports found.</p>'}
                        </div>
                        <div class="modal-actions">
                            <button class="modal-btn btn-reject" id="rejectBinBtn"><i class="fa-solid fa-times"></i> Reject</button>
                            <button class="modal-btn btn-request" id="requestBinBtn"><i class="fa-solid fa-truck"></i> Request Collection</button>
                        </div>
                    </div>
                </div>
            `;
            cache.detailsOverlay.style.display = 'flex';

            document.getElementById('requestBinBtn').onclick = () => {
                selectedBinIds = new Set([bin._id]);
                requestSelectedBins();
                cache.detailsOverlay.style.display = 'none';
            };
            // Note: Rejecting a bin is complex. We assume rejecting the *request* if one exists.
            // If there's no active request, this button might be disabled or have different logic.
            // For now, we tie it to the currentProcessingRequest if it exists.
            const rejectBtn = document.getElementById('rejectBinBtn');
            if (data.currentProcessingRequest) {
                rejectBtn.onclick = () => rejectBinRequest(data.currentProcessingRequest._id);
            } else {
                rejectBtn.disabled = true;
                rejectBtn.title = "No active request to reject for this bin.";
            }

        } catch (error) {
            handleApiError(error);
        } finally {
            showLoading(false);
        }
    }

    function showProcessModal(requestId) {
        cache.processRequestId.textContent = requestId.substring(0, 8) + '...';
        cache.processForm.dataset.requestId = requestId;
        cache.processOverlay.style.display = 'flex';
    }

    async function handleProcessFormSubmit(e) {
        e.preventDefault();
        const requestId = e.target.dataset.requestId;
        const payload = {
            requestId,
            energyGenerated: parseFloat(document.getElementById('energyGenerated').value),
            co2Reduced: parseFloat(document.getElementById('co2Reduced').value),
            processingMethod: document.getElementById('processingMethod').value
        };

        showLoading(true);
        try {
            await fetchData(`${API_BASE_URL}/mark_processing_complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showSnackbar('Processing finalized successfully!', 'success');
            cache.processOverlay.style.display = 'none';
            e.target.reset();
            await loadInitialData();
        } catch (error) {
            handleApiError(error);
        } finally {
            showLoading(false);
        }
    }

    // --- UTILITIES ---
    function showLoading(isLoading) {
        document.getElementById('loadingOverlay').style.display = isLoading ? 'flex' : 'none';
    }

    function showSnackbar(message, type = 'success') {
        const snackbar = document.getElementById('snackbar');
        snackbar.textContent = message;
        snackbar.className = `show ${type}`;
        setTimeout(() => snackbar.className = '', 3000);
    }

    function logoutUser() {
        fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' })
            .finally(() => {
                document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.href = '/resident/login';
            });
    }

    init();
});
