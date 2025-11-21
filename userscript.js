// ==UserScript==
// @name          SPLR ARM & AUTO BRK
// @namespace     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK
// @match         https://*.geo-fs.com/*
// @updateURL     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/userscript.js
// @downloadURL   https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/userscript.js
// @grant         none
// @version       1
// @author        Ahmd-Tint
// @description   ARM/DISARM SPLR && AUTO BRK. For GeoFS.
// ==/UserScript==

(function() {
    'use strict';

    // Global state trackers
    let isAutoBrakeArmed = true;

    // --- Utility Functions ---
    // A simple function to safely show a notification, checking for reliable paths.
    function showNotification(message, type = 'info', timeout = 3000) {
        if (window.geofs && window.geofs.utils && window.geofs.utils.notification) {
            window.geofs.utils.notification.show(message, { timeout: timeout, type: type });
        } else if (window.ui && window.ui.notification) {
            window.ui.notification.show(message, { timeout: timeout, type: type });
        }
    }

    // Function to wait for the core GeoFS environment to be fully ready
    async function waitForGeoFS() {
        return new Promise(resolve => {
            const intervalId = setInterval(() => {
                if (window.geofs && window.geofs.aircraft && window.geofs.aircraft.instance && window.controls) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 200);
        });
    }

    // --- 1. Spoiler Arm Toggle Function (Shift + /) ---
    const toggleSpoilerArm = () => {
        const instance = geofs.aircraft.instance;

        // --- FIX 1: Initialize property if it does not exist ---
        // This prevents the script from failing if the aircraft doesn't have it set up by default.
        if (instance.animationValue.spoilerArming === undefined) {
             instance.animationValue.spoilerArming = 0; // Initialize to 0 (disarmed)
        }

        // Use the explicit object path found in your uploaded file (autoland++.txt)
        const spoilerArmingValue = instance.animationValue.spoilerArming;

        // Toggle the value (0 to 1, or 1 to 0)
        instance.animationValue.spoilerArming = spoilerArmingValue === 0 ? 1 : 0;

        const isArmed = instance.animationValue.spoilerArming === 1;

        // Show notification for user feedback (guaranteed to fire now)
        showNotification(`Spoiler Arm: ${isArmed ? 'ARMED' : 'DISARMED'} (Shift + /)`);
        console.log(`[SPLR ARM] Toggled: ${isArmed ? 'ARMED' : 'DISARMED'}`);
    };

    // --- 2. Auto Brake Toggle Function (Ctrl + F11) ---
    const toggleAutoBrake = () => {
        isAutoBrakeArmed = !isAutoBrakeArmed;

        // Show notification for user feedback
        showNotification(`Auto Brake: ${isAutoBrakeArmed ? 'ARMED' : 'DISARMED'} (Ctrl + F11)`);
        console.log(`[AUTO BRK] Toggled: ${isAutoBrakeArmed ? 'ARMED' : 'DISARMED'}`);
    };

    // --- 3. Touchdown Logic (Spoiler Deployment & Auto Brake Application) ---
    const checkTouchdownLogic = () => {
        if (!geofs.aircraft || !geofs.aircraft.instance) return;

        const instance = geofs.aircraft.instance;

        // The core requirement is that deployment/application only happens on ground contact.
        if (instance.groundContact) {

            // --- Spoiler Deployment ---
            // Check if spoilers are armed (1) and airbrakes are not yet fully deployed (0)
            if (instance.animationValue.spoilerArming === 1 && controls.airbrakes.position === 0) {
                controls.airbrakes.target = 1;      // Full deployment
                controls.airbrakes.delta = 0.5;
                instance.animationValue.spoilerArming = 0; // Disarm after deployment
                console.log('[SPLR ARM] Spoilers deployed on touchdown.');
            }

            // --- Auto Brake Application ---
            if (isAutoBrakeArmed) {
                controls.brakes = 1; // Apply full brakes
                console.log('[AUTO BRK] Brakes applied on touchdown.');
            }
        } else {
            // Airborne state: ensure brakes are off
            controls.brakes = 0;
        }
    };

    // --- 4. Initialize Script ---
    async function initShortcuts() {
        await waitForGeoFS();

        // Set up interval for touchdown logic
        setInterval(checkTouchdownLogic, 100);

        // Set up keyboard event listener
        document.addEventListener('keydown', function(event) {

            // --- FIX 2: Check for '?' key which is the result of Shift + / on most US keyboards ---
            // We check for both '?' and the physical key code (191) for maximum compatibility.
            if (event.shiftKey && (event.key === '?' || event.keyCode === 191)) {
                event.preventDefault();
                toggleSpoilerArm();
            }

            // Toggle Auto Brake: Ctrl + F11
            if (event.ctrlKey && event.key === 'F11') {
                event.preventDefault();
                toggleAutoBrake();
            }
        });

        console.log('[SPLR ARM & AUTO BRK Script] Loaded. Press Shift + / and Ctrl + F11.');
        showNotification("SPLR ARM & AUTO BRK Script Loaded!", 'info', 4000);
    }

    initShortcuts();

})();
