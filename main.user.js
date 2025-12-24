// ==UserScript==
// @name          SPLR ARM & AUTO BRK
// @namespace     http://tampermonkey.net/
// @match         https://*.geo-fs.com/*
// @updateURL     https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @downloadURL   https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/refs/heads/main/main.user.js
// @grant         none
// @version       8.8
// @author        Ahmd-Tint
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const CHECK_INTERVAL_MS = 50;

    const autoBrakeModes = ["RTO", "DISARM", "1", "2", "3", "4", "MAX"];
    let autoBrakeIndex = 0;
    let isAutoBrakeArmed = true;
    let rtoActive = false;

    let splrOverlay = null;
    let abrkOverlay = null;

    let spoilersDeployed = false;

    function log(...a){ if(DEBUG) console.log("[SPLR]", ...a); }
    function info(...a){ console.log("[SPLR]", ...a); }
    function warn(...a){ console.warn("[SPLR]", ...a); }

    async function waitForGeoFS() {
        return new Promise(resolve => {
            const i = setInterval(() => {
                if (window.geofs?.aircraft?.instance && window.controls) {
                    clearInterval(i);
                    resolve();
                }
            }, 200);
        });
    }

    function areInstrumentsVisible() {
        try {
            return window.instruments?.visible ?? true;
        } catch {
            return true;
        }
    }

    function isOnGround(inst) {
        const gc = inst?.groundContact;
        return Array.isArray(gc) ? gc.some(Boolean) : !!gc;
    }

    function deploySpoilers() {
        if (!controls?.airbrakes) return;
        controls.airbrakes.target = 1;
        if (controls.setPartAnimationDelta)
            controls.setPartAnimationDelta(controls.airbrakes);
        spoilersDeployed = true;
        info("Spoilers DEPLOYED");
    }

    function retractSpoilers() {
        if (!controls?.airbrakes) return;
        controls.airbrakes.target = 0;
        if (controls.setPartAnimationDelta)
            controls.setPartAnimationDelta(controls.airbrakes);
        spoilersDeployed = false;
        info("Spoilers RETRACTED");
    }

    const toggleSpoilerArm = () => {
        const inst = geofs.aircraft.instance;
        inst.animationValue ||= {};
        inst.animationValue.spoilerArming = inst.animationValue.spoilerArming ? 0 : 1;
        updateSplrOverlay();
        info(`SPLR ARM = ${inst.animationValue.spoilerArming ? "ARMED" : "DISARMED"}`);
    };

    function registerSpoilerSetter() {
        controls.setters ||= {};
        controls.setters.setSpoilerArming = {
            label: "Spoiler Arming",
            set: toggleSpoilerArm
        };
    }

    const toggleAutoBrake = () => {
        autoBrakeIndex = (autoBrakeIndex + 1) % autoBrakeModes.length;
        isAutoBrakeArmed = autoBrakeModes[autoBrakeIndex] !== "DISARM";
        if (!isAutoBrakeArmed) rtoActive = false;
        updateAbrkOverlay();
    };

    function checkTouchdownLogic() {
        const inst = geofs.aircraft.instance;
        if (!inst) return;

        const onGround = isOnGround(inst);
        const armed = inst.animationValue?.spoilerArming === 1;
        const spoilerPos = controls?.airbrakes?.target ?? 0;

        if (spoilerPos >= 0.9) spoilersDeployed = true;
        if (spoilerPos <= 0.1) spoilersDeployed = false;

        if (armed && onGround && !spoilersDeployed) {
            info("Touchdown + ARM → Auto deploy spoilers");
            deploySpoilers();
        }
        if (!armed && onGround && spoilersDeployed) {
            info("Disarmed on ground → Retracting spoilers");
            retractSpoilers();
        }

        if (armed && !onGround && spoilersDeployed) {
            info("Spoilers deployed while airborne → AUTO DISARM");

            try {
                inst.animationValue.spoilerArming = 0;
                updateSplrOverlay();
            } catch (e) {
                warn("Failed to auto-disarm spoilers in air", e);
            }
        }

        if (!isAutoBrakeArmed) return;

        const mode = autoBrakeModes[autoBrakeIndex];
        let brake = 0;

        if (mode === "RTO") {
            if (!rtoActive && inst.groundSpeed > 44 && controls.throttle === 0 && onGround) {
                rtoActive = true;
                info("RTO ACTIVATED");
            }
            if (rtoActive) brake = 1;
        } else {
            brake = { "1":0.2,"2":0.4,"3":0.6,"4":0.8,"MAX":1 }[mode] || 0;
        }

        controls.brakes = brake;
    }

    function createCustomOverlays() {
        splrOverlay = document.createElement("div");
        splrOverlay.style.cssText = `
            position:fixed;bottom:199px;right:12px;
            width:48px;height:48px;background:rgba(0,255,0,.8);
            color:#fff;font:12px monospace;font-weight:bold;
            text-align:center;line-height:24px;border-radius:5px;
            z-index:10000;display:none;pointer-events:none`;
        splrOverlay.innerHTML = "SPLR<br>ARM";
        document.body.appendChild(splrOverlay);

        abrkOverlay = document.createElement("div");
        abrkOverlay.style.cssText = splrOverlay.style.cssText.replace("199","147");
        abrkOverlay.innerHTML = "ABRK<br>RTO";
        document.body.appendChild(abrkOverlay);
    }

    function updateSplrOverlay() {
        const inst = geofs.aircraft.instance;
        splrOverlay.style.display =
            inst?.animationValue?.spoilerArming === 1 && areInstrumentsVisible()
            ? "block" : "none";
    }

    function updateAbrkOverlay() {
        const mode = autoBrakeModes[autoBrakeIndex];
        abrkOverlay.innerHTML = `ABRK<br>${mode}`;
        abrkOverlay.style.display =
            mode !== "DISARM" && areInstrumentsVisible() ? "block" : "none";
    }

    async function init() {
        await waitForGeoFS();
        registerSpoilerSetter();

        geofs.aircraft.instance.animationValue ||= {};
        geofs.aircraft.instance.animationValue.spoilerArming ||= 0;

        createCustomOverlays();
        updateSplrOverlay();
        updateAbrkOverlay();

        setInterval(checkTouchdownLogic, CHECK_INTERVAL_MS);
        setInterval(() => { updateSplrOverlay(); updateAbrkOverlay(); }, 500);

        document.addEventListener("keydown", e => {
            if (e.shiftKey && e.key === "?") {
                e.preventDefault();
                toggleSpoilerArm();
            }
            if (e.ctrlKey && e.key === "F11") {
                e.preventDefault();
                toggleAutoBrake();
            }
        });

        info("SPLR ARM & AUTO BRK v8.8 loaded");
    }

    init();
})();
