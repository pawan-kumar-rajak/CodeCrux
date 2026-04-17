document.addEventListener('DOMContentLoaded', function() {
    // Animate stats counters
    animateStats();
    
    // Load impact data
    loadImpactData();
    
    // Initialize chart (will be populated after data loads)
    initializeImpactChart();
});

// Function to animate the stat counters
function animateStats() {
    const statElements = document.querySelectorAll('.stat-number');
    const speed = 200; // Lower is faster
    
    statElements.forEach(statElement => {
        const target = parseInt(statElement.getAttribute('data-target'));
        const increment = target / speed;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            statElement.textContent = Math.floor(current);
            
            if (current >= target) {
                statElement.textContent = target.toLocaleString();
                clearInterval(timer);
            }
        }, 1);
    });
}

// Function to load impact data from API
async function loadImpactData() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/admin/get-environmental-impact');
        if (!response.ok) {
            throw new Error('Failed to fetch impact data');
        }
        const data = await response.json();
        updateImpactStats(data.data);
        updateImpactChart(data.data);
        
    } catch (error) {
        console.error('Error loading impact data:', error);
        // Fallback to default values if API fails
        updateImpactStats({
            overall: {
                totalEnergyGenerated: 2500,
                totalCo2Reduced: 1200,
                totalReportsProcessed: 1000
            }
        });
    }
}

// Function to update the impact stats display
function updateImpactStats(impactData) {
    document.getElementById('co2-reduced').textContent = `${impactData.overall.totalCo2Reduced.toLocaleString()} kg`;
    document.getElementById('energy-generated').textContent = `${impactData.overall.totalEnergyGenerated.toLocaleString()} kWh`;
    document.getElementById('waste-processed').textContent = `${(impactData.overall.totalWeightReduced ).toLocaleString()} kg`; // Assuming 2kg waste per kWh
    document.getElementById('reports-processed').textContent = impactData.overall.totalReportsProcessed.toLocaleString();
}

// Chart initialization and update functions
let impactChart;

function initializeImpactChart() {
    const ctx = document.getElementById('impactTrendChart').getContext('2d');
    
    impactChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Energy Generated (kWh)',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'CO₂ Reduced (kg)',
                    data: [],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Environmental Impact Trends',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            }
        }
    });
}

function updateImpactChart(impactData) {
    if (!impactData.monthly || !impactChart) return;
    
    // Format monthly data for chart
    const labels = impactData.monthly.map(item => {
        const date = new Date();
        date.setFullYear(item._id.year);
        date.setMonth(item._id.month - 1);
        return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    });
    
    const energyData = impactData.monthly.map(item => item.totalEnergyGenerated);
    const co2Data = impactData.monthly.map(item => item.totalCo2Reduced);
    
    // Update chart data
    impactChart.data.labels = labels;
    impactChart.data.datasets[0].data = energyData;
    impactChart.data.datasets[1].data = co2Data;
    impactChart.update();
}

