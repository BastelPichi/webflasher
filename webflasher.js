/* Copyright (c) 2024 BastelPichi
*
* The GPL License applies to this program. Please consult the LICENSE file. 
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*/
import * as libstlink from './src/lib/package.js';
import WebStlink from './src/webstlink.js';

var nb_scooters = ["esx", "max", "g2", "f", "f2", "4pro", "e", "g65", "e2pro"]; // technically the 4 pro is Xiaomi. However as we use the NB Bootloader, we will consider it as NB.
var mi_scooters = ["pro", "1s", "lite", "pro2", "mi3"];

var userfw;
var scooter;
var ble = false;
var strictRefresh = false;

function read_file_as_array_buffer(file) {
    return new Promise(function (resolve, reject) {
        let reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        };
        reader.onerror = function() {
            reject(reader.error);
        };
        reader.readAsArrayBuffer(file);
    });
}

function show_error_dialog(error) {
    let dialog = document.createElement("dialog");
    let header = document.createElement("h1");
    header.textContent = "Uh oh! Something went wrong.";
    let contents = document.createElement("p");
    contents.textContent = error.toString();
    let button = document.createElement("button");
    button.textContent = "Close";

    button.addEventListener("click", (evt) => {
        dialog.close();
    });

    dialog.addEventListener("close", (evt) => {
        dialog.remove();
    });

    dialog.appendChild(header);
    dialog.appendChild(contents);
    dialog.appendChild(document.createElement("br"));
    dialog.appendChild(button);

    document.querySelector("body").appendChild(dialog);

    dialog.showModal();
}

async function pick_sram_variant(mcu_list) {
    // Display a dialog with the MCU variants for the user to pick
    let dialog = document.querySelector("#mcuDialog");
    let tbody = dialog.querySelector("tbody");

    // Remove old entries
    for (let row of tbody.querySelectorAll("tr")) {
        tbody.removeChild(row);
    }

    var fake = document.getElementById("fake-text").checked

    var chip = "STM32"

    if (fake) {
        chip = "GD32"
    }

    try {
        return chip;
    } catch (e) {
        return null;
    }
}

function prevent_submission(event) {
    event.preventDefault();
    return false;
}

document.addEventListener('DOMContentLoaded', event => {
    var stlink = null;
    var curr_device = null;

    let log = document.querySelector("#log");
    let logger = new libstlink.Logger(1, log);
    
    let imagesDrv = document.querySelector("#images-drv")
    let imagesBle = document.querySelector("#images-ble")
    let flashButton = document.querySelector("#flashButton");
    let countdownButton = document.querySelector("#countdownButton");
    let scooterSelectionBle = document.querySelector("#ble-scooter");
    let scooterSelectionDrv = document.querySelector("#drv-scooter");
    let targetElm = document.getElementById("target");
    let dropZone = document.getElementById("dropZone");

    document.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.display = "block";
    });

    document.addEventListener("dragleave", (e) => {
        if (!e.relatedTarget || e.relatedTarget === document) {
            dropZone.style.display = "none";
        }
    });

    document.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.display = "none";

        logger.info("Uploading file...")
        const files = e.dataTransfer.files;
        if (files.length) {
            const file = files[0];
            const reader = new FileReader();

            reader.onload = function(event) {
                const arrayBuffer = event.target.result;
                
                logger.info("Upload Successful.");
                userfw = new Uint8Array(arrayBuffer);
            };

            reader.onerror = function() {
                logger.error("Error uploading.");
            };

            reader.readAsArrayBuffer(file);
        }
    });

    document.getElementById("accept").addEventListener("click", function() {
        document.getElementById("disclaimer-overlay").style.display = "none";
    });

    document.getElementById("accept-third-party").addEventListener("click", async function() {
        document.getElementById("third-party-overlay").style.display = "none";
        userfw = await binFetch(url.href)
    });

    targetElm.addEventListener("change", event => {
        if (targetElm.value == "ble") {
            ble = true;
            document.getElementById("drv-input").style.display = "none"
            document.getElementById("ble-input").style.display = "block"

            if (strictRefresh) {
                window.history.pushState({}, document.title, window.location.pathname + "?t=ble");
                location.reload()
            }
        } else {
            window.history.pushState({}, document.title, window.location.pathname);
            location.reload()
        }
    })

    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
      });

    if (params.firmware) {
        var url = new URL(params.firmware)
        if (!["http:", "https:", "ftp:"].includes(url.protocol)) {
            throw new Error("Invalid URL protocol");
        }

        strictRefresh = true;

        document.getElementById("third-party-overlay").style.display = "flex";
        document.getElementById("third-url").textContent = url.href.replace(/(.{70})/g,"$1\n")
    }

    if (params.t) {
        if (params.t == "ble") {
            ble = true;

            targetElm.value = "ble"
            document.getElementById("drv-input").style.display = "none"
            document.getElementById("ble-input").style.display = "block"
        }
    }

    var paramScooter = params.scooter;
    if (paramScooter) {
        paramScooter = paramScooter.toLowerCase();
        if (/^[a-z0-9]+$/.test(paramScooter)) {
            if (nb_scooters.includes(params.scooter) || mi_scooters.includes(params.scooter)) {

                if (ble) {
                    scooterSelectionBle.value = params.scooter;
                } else {
                    scooterSelectionDrv.value = params.scooter;
                    if (mi_scooters.includes(scooterSelectionDrv.value)) {
                        document.getElementById("fake-text").style.display = "block";
                    }
                }
            }
        }
    }

    imagesDrv.addEventListener('click', async function () {
        window.open("/images.html?t=drv&scooter=" + scooterSelectionDrv.value, "_blank").focus();
    })

    imagesBle.addEventListener('click', async function () {
        window.open("/images.html?t=ble&scooter=" + scooterSelectionBle.value, "_blank").focus();
    })

    scooterSelectionDrv.addEventListener("change", event => {
        if (mi_scooters.includes(scooterSelectionDrv.value)) {
            document.getElementById("fake-text").style.display = "block";
        } else {
            document.getElementById("fake-text").style.display = "none";
        }
    })

    flashButton.addEventListener('click', async function() {
        var device = await requestStlink();
        if (!device) { return; }
        startFlashing(device, ble)
    });

    countdownButton.addEventListener('click', async function() {
        var device = await requestStlink();
        if (!device) { return; }
        logger.info("Starting flashing in 15 seconds...");

        var countdown = 14;
        const cDown = setInterval(() => {
            logger.info("Starting flashing in " + countdown + " seconds...");
            countdown--;
        
            if (countdown < 0) {
                clearInterval(cDown);
                startFlashing(device, ble);
            }
        }, 1000);

    });
    
    window.setInterval(function() {
        log.scrollTop = log.scrollHeight;
      }, 500);


    async function binFetch(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                logger.error('Unexpected Response from Server.');
            }

            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        } catch (error) {
            logger.error('Error fetching required files.', error);
        }
    }


    async function getScooterData(uid, sn, km, scooter) {
        const snBytes = new TextEncoder().encode(sn);

        var scooterData;
        if (scooter == "4pro") {
            scooterData = await binFetch("./bin/data/4pro")
            scooterData.set(snBytes, 0xa8);
        } else {
            scooterData = await binFetch("./bin/data/default")
            scooterData.set(snBytes, 0x20);
        }

        scooterData.set(uid[0], 0x1b4);
        scooterData.set(uid[1], 0x1b8);
        scooterData.set(uid[2], 0x1bc);

        // Insert km (converted to bytes)
        const kmBytes = wordToBytes(Math.floor(km * 1000));
        scooterData.set(kmBytes, 0x52);

        return scooterData;
    }

    function createFullDump(bootloader, drv, scooterData, nb) {
        var dataOffset = 0xF800
        if (nb) {
            dataOffset = 0x1C000
        }

        const fullDump = new Uint8Array(dataOffset + scooterData.length);



        fullDump.set(bootloader, 0x0);

        fullDump.set(drv, 0x1000); 
        fullDump.set(scooterData, dataOffset);

        return fullDump;
    }

    function wordToBytes(word) {
        const bytes = new Uint8Array(4);
        bytes[0] = word & 0xFF;
        bytes[1] = (word >> 8) & 0xFF;
        bytes[2] = (word >> 16) & 0xFF;
        bytes[3] = (word >> 24) & 0xFF;
        return bytes;
    }

    function getBootloader(fake, nb) {
        var bootloader = "./bin/bootloader/"
            
        if (nb) {
            if (stlink._mcu.type == "AT32") {
                bootloader += "nb_DRV_AT32.bin"
            } else {
                bootloader += "nb_DRV.bin"
            }
        } else {
            if (fake) {
                bootloader += "mi_DRV_GD32.bin"
            } else {
                bootloader += "mi_DRV.bin"
            }
        }

        return bootloader
    }
        
    function getBle(scooter) {
        var url = ""

        switch (scooter) {
            case "esx": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/esx/BLE/1.1.0.bin"; break;
            case "1s": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/1s/BLE/1.3.4.bin"; break;
            case "f": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/f/BLE/3.0.7.bin"; break;
            case "f2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/828c25e06e098a9f55b9c6a57a18c0b474706285/f2/BLE/5.6.6.bin"; break; 
            case "lite": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/lite/BLE/1.3.4.bin"; break;
            case "mi3": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/mi3/BLE/1.5.2.bin"; break;
            case "max": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/max/BLE/1.1.7.bin"; break;
            case "g2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/g2/BLE/1.7.8.bin"; break;
            case "pro": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro/BLE/0.9.0.bin"; break;
            case "pro2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro2/BLE/1.2.9.bin"; break;
            case "4pro": url = "https://raw.githubusercontent.com/CamiAlfa/m365-Electric-Scooter-4-Pro-stlink/refs/heads/main/EC_ESC_Driver_V0.2.2_mod.bin"; break;
            case "e": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/e/BLE/2.1.3.bin"; break;
        }
        return url
    }

    function getDrv(scooter) {
        var url = ""

        switch (scooter) {
            case "esx": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/esx/DRV/1.6.4.bin"; break;
            case "1s": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/1s/DRV/3.1.9%20(Downgrade).bin"; break;
            case "f": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/f/DRV/5.8.4 (Compat).bin"; break;
            case "f2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/f2/DRV/1.7.8 (Compat).bin"; break; 
            case "lite": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/lite/DRV/2.4.5%20(Downgrade).bin"; break;
            case "mi3": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/mi3/DRV/0.1.7.bin"; break;
            case "max": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/max/DRV/1.6.13%20(Compat).bin"; break;
            case "g2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/g2/DRV/1.7.0%20(Compat).bin"; break;
            case "pro": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro/DRV/1.7.1.bin"; break;
            case "pro2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro2/DRV/2.5.2.bin"; break;
            case "e": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/e/DRV/2.7.1 (Compat).bin"; break;
            case "4pro": url = "https://raw.githubusercontent.com/CamiAlfa/m365-Electric-Scooter-4-Pro-stlink/refs/heads/main/EC_ESC_Driver_V0.2.2_mod.bin"; break;
        }
        return url
    }

    async function requestStlink() {
        try {
            let device = await navigator.usb.requestDevice({
                filters: libstlink.usb.filters
            });
            logger.clear();
            return device;
        } catch (err) {
            if (err.name == "NotFoundError") {
                logger.error("Error: No STLink selected. ")
                return;
            }
            logger.error(err);
            return;
        }
    }

    async function nvmc_ready() {
        for (var i=0; i < 200; i++) {
            if (await stlink._driver._stlink.get_debugreg32(0x4001e400) == 0x01) {
                return true;
            } else {
            }
        }
        return false;
    }
    
    // this doesnt belong here. Do I care? No.
    async function nvmc_ready() {
        for (var i=0; i < 200; i++) {
            if (await stlink._driver._stlink.get_debugreg32(0x4001e400) == 0x01) {
                return true;
            } else {
            }
        }
        return false;
    }

    async function flash_nrf(array, offset=0) {
        if (array.length % 4 !== 0) {
            throw new Error("Array length must be a multiple of 4 for 32-bit words.");
          }
        
          for (let i = 0; i < array.length; i += 1024) {
            let byteChunk = array.subarray(i, i + 1024);
        
			//console.log(byteChunk, i)
            await stlink._driver._stlink.set_mem32(offset+i, byteChunk);
            await nvmc_ready();
          }
    }

    function uidToHex(arr) {
        for (let i = 0; i < arr.length - 1; i += 2) {
            let temp = arr[i];
            arr[i] = arr[i + 1];
            arr[i + 1] = temp;
        }
    
        return Array.from(arr)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('').toUpperCase();
    }

    async function stats(scooter, ble) {
        await fetch("https://api.bastelpichi.de/wf/log", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ model: scooter, target: ble ? "ble" : "drv" }),
        });
    }
    

    async function startFlashing(device, ble) {
        var next_stlink;
        if (ble) {
            next_stlink = new WebStlink(logger, true, !document.getElementById("full-speed").checked);
        } else {
            next_stlink = new WebStlink(logger, false, false);
        }
        
            
        try {
            await next_stlink.attach(device, logger);
        } catch (error) {
            logger.error("Couldn't connect to MCU. Check your connections.")
        }
                
        stlink = next_stlink;
        curr_device = device;

        if (stlink !== null) {
            await on_successful_attach(stlink, curr_device);
        }

        if (stlink !== null && stlink.connected) {
            scooter = scooterSelectionDrv.value;

            if (ble) {
                scooter = scooterSelectionBle.value;
            }

            var fake = document.getElementById("fake").checked

            var nb = false
            if (nb_scooters.indexOf(scooter) >= 0) {
                nb = true
            }

            await stlink.reset(true)

            if (!ble) {
                if (!await stlink._driver.remove_rdp()) {
                    logger.error("Encountered an Error while removing RDP. If flashing completes successfully, theres no need to worry. (Check the console for details)")
                }

                await stlink.reset()
                    
                logger.info("Reading UID from Controller...")
                let memory = await stlink.read_memory(0x1FFFF7E8, 12);
                    
                var uid = [
                        new Uint8Array(Array.from(memory.slice(0, 4)).reverse()),
                        new Uint8Array(Array.from(memory.slice(4, 8)).reverse()),
                        new Uint8Array(Array.from(memory.slice(8, 12)).reverse())
                ]

		        logger.info("UID: " + uidToHex(memory))

                var sn = document.getElementById("sn").value
                if (sn == "") {
                    sn = "00000/000000000"
                }
                const scooterData = await getScooterData(uid, sn, parseInt(document.getElementById("km").value), scooter);

                var bootloader = await binFetch(getBootloader(fake, nb))

                var drv = userfw;
                
                if (!drv) {
                    var url = getDrv(scooter)

                    if (!url) {
                        logger.error("No Firmware file for this scooter.");
                        logger.error("Supply your own by Drag-and-Dropping it into this page.")
                        await stlink.detach();
                        on_disconnect();
                        return;
                    }

                    drv = await binFetch(url)
                }

                const fullDump = createFullDump(bootloader, drv, scooterData, nb);
                    
                try {
                    await stlink.flash(0x8000000, fullDump);
                } catch {
                    logger.error("Flashing failed. Please try again.")
                }

                await stlink.reset()

                logger.info("Flashing Done");
                await stats(scooter, ble)
            } else {
                logger.info("Erasing...")
            
                await stlink._driver._stlink.set_debugreg32(0x4001e504, 0x02) // enable erase
                if (!await nvmc_ready()) { return false; }
                await stlink._driver._stlink.set_debugreg32(0x4001e50c, 0x01) // erase all
                if (!await nvmc_ready()) { return false; }

                await stlink._driver._stlink.set_debugreg32(0x4001e504, 0x01) // enable write
                await stlink.reset(true)

                logger.info("Flashing...")
                await stlink._driver._stlink.set_debugreg32(0x4001e504, 0x01)
                await nvmc_ready();

                var v2 = false;
                if (["pro2", "1s", "lite", "mi3"].includes(scooter)) {
                    v2 = true;
                }

                var boot = new Uint8Array()
                var scooterName = new Uint8Array([
                    0x55, 0xAA, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4D, 0x49, 0x53, 0x63,
                    0x6F, 0x6F, 0x74, 0x65, 0x72, 0x30, 0x30, 0x30, 0x30, 0x00, 0x00, 0x00
                ]);

                var fw_addr = 0x18000;
                var boot_adress = 0x3C000
                var scooterDataAdress = 0x3B400

                if (v2) {
                    array = await binFetch("./bin/bootloader/mi_BLE_V2.bin")
                    boot = await binFetch("./bin/bootloader/boot-32k")

                    fw_addr = 0x1B000;
                    boot_adress = 0x3D000
                    scooterDataAdress = 0x3B800
                } else if (nb) {
                    array = await binFetch("./bin/bootloader/nb_BLE.bin")
                    boot = await binFetch("./bin/bootloader/boot-16k")

                    scooterName[8] = 0x4E
                    scooterName[9] = 0x42
                } else {
                    array = await binFetch("./bin/bootloader/mi_BLE.bin")
                    boot = await binFetch("./bin/bootloader/boot-16k")
                }

                var name = new TextEncoder().encode(document.getElementById("flash-name").value)
                if (name.length) {
                    scooterName.set(new Uint8Array(13), 8)
                    scooterName.set(name, 8)
                }

                if (v2) {
                    await stlink._driver._stlink.set_mem32(0x10001014, new Uint8Array([0x00, 0xD0, 0x03, 0x0]))
                } else {
                    await stlink._driver._stlink.set_mem32(0x10001014, new Uint8Array([0x00, 0xC0, 0x03, 0x0]))
                }
                await nvmc_ready()
                    
                await stlink._driver._stlink.set_mem32(scooterDataAdress, scooterName)
                await nvmc_ready()
                
                await flash_nrf(array)

                var array = userfw;
                if (!array) {
                    array = await binFetch(getBle(scooter))
                }
                await flash_nrf(array, fw_addr)
                
                flash_nrf(boot, boot_adress)

                await new Promise(r => setTimeout(r, 1000)); // wait a second before resetting. We have issues resetting the MCU if we dont do this.
                await stlink.reset()
                logger.info("Done!")
                await stats(scooter, ble)
            }

            if (stlink !== null) {
                await stlink.detach();
                on_disconnect();
            }       
        }
    }
        
    async function on_successful_attach(stlink, device) {
        // Export for manual debugging
        window.stlink = stlink;
        window.device = device;

        // Add disconnect handler
        navigator.usb.addEventListener('disconnect', function (evt) {
            if (evt.device === device) {
                navigator.usb.removeEventListener('disconnect', this);
                if (device === curr_device) {
                    on_disconnect();
                }
            }
        });

        // Detect attached target CPU
        let target = await stlink.detect_cpu([], pick_sram_variant);

        // Update the UI with detected target info and debug state
        let status = await stlink.inspect_cpu();
        if (!status.debug) {
            // Automatically enable debugging
            await stlink.set_debug_enable(true);
            status = await stlink.inspect_cpu();
        }
    }

    function on_disconnect() {
        logger.info("Device disconnected");
            
        stlink = null;
        curr_device = null;
    }

    if (navigator.userAgent.match(/SamsungBrowser/i) || (navigator.userAgent.includes("Android") && navigator.userAgent.includes("OPR"))) {
        logger.error("Samsung Internet/Opera Mobile is not supported. Please use Chrome.");
        flashButton.disabled = true;
        countdownButton.disabled = true;
    }

    if (typeof navigator.usb === 'undefined') {
        logger.error("WebUSB is either disabled or not available in this browser.");
        flashButton.disabled = true;
        countdownButton.disabled = true;
    }
});
