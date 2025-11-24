# GeoFS-SPLR-ARM-AUTO-BRK

A powerful Tampermonkey user script that adds **realistic spoiler and auto brake functionality** to GeoFS. Ideal for airliners and some planes, the script streamlines your landing and rejected takeoff (RTO) procedures.

It ensures your **spoilers** deploy and your **brakes** engage the moment your wheels touch the ground — provided you've armed them — while also supporting **manual braking** when auto brake is disarmed.

---

## ✨ Features

| Feature | Shortcut | Activation | Description |
|---------|----------|------------|-------------|
| **Spoiler Arm** | <kbd>Shift</kbd> + <kbd>/</kbd> | On Touchdown | Toggles the arming state of the spoilers. When armed, spoilers automatically deploy to full when the aircraft detects **ground contact**. |
| **Auto Brake** | <kbd>Ctrl</kbd> + <kbd>F11</kbd> | On Touchdown / RTO | Cycles through **RTO → DISARM → 1 → 2 → 3 → 4 → MAX**. Once armed, brakes are applied automatically based on mode: <br>- **RTO**: triggers if thrust is cut to idle above ~36 m/s, holds MAX braking until ~8 m/s.<br>- **1–MAX**: applies fixed braking levels.<br>- **DISARM**: brakes are fully manual; pilot input is respected. |

---

# GeoFS Real-World Autobrake Add-on

This add-on dynamically modifies the brake forces within GeoFS to simulate the authentic autobrake system behavior and strength of specific real-world commercial airliners.

---

## :airplane: Currently Supported Aircraft

The add-on automatically detects which aircraft you are flying and applies its corresponding IRL brake force settings and deceleration logic.
---
 * Boeing 737-700, ID: 4
---
If you are using an unsupported aircraft model in GeoFS (e.g., Airbus A350), the add-on defaults to the B737-700 settings. (Brake Strength)

# 💬 Suggestions & Feedback
If you would like to suggest adding authentic brake forces for another aircraft model, please join our [Discord Server](https://discord.gg/MF5M5cAuS3).
We welcome suggestions to expand the realism of this add-on!

---

## 🚀 Installation

This script requires **Tampermonkey**.

1. **Install Tampermonkey:** Get the extension for your browser.

   * [Tampermonkey for Chrome](https://www.tampermonkey.net/index.php?browser=chrome&locale=en)
   * [Tampermonkey for Edge](https://www.tampermonkey.net/index.php?browser=edge&locale=en)

2. **Install the Script:**

   * Click [**here**](https://github.com/Ahmd-Tint/GeoFS-SPLR-ARM-AUTO-BRK/raw/main/main.user.js)
   * Tampermonkey will open a prompt to install the script.
   * Click **Install**.
   * Open GeoFS and enjoy!

---

## ⚙️ Usage Notes

- **RTO Mode:** Realistic rejected takeoff logic. Brakes **latch at MAX** until aircraft slows to ~0 m/s (~0 knots, ~0 kilometers per hour, or ~0 miles per hour).
- **DISARM Mode:** Auto brakes are disabled. Pilot can brake manually **without interference**. Even hold the parking brake.
- **Auto Brake Levels 1–MAX:** Apply predefined braking levels automatically on touchdown.
- **Spoilers:** Only deploy when armed and aircraft touches the ground.

---

## ⚠️ Licensing and Usage

This project is released under the **Creative Commons Attribution-NoDerivatives 4.0 International Public License (CC BY-ND 4.0)**.

* You are free to **share** the script in any medium or format.
* You **must give credit** to the original author (A7md-Tint).
* You **cannot remix, transform, or distribute derivative works**.
* You may **modify for personal use** but cannot distribute modified versions.

---

## ❓ Need Help?

Contact me via Discord: [Discord Server](https://discord.gg/MF5M5cAuS3)

## Changelogs (for nerds only)

* V1: Initial Release (GeoFS is missing the features this addon includes, that's why it was made)
* V2.2 Added levels of braking. (Speedbird came up with this realistic idea!)
* V3.3: Instead of notifications, added the following. "RTO" changes depending on the current auto-brake mode. (Speedbird came up with this realistic idea!)
<img width="66" height="115" alt="image" src="https://github.com/user-attachments/assets/a67db3ac-cef9-41d7-baf7-601a3ded2ee2" />
* V4.3: The default brake force is now the B737-700 setting when an unsupported aircraft is used.


