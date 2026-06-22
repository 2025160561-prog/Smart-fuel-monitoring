import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC5wyjYeYohV_zKIIhXV4SIZSAtYXiTSq4",
    authDomain: "smart-fuel-monitoring-35b78.firebaseapp.com",
    databaseURL: "https://smart-fuel-monitoring-35b78-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-fuel-monitoring-35b78",
    storageBucket: "smart-fuel-monitoring-35b78.firebasestorage.app",
    messagingSenderId: "27164180613",
    appId: "1:27164180613:web:b59140d5442eaee347a9ec"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Eksport objek ke skop global (window) untuk kegunaan script.js
window.db = db;
window.ref = ref;
window.set = set;
window.onValue = onValue;

// Fungsi menulis data ke Firebase yang telah diperbaiki jalurnya
window.writeFirebase = function(key, value) {
    set(ref(db, "/" + key), value);
}

console.log("Firebase Connected");