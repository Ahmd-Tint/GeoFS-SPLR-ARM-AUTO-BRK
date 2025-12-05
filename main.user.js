// ==UserScript==
// @name          SPLR ARM & AUTO BRK
// @namespace     http://tampermonkey.net/
// @match         https://*.geo-fs.com/*
// @updateURL     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @downloadURL   https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @grant         none
// @version       8.7
// @author        Ahmd-Tint
// @description   Spoiler ARM/DISARM + Auto Brake with full mode cycling (RTO, DISARM, 1, 2, 3, 4, MAX).
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const CHECK_INTERVAL_MS = 50;

    const autoBrakeModes = ["RTO", "DISARM", "1", "2", "3", "4", "MAX"];
    let autoBrakeIndex = 0;
    let isAutoBrakeArmed = true;


    let rtoActive = false;


    let deployedThisLanding = false;


    let splrOverlay = null;
    let abrkOverlay = null;


    function log(...args) {
        if (DEBUG) console.log('[SPLR/ABRK]', ...args);
    }
    function info(...args) {
        console.log('[SPLR/ABRK]', ...args);
    }
    function warn(...args) {
        console.warn('[SPLR/ABRK]', ...args);
    }


    function showNotification(msg, type = "info", timeout = 3000) {
        try {
            if (window.geofs?.utils?.notification) {
                window.geofs.utils.notification.show(msg, { timeout, type });
            } else if (window.ui?.notification) {
                window.ui.notification.show(msg, { timeout, type });
            }
        } catch (e) { return;; }
    }


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


    function areInstrumentsVisible() {
        try {
            if (window.instruments && typeof window.instruments.visible !== 'undefined') {
                return window.instruments.visible;
            }
            return true;
        } catch (e) {
            log("Error checking instruments visibility:", e);
            return true;
        }
    }


    const toggleSpoilerArm = () => {
        try {
            const inst = geofs.aircraft.instance;
            geofs.aircraft.instance.animationValue = geofs.aircraft.instance.animationValue || {};
            if (inst.animationValue.spoilerArming === undefined)
                inst.animationValue.spoilerArming = 0;

            inst.animationValue.spoilerArming = inst.animationValue.spoilerArming === 0 ? 1 : 0;
            updateSplrOverlay();
            info(`SPLR ARM = ${inst.animationValue.spoilerArming ? "ARMED" : "DISARMED"}`);
        } catch (e) {
            warn("toggleSpoilerArm error", e);
        }
    };


    function registerSpoilerSetter() {
        try {
            controls.setters = controls.setters || {};
            controls.setters.setSpoilerArming = {
                label: "Spoiler Arming",
                set: toggleSpoilerArm
            };
        } catch (e) {
            return;
        }
    }


    const toggleAutoBrake = () => {
        autoBrakeIndex = (autoBrakeIndex + 1) % autoBrakeModes.length;
        const mode = autoBrakeModes[autoBrakeIndex];

        isAutoBrakeArmed = mode !== "DISARM";


        if (!isAutoBrakeArmed) rtoActive = false;


        updateAbrkOverlay();

        info(`Mode = ${mode}`);
    };


    function isOnGround(inst) {
        try {
            if (!inst) return false;
            const gc = inst.groundContact;
            if (Array.isArray(gc)) {
                return gc.some(x => x === true);
            } else {
                return gc === true;
            }
        } catch (e) {
            return !!(inst && inst.groundContact);
        }
    }


    const checkTouchdownLogic = () => {
        try {
            const inst = geofs.aircraft.instance;
            if (!inst) return;

            const onGround = isOnGround(inst);
            const armed = inst.animationValue && inst.animationValue.spoilerArming === 1;


            if (armed && onGround && !deployedThisLanding) {
                deployedThisLanding = true;
                info('Touchdown detected — deploying spoilers');

                try {
                    if (controls && controls.airbrakes) {

                        if (typeof controls.airbrakes.position === 'number' && controls.airbrakes.position < 1) {
                            window.controls.airbrakes.target = 1;

                            log('Set airbrakes.target=1 and position=1');
                        } else {

                            controls.airbrakes.target = 1;
                            log('Airbrakes position already >=1, set target=1');
                        }


                        if (typeof controls.setPartAnimationDelta === "function") {
                            try {
                                controls.setPartAnimationDelta(controls.airbrakes);
                                log('Called setPartAnimationDelta');
                            } catch (e) {
                                log('setPartAnimationDelta threw', e);
                            }
                        }
                    } else {
                        warn('controls.airbrakes not found at deploy');
                    }
                } catch (e) {
                    warn('Error during spoiler deploy', e);
                }

                updateSplrOverlay();
                info('Spoilers deployment attempted.');
            }


            if (!onGround && deployedThisLanding) {
                deployedThisLanding = false;
                log('Airborne again — reset deployedThisLanding flag');
            }


            if (!isAutoBrakeArmed) {

                return;
            }


            const mode = autoBrakeModes[autoBrakeIndex] || "DISARM";
            let brakeAmount = 0;

            if (mode === "RTO") {

                if (!rtoActive && inst.groundSpeed > 44 && controls.throttle === 0 && onGround) {
                    rtoActive = true;
                    info('RTO ACTIVATED');
                }
                if (rtoActive) {
                    brakeAmount = 1;
                }
            }

            if (!rtoActive) {
                switch (mode) {
                    case "1": brakeAmount = 0.2; break;
                    case "2": brakeAmount = 0.4; break;
                    case "3": brakeAmount = 0.6; break;
                    case "4": brakeAmount = 0.8; break;
                    case "MAX": brakeAmount = 1; break;
                    default: brakeAmount = 0; break;
                }
            }


            try {
                controls.brakes = brakeAmount;
            } catch (e) {
                log('Unable to set controls.brakes', e);
            }

        } catch (e) {
            console.error('[SPLR/ABRK] checkTouchdownLogic fatal error', e);
        }
    };


    function createCustomOverlays() {
        try {

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
            console.error('[SPLR/ABRK] Error creating overlays:', e);
        }
    }


    function updateSplrOverlay() {
        if (!splrOverlay) return;
        try {
            const inst = geofs.aircraft.instance;
            const instrumentsVisible = areInstrumentsVisible();
            const armed = inst && inst.animationValue && inst.animationValue.spoilerArming === 1;

            if (armed && instrumentsVisible) {
                splrOverlay.style.display = 'block';
            } else {
                splrOverlay.style.display = 'none';
            }
        } catch (e) {
            return;
        }
    }


    function updateAbrkOverlay() {
        if (!abrkOverlay) return;
        try {
            const mode = autoBrakeModes[autoBrakeIndex];
            abrkOverlay.innerHTML = `ABRK<br/>${mode}`;
            const instrumentsVisible = areInstrumentsVisible();

            if (mode === "DISARM" || !instrumentsVisible) {
                abrkOverlay.style.display = 'none';
            } else {
                abrkOverlay.style.display = 'block';
            }
        } catch (e) {
            return;
        }
    }


    function startVisibilityMonitor() {
        setInterval(() => {
            updateSplrOverlay();
            updateAbrkOverlay();
        }, 500);
    }


    function autoDisarm() {
        try {
            const brkMode = autoBrakeModes[autoBrakeIndex];
            if (!brkMode || brkMode === "DISARM") return;
            const b = controls.brakes || 0;
            const thresholds = { "1": 0.21, "2": 0.41, "3": 0.61, "4": 0.81 };
            if (thresholds[brkMode] && b > thresholds[brkMode]) {
                autoBrakeIndex = autoBrakeModes.indexOf("DISARM");
                isAutoBrakeArmed = false;
                rtoActive = false;
                updateAbrkOverlay();
                info('AutoBrake auto-disarmed due to pilot braking');
            }
        } catch (e) {
            log('autoDisarm error', e);
        }
    }


    async function init() {
        await waitForGeoFS();


        registerSpoilerSetter();


        try {
            geofs.aircraft.instance.animationValue = geofs.aircraft.instance.animationValue || {};
            if (geofs.aircraft.instance.animationValue.spoilerArming === undefined)
                geofs.aircraft.instance.animationValue.spoilerArming = 0;
        } catch (e) { return; }


        createCustomOverlays();
        updateSplrOverlay();
        updateAbrkOverlay();
        startVisibilityMonitor();


        setInterval(checkTouchdownLogic, CHECK_INTERVAL_MS);
        setInterval(autoDisarm, 50);


        document.addEventListener("keydown", e => {

            if (e.shiftKey && (e.key === "?" || e.keyCode === 191)) {
                e.preventDefault();
                toggleSpoilerArm();
            }


            if (e.ctrlKey && e.key === "F11") {
                e.preventDefault();
                toggleAutoBrake();
            }
        });

        showNotification("SPLR ARM & AUTO BRK Loaded! (v8.7)", "info", 4000);
        info('Full realistic system online. V8.7');
    }

    init();

})();
