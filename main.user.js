// ==UserScript==
// @name          AUTO BRK LVL
// @namespace     http://tampermonkey.net/
// @match         https://*.geo-fs.com/*
// @updateURL     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @downloadURL   https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @grant         none
// @version       2.2
// @author        Ahmd-Tint
// @description   Auto Brake with full mode cycling (RTO, DISARM, 1, 2, 3, 4, MAX) Thanks to Speedbird for suggesting brake levels. Publishing an edited version of this is not allowed. This is a separate version of This is a separate version of https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK
// ==/UserScript==

(function () {
    'use strict';

    // AUTOBRAKE MODES
    const autoBrakeModes = ["RTO", "DISARM", "1", "2", "3", "4", "MAX"];
    let autoBrakeIndex = 0; // default = RTO

    let isAutoBrakeArmed = true;

    // RTO LATCH FLAG
    let rtoActive = false;

    // NOTIFICATION
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

    // AUTOBRAKE MODE CYCLE
    const toggleAutoBrake = () => {
        autoBrakeIndex = (autoBrakeIndex + 1) % autoBrakeModes.length;
        const mode = autoBrakeModes[autoBrakeIndex];

        isAutoBrakeArmed = mode !== "DISARM";

        // When switching to DISARM, release RTO latch
        if (!isAutoBrakeArmed) rtoActive = false;

        showNotification(`Auto Brake: ${mode} (Ctrl + F11)`);
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

                // RELEASE RTO BELOW 8 m/s
                if (inst.groundSpeed < 8) {
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
    };

    // INIT
    async function init() {
        await waitForGeoFS();

        setInterval(checkTouchdownLogic, 100);

        document.addEventListener("keydown", e => {

            if (e.ctrlKey && e.key === "F11") {
                e.preventDefault();
                toggleAutoBrake();
            }
        });

        showNotification("AUTO BRK LVL Loaded!", "info", 4000);
        console.log("[SCRIPT] Full realistic system online.");
    }

    init();
})();
