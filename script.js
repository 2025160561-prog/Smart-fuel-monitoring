if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

let selectedMode = "AUTO"; 
let monitoring = false;
let maxSpeed = 0;
let totalSpeed = 0;
let totalData = 0;

// ==========================================
// 📈 1. SETUP GRAF KELAJUAN (SPEED CURVE VS TIME)
// ==========================================
const ctxSpeed = document.getElementById("speedChart");
let speedChart = null;
if (ctxSpeed) {
    speedChart = new Chart(ctxSpeed, {
        type: "line",
        data: {
            labels: [], 
            datasets: [{
                label: "Speed Curve (km/h)",
                data: [], 
                backgroundColor: "rgba(99, 102, 241, 0.15)", 
                borderColor: "#6366f1", 
                borderWidth: 3,
                pointRadius: 2,
                tension: 0.3, 
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: "rgba(51, 65, 85, 0.3)" }, ticks: { color: "#94a3b8" }, beginAtZero: true },
                x: { grid: { display: false }, ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

// ==========================================
// ⛽ 2. SETUP GRAF MINYAK (FUEL CURVE VS TIME) - PAKSI X MASA SIAP!
// ==========================================
const ctxFuel = document.getElementById("fuelChart");
let fuelChart = null;
if (ctxFuel) {
    fuelChart = new Chart(ctxFuel, {
        type: "line", 
        data: {
            labels: [], // Paksi-X akan diisi dengan data Masa (Timestamp) secara automatik
            datasets: [{
                label: "Fuel Level (%)",
                data: [], 
                backgroundColor: "rgba(16, 185, 129, 0.15)", 
                borderColor: "#10b981", 
                borderWidth: 3,
                pointRadius: 2,
                tension: 0.3, 
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    grid: { color: "rgba(51, 65, 85, 0.3)" }, 
                    ticks: { color: "#94a3b8" }, 
                    beginAtZero: true, 
                    max: 100 
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        color: "#94a3b8", 
                        maxRotation: 45, // Biar tulisan jam tu condong sikit, tak bertindih
                        minRotation: 45 
                    } 
                }
            }
        }
    });
}

function setMode(clickedMode) {
    if (selectedMode === clickedMode) {
        selectedMode = "AUTO";
    } else {
        selectedMode = clickedMode;
    }
    updateModeUI(selectedMode, selectedMode !== "AUTO");
    if (window.writeFirebase) {
        window.writeFirebase("mode", selectedMode);
    }
}

function updateModeUI(modeName, isManual) {
    const modeEl = document.getElementById("mode");
    if (!modeEl) return;
    if (isManual) {
        modeEl.innerHTML = modeName + " <span class='text-xs text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded'>MANUAL</span>";
    } else {
        modeEl.innerHTML = modeName + " <span class='text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded'>AUTO</span>";
    }
}

function startSystem() {
    monitoring = true;
    if (document.getElementById("warning")) document.getElementById("warning").innerHTML = "Connecting to Pico...";
    if (document.getElementById("speed")) document.getElementById("speed").innerHTML = "---";
    if (window.writeFirebase) {
        window.writeFirebase("status", "START");
        window.writeFirebase("mode", "AUTO");
        window.writeFirebase("warning", "System Normal");
    }
}

function stopSystem() {
    monitoring = false;
    if (window.writeFirebase) window.writeFirebase("status", "STOP");
    if (document.getElementById("speed")) document.getElementById("speed").innerHTML = "0";
    if (document.getElementById("fuel")) document.getElementById("fuel").innerHTML = "100%";
    if (document.getElementById("warning")) document.getElementById("warning").innerHTML = "Monitoring Stopped";
    if (document.getElementById("mode")) document.getElementById("mode").innerHTML = "---";
    resetWarningStyle();
    
    if (speedChart) {
        speedChart.data.labels = [];
        speedChart.data.datasets[0].data = [];
        speedChart.update();
    }
    if (fuelChart) {
        fuelChart.data.labels = [];
        fuelChart.data.datasets[0].data = [];
        fuelChart.update();
    }
}

function resetWarningStyle() {
    const banner = document.getElementById("warning-banner");
    const iconBox = document.getElementById("warning-icon-box");
    const warningText = document.getElementById("warning");
    if (banner) banner.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl";
    if (iconBox) iconBox.className = "p-3 bg-slate-800 rounded-xl text-amber-500";
    if (warningText) warningText.style.color = "#e2e8f0";
}

window.setMode = setMode;
window.startSystem = startSystem;
window.stopSystem = stopSystem;

function initFirebaseListeners() {
    if (window.db && window.ref && window.onValue) {
        console.log("Firebase Connected!");
        
        window.onValue(window.ref(window.db, "status"), (snapshot) => {
            const currentStatus = snapshot.val() || "STOP";
            if (currentStatus === "START") monitoring = true;
            else stopSystem();
        });

        // Fungsi pembantu dapatkan jam waktu sekarang
        function getFormattedTime() {
            const now = new Date();
            return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        }

        // 2. Speed Listener (Real-time Timeline Plotting)
        window.onValue(window.ref(window.db, "speed"), (snapshot) => {
            if (!monitoring) return;
            const speed = Number(snapshot.val()) || 0;
            if (document.getElementById("speed")) document.getElementById("speed").innerHTML = speed;

            if (speed > maxSpeed) {
                maxSpeed = speed;
                if (document.getElementById("maxSpeed")) document.getElementById("maxSpeed").innerHTML = maxSpeed;
            }
            totalSpeed += speed;
            totalData++;
            if (document.getElementById("avgSpeed")) document.getElementById("avgSpeed").innerHTML = Math.round(totalSpeed / totalData);

            if (speedChart) {
                speedChart.data.labels.push(getFormattedTime());
                speedChart.data.datasets[0].data.push(speed);
                if (speedChart.data.labels.length > 12) { 
                    speedChart.data.labels.shift();
                    speedChart.data.datasets[0].data.shift();
                }
                speedChart.update();
            }
        });

        window.onValue(window.ref(window.db, "current_live_mode"), (snapshot) => {
            if (monitoring && selectedMode === "AUTO") updateModeUI(snapshot.val() || "ECO", false);
        });
        window.onValue(window.ref(window.db, "mode"), (snapshot) => {
            selectedMode = snapshot.val() || "AUTO";
            if (monitoring && selectedMode !== "AUTO") updateModeUI(selectedMode, true);
        });

        // 4. Fuel Listener (Paksi-X Masa Berfungsi Di Sini)
        let lastFuelAlertTime = 0;
        window.onValue(window.ref(window.db, "fuel"), (snapshot) => {
            const fuelVal = snapshot.val();
            if (monitoring && fuelVal && document.getElementById("fuel")) {
                const numericFuel = parseInt(fuelVal) || 0;
                document.getElementById("fuel").innerHTML = numericFuel + "%";
                
                if (fuelChart) {
                    // Masukkan label masa laptop ke paksi-X graf minyak
                    fuelChart.data.labels.push(getFormattedTime());
                    // Masukkan nilai peratus minyak ke paksi-Y graf minyak
                    fuelChart.data.datasets[0].data.push(numericFuel);
                    
                    // Kekalkan had paparan 12 data point sahaja supaya graf bergerak smooth
                    if (fuelChart.data.labels.length > 12) {
                        fuelChart.data.labels.shift();
                        fuelChart.data.datasets[0].data.shift();
                    }

                    // Logik penukaran warna garisan curve
                    if (numericFuel <= 20) {
                        fuelChart.data.datasets[0].borderColor = "#f43f5e"; 
                        fuelChart.data.datasets[0].backgroundColor = "rgba(244, 63, 94, 0.15)";
                        
                        let timeNow = Date.now();
                        if (Notification.permission === "granted" && (timeNow - lastFuelAlertTime > 10000)) {
                            lastFuelAlertTime = timeNow;
                            new Notification("🚨 LOW FUEL WARNING!", {
                                body: `Fuel level dropped to ${numericFuel}%. Please refuel immediately!`,
                                icon: "https://cdn-icons-png.flaticon.com/512/1134/1134140.png"
                            });
                        }
                    } else if (numericFuel <= 50) {
                        fuelChart.data.datasets[0].borderColor = "#f59e0b"; 
                        fuelChart.data.datasets[0].backgroundColor = "rgba(245, 158, 11, 0.15)";
                    } else {
                        fuelChart.data.datasets[0].borderColor = "#10b981"; 
                        fuelChart.data.datasets[0].backgroundColor = "rgba(16, 185, 129, 0.15)";
                    }
                    fuelChart.update();
                }
            }
        });

        // 5. Warning Speed Banner Listener
        let lastSpeedAlertTime = 0; 
        window.onValue(window.ref(window.db, "warning"), (snapshot) => {
            const msg = snapshot.val() || "System Normal";
            if (monitoring && document.getElementById("warning")) {
                document.getElementById("warning").innerHTML = msg;
                const banner = document.getElementById("warning-banner");
                const iconBox = document.getElementById("warning-icon-box");
                
                if (msg.toUpperCase().includes("OVER LIMIT") && banner && iconBox) {
                    banner.className = "bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-pulse";
                    iconBox.className = "p-3 bg-rose-500 text-white rounded-xl";
                    document.getElementById("warning").style.color = "#f43f5e";

                    let timeNow = Date.now();
                    if (Notification.permission === "granted" && (timeNow - lastSpeedAlertTime > 10000)) {
                        lastSpeedAlertTime = timeNow;
                        new Notification("🚨 SYSTEM: OVER LIMIT!", {
                            body: `${msg}. Speed violation detected.`,
                            icon: "https://cdn-icons-png.flaticon.com/512/179/179386.png"
                        });
                    }
                } else {
                    resetWarningStyle();
                }
            }
        });
    } else {
        setTimeout(initFirebaseListeners, 500);
    }
}
window.addEventListener('DOMContentLoaded', () => { setTimeout(initFirebaseListeners, 1200); });