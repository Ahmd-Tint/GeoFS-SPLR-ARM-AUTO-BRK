// ==UserScript==
// @name          SPLR ARM & AUTO BRK
// @namespace     http://tampermonkey.net/
// @match         https://*.geo-fs.com/*
// @updateURL     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @downloadURL   https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @grant         none
// @version       3.3
// @author        Ahmd-Tint
// @description   Spoiler ARM/DISARM + Auto Brake with full mode cycling (RTO, DISARM, 1, 2, 3, 4, MAX) Thanks to Speedbird for suggesting brake levels and new visuals. Publishing an edited version of this is not allowed.
// ==/UserScript==



(function () {
    'use strict';

    // AUTOBRAKE MODES
    const autoBrakeModes = ["RTO", "DISARM", "1", "2", "3", "4", "MAX"];
    let autoBrakeIndex = 0; // default = RTO

    let isAutoBrakeArmed = true;

    // RTO LATCH FLAG
    let rtoActive = false;

    // Custom overlay elements
    let splrOverlay = null;
    let abrkOverlay = null;

    // NOTIFICATION (kept for other messages)
    function showNotification(msg, type = "info", timeout = 3000) {
        if (window.geofs?.utils?.notification) {
            window.geofs.utils.notification.show(msg, { timeout, type });
        } else if (window.ui?.notification) {
            window.ui.notification.show(msg, { timeout, type });
        }
    }

    // WAIT FOR GEOFS LOADING
    async function waitForGeoFS() {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (window.geofs?.aircraft?.instance && window.controls) {
                    clearInterval(interval);
                    resolve();
                }
            }, 200);
        });
    }

    // SPOILER ARM TOGGLE
    const toggleSpoilerArm = () => {
        const inst = geofs.aircraft.instance;
        if (inst.animationValue.spoilerArming === undefined)
            inst.animationValue.spoilerArming = 0;

        // toggle between 0 and 1
        inst.animationValue.spoilerArming = inst.animationValue.spoilerArming === 0 ? 1 : 0;

        // Update custom overlay
        updateSplrOverlay();

        console.log(`[SPLR ARM] now = ${inst.animationValue.spoilerArming ? "ARMED" : "DISARMED"}`);
    };

    // Provide a control setter for compatibility with other scripts/UI
    function registerSpoilerSetter() {
        try {
            controls.setters = controls.setters || {};
            controls.setters.setSpoilerArming = {
                label: "Spoiler Arming",
                set: toggleSpoilerArm
            };
        } catch (e) {
            // ignore if controls isn't ready
        }
    }

    // AUTOBRAKE MODE CYCLE
    const toggleAutoBrake = () => {
        autoBrakeIndex = (autoBrakeIndex + 1) % autoBrakeModes.length;
        const mode = autoBrakeModes[autoBrakeIndex];

        isAutoBrakeArmed = mode !== "DISARM";

        // When switching to DISARM, release RTO latch
        if (!isAutoBrakeArmed) rtoActive = false;

        // Update custom overlay
        updateAbrkOverlay();

        console.log(`[AUTO BRK] Mode = ${mode}`);
    };

    // MAIN AUTOBRAKE + SPOILER LOGIC
    const checkTouchdownLogic = () => {
        const inst = geofs.aircraft.instance;

        // -------------------------------
        // AIRBORNE
        // -------------------------------
        if (!inst.groundContact) {
            if (isAutoBrakeArmed) controls.brakes = 0; // reset only if auto brake is armed
            return;
        }

        // -------------------------------
        // DISARM MODE → MANUAL BRAKING
        // -------------------------------
        if (!isAutoBrakeArmed) {
            return; // do not touch brakes, allow pilot full control
        }

        const mode = autoBrakeModes[autoBrakeIndex];
        let brakeAmount = 0;

        // -------------------------------
        // RTO MODE WITH REALISTIC BEHAVIOR
        // -------------------------------
        if (mode === "RTO") {

            // TRIGGER RTO IF THRUST → IDLE at >36 m/s
            if (
                !rtoActive &&
                inst.groundSpeed > 36 &&             // >70 knots
                inst.totalThrust < 6375 &&          // throttle pulled idle
                inst.groundContact
            ) {
                rtoActive = true;
                console.log("[AUTO BRK] RTO ACTIVATED");
            }

            // HOLD MAX BRAKES IF ACTIVE
            if (rtoActive) {
                brakeAmount = 1;

                // RELEASE RTO BELOW 0 m/s
                if (inst.groundSpeed = 0) {
                    rtoActive = false;
                    console.log("[AUTO BRK] RTO RELEASED");
                }
            }
        }

        // -------------------------------
        // NORMAL MODES 1–MAX
        // -------------------------------
        if (!rtoActive) {
            switch (mode) {
                case "1": brakeAmount = 0.20; break;
                case "2": brakeAmount = 0.35; break;
                case "3": brakeAmount = 0.50; break;
                case "4": brakeAmount = 0.75; break;
                case "MAX": brakeAmount = 1.00; break;
            }
        }

        controls.brakes = brakeAmount;

        // -----------------------------------------------------
        // AUTOLAND++ SPOILER DEPLOYMENT LOGIC (MERGED)
        // -----------------------------------------------------
        if (
            inst.animationValue.spoilerArming === 1 &&
            inst.groundContact
        ) {
            if (controls.airbrakes.position === 0) {
                // Deploy spoilers
                controls.airbrakes.target = 1;
                if (typeof controls.setPartAnimationDelta === "function") {
                    controls.setPartAnimationDelta(controls.airbrakes);
                }
            }

            // Update overlay
            updateSplrOverlay();

            console.log("[SPLR ARM] Spoilers deployed on touchdown.");
        }
    };

    // Create custom HTML overlays (completely separate from GeoFS instruments)
    function createCustomOverlays() {
        try {
            // Create SPLR ARM overlay
            splrOverlay = document.createElement('div');
            splrOverlay.style.cssText = `
                position: fixed;
                bottom: 199.5px;
                right: 11.5px;
                width: 47.5px;
                height: 47.5px;
                background: rgba(0, 255, 0, 0.8);
                color: white;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                line-height: 25px;
                border-radius: 5px;
                z-index: 10000;
                display: none;
                pointer-events: none;
            `;
            splrOverlay.innerHTML = 'SPLR<br/>ARM';
            document.body.appendChild(splrOverlay);

            // Create ABRK overlay
            abrkOverlay = document.createElement('div');
            abrkOverlay.style.cssText = `
                position: fixed;
                bottom: 147.5px;
                right: 11.5px;
                width: 47.5px;
                height: 47.5px;
                background: rgba(0, 255, 0, 0.8);
                color: white;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                line-height: 25px;
                border-radius: 5px;
                z-index: 10000;
                display: block;
                pointer-events: none;
            `;
            abrkOverlay.innerHTML = 'ABRK<br/>RTO';
            document.body.appendChild(abrkOverlay);

            console.log("[SPLR/ABRK] Custom overlays created.");
        } catch (e) {
            console.error("[SPLR/ABRK] Error creating overlays:", e);
        }
    }

    // Update SPLR overlay
    function updateSplrOverlay() {
        if (!splrOverlay) return;
        try {
            const inst = geofs.aircraft.instance;
            if (inst.animationValue.spoilerArming === 1) {
                splrOverlay.style.display = 'block';
            } else {
                splrOverlay.style.display = 'none';
            }
        } catch (e) {
            // ignore
        }
    }

    // Update ABRK overlay
    function updateAbrkOverlay() {
        if (!abrkOverlay) return;
        try {
            const mode = autoBrakeModes[autoBrakeIndex];
            abrkOverlay.innerHTML = `ABRK<br/>${mode}`;

            if (mode === "DISARM") {
                abrkOverlay.style.display = 'none';
            } else {
                abrkOverlay.style.display = 'block';
            }
        } catch (e) {
            // ignore
        }
    }

    // INIT
    async function init() {
        await waitForGeoFS();

        // register setter in case instruments or UI or other scripts call it
        registerSpoilerSetter();

        // Ensure spoilerArming exists at start
        try {
            geofs.aircraft.instance.animationValue = geofs.aircraft.instance.animationValue || {};
            if (geofs.aircraft.instance.animationValue.spoilerArming === undefined)
                geofs.aircraft.instance.animationValue.spoilerArming = 0;
        } catch (e) { /* ignore */ }

        // Create custom overlays (not using GeoFS instrument system at all)
        createCustomOverlays();

        // Initial overlay states
        updateSplrOverlay();
        updateAbrkOverlay();

        // Run the touchdown logic periodically
        setInterval(checkTouchdownLogic, 100);

        // Key bindings
        document.addEventListener("keydown", e => {
            // Shift + /  (Shift + '?') -> toggle spoiler arming
            if (e.shiftKey && (e.key === "?" || e.keyCode === 191)) {
                e.preventDefault();
                toggleSpoilerArm();
            }

            // Ctrl + F11 -> toggle autobrake modes
            if (e.ctrlKey && e.key === "F11") {
                e.preventDefault();
                toggleAutoBrake();
            }
        });

        // Keep the original "loaded" notification
        showNotification("SPLR ARM & AUTO BRK Loaded!", "info", 4000);
        console.log("[SCRIPT] Full realistic system online.");
    }

    init();
})();
