// Menggunakan konfigurasi yang sama dari skop global/firebase.js
let selectedMode = "AUTO"; 
let monitoring = false;
let maxSpeed = 0;
let totalSpeed = 0;
let totalData = 0;
let t = 0;

// Konfigurasi Graf Chart.js
const ctx = document.getElementById("speedChart");
let speedChart = null;

if (ctx) {
    speedChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Speed Curve",
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
                y: {
                    grid: { color: "rgba(51, 65, 85, 0.3)" },
                    ticks: { color: "#94a3b8" },
                    beginAtZero: true
                },
                x: {
                    grid: { display: false },
                    ticks: { color: "#94a3b8" }
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
    if (window.writeFirebase) {
        window.writeFirebase("status", "STOP");
    }
    if (document.getElementById("speed")) document.getElementById("speed").innerHTML = "0";
    if (document.getElementById("fuel")) document.getElementById("fuel").innerHTML = "LOW";
    if (document.getElementById("warning")) document.getElementById("warning").innerHTML = "Monitoring Stopped";
    if (document.getElementById("mode")) document.getElementById("mode").innerHTML = "---";
    resetWarningStyle();
}

function resetWarningStyle() {
    const banner = document.getElementById("warning-banner");
    const iconBox = document.getElementById("warning-icon-box");
    const warningText = document.getElementById("warning");
    
    if (banner) banner.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl";
    if (iconBox) iconBox.className = "p-3 bg-slate-800 rounded-xl text-amber-500";
    if (warningText) warningText.style.color = "#e2e8f0";
}

// BIND KEPADA WINDOW SUPAYA HTML BOLEH PANGGIL WALAUPUN SCRIPT ADALAH MODULE
window.setMode = setMode;
window.startSystem = startSystem;
window.stopSystem = stopSystem;

function initFirebaseListeners() {
    // Semak komponen window daripada eksport firebase.js
    if (window.db && window.ref && window.onValue) {
        console.log("Firebase Listeners Aktif!");
        
        // 1. Dengar Status Sistem
        window.onValue(window.ref(window.db, "status"), (snapshot) => {
            const currentStatus = snapshot.val();
            if (currentStatus === "START") {
                monitoring = true;
            } else {
                monitoring = false;
                if (document.getElementById("speed")) document.getElementById("speed").innerHTML = "0";
                if (document.getElementById("fuel")) document.getElementById("fuel").innerHTML = "LOW";
                if (document.getElementById("warning")) document.getElementById("warning").innerHTML = "Monitoring Stopped";
                resetWarningStyle();
            }
        });

        // 2. Dengar Kelajuan & Update Graf
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
            if (document.getElementById("avgSpeed")) {
                document.getElementById("avgSpeed").innerHTML = Math.round(totalSpeed / totalData);
            }

            if (speedChart) {
                speedChart.data.labels.push(t++);
                speedChart.data.datasets[0].data.push(speed);
                if (speedChart.data.labels.length > 15) { 
                    speedChart.data.labels.shift();
                    speedChart.data.datasets[0].data.shift();
                }
                speedChart.update();
            }
        });

        // 3. Dengar Mod Live
        window.onValue(window.ref(window.db, "current_live_mode"), (snapshot) => {
            const liveMode = snapshot.val() || "ECO";
            if (monitoring && selectedMode === "AUTO") {
                updateModeUI(liveMode, false);
            }
        });
        
        window.onValue(window.ref(window.db, "mode"), (snapshot) => {
            const currentM = snapshot.val() || "AUTO";
            selectedMode = currentM;
            if (monitoring && currentM !== "AUTO") {
                updateModeUI(currentM, true);
            }
        });

        // 4. Dengar Status Minyak
        window.onValue(window.ref(window.db, "fuel"), (snapshot) => {
            const fuelVal = snapshot.val();
            if (monitoring && fuelVal && document.getElementById("fuel")) {
                document.getElementById("fuel").innerHTML = fuelVal;
            }
        });

        // 5. Dengar Amaran Bahaya
        window.onValue(window.ref(window.db, "warning"), (snapshot) => {
            const msg = snapshot.val() || "System Normal";
            if (monitoring && document.getElementById("warning")) {
                document.getElementById("warning").innerHTML = msg;
                const banner = document.getElementById("warning-banner");
                const iconBox = document.getElementById("warning-icon-box");
                
                if (msg.includes("OVER LIMIT") && banner && iconBox) {
                    banner.className = "bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-rose-950/20 animate-pulse";
                    iconBox.className = "p-3 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/30";
                    document.getElementById("warning").style.color = "#f43f5e";
                } else {
                    resetWarningStyle();
                }
            }
        });

    } else {
        setTimeout(initFirebaseListeners, 500);
    }
}

// Jalankan pembacaan selepas tetingkap sedia
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(initFirebaseListeners, 1200);
});