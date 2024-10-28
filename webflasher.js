import * as libstlink from './src/lib/package.js';
import WebStlink from './src/webstlink.js';
import { hex_octet_array } from './src/lib/util.js';


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

    var nb_scooters = ["max", "g2"];
    var mi_scooters = ["pro", "pro2"];

    var scooter = document.getElementById("scooter").value;
    var fake = document.getElementById("fake").checked

    var chip = "STM32"

    if (fake) {
        if (nb_scooters.indexOf(scooter) >= 0) {
            chip = "AT32"
        } else {
            chip = "GD32"
        }
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
    
    let images = document.querySelector("#images")
    let flashButton = document.querySelector("#flashButton");
    let countdownButton = document.querySelector("#countdownButton");
    let scooterSelection = document.querySelector("#scooter");


    document.getElementById("accept").addEventListener("click", function() {
        document.getElementById("disclaimer-overlay").style.display = "none";
    });

    images.addEventListener('click', async function () {
        window.open("/images.html?scooter=" + scooterSelection.value, "_blank").focus();
    })

    scooterSelection.addEventListener("change", event => {
        if (scooterSelection.value == "g2") {
            document.getElementById("fake").checked = true
        }
    })

    flashButton.addEventListener('click', async function() {
        var device = await requestStlink();
        if (!device) { return; }
        startFlashing(device)
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
                startFlashing(device);
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


function getScooterData(uid, sn, km) {
            const scooterData = new Uint8Array([
                0x5C, 0x51, 0xEE, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x08, 0x00, 0x08, 0x00, 0x08, 0x31, 0x33, 0x36, 0x37,
                0x38, 0x2F, 0x30, 0x30, 0x31, 0x31, 0x30, 0x30, 0x32, 0x39, 0x30, 0x30,
                0x30, 0x30, 0x30, 0x30, 0x34, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x20, 0x4E, 0x10, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x78, 0x56, 0x34, 0x12, 0xF0, 0xDE, 0xBC, 0x9A,
                0x78, 0x56, 0x34, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            const snBytes = new TextEncoder().encode(sn);
            scooterData.set(snBytes, 0x20);

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
        var bootloader = "/bootloader/"
        
        if (nb) {
            if (fake) {
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
    
    function getDrv(scooter) {
        var url = ""
        switch (scooter) {
            case "1s": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/1s/DRV/3.1.9%20(Downgrade).bin"; break;
            case "f": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/f/DRV/5.8.4%20(Compat).bin"; break;
            case "lite": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/lite/DRV/2.4.5%20(Downgrade).bin"; break;
            case "mi3": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/mi3/DRV/0.1.7.bin"; break;
            case "max": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/max/DRV/1.6.13%20(Compat).bin"; break;
            case "g2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/g2/DRV/1.7.0%20(Compat).bin"; break;
            case "pro": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro/DRV/1.7.1.bin"; break;
            case "pro2": url = "https://raw.githubusercontent.com/scooterhacking/firmware/master/pro2/DRV/2.5.2.bin"; break;
            
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
            if (err instanceof NotFoundError) {
                return;
            }
            logger.error(err);
            return;
        }
    }

    async function startFlashing(device) {
        let next_stlink = new WebStlink(logger);
        
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
            var nb_scooters = ["max", "g2", "f"];
            var mi_scooters = ["pro", "1s", "lite", "pro2", "mi3"];
        
            var scooter = document.getElementById("scooter").value;
            var fake = document.getElementById("fake").checked

            var nb = false
            if (nb_scooters.indexOf(scooter) >= 0) {
                nb = true
            }

            var chip = "STM32"
            if (fake) {
                if (nb) {
                    chip = "AT32"
                } else {
                    chip = "GD32"
                }
            }

            await stlink.reset(true)
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

            var sn = document.getElementById("sn")
            if (sn == "") {
                sn = "00000/000000000"
            }
            const scooterData = getScooterData(uid, sn, parseInt(document.getElementById("km"), 10));

            var bootloader = await binFetch(getBootloader(fake, nb))
            var drv = await binFetch(getDrv(scooter))

            const fullDump = createFullDump(bootloader, drv, scooterData, scooter, fake);
            
            try {
                await stlink.flash(0x8000000, fullDump);
            } catch {
                logger.error("Flashing failed. Please try again.")
            }

            await stlink.reset()

            logger.info("Flashed Successfully");

            if (stlink !== null)
            await stlink.detach();
            on_disconnect();
        

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

    if (typeof navigator.usb === 'undefined') {
        logger.error("WebUSB is either disabled or not available in this browser");
        flashButton.disabled = true;
        countdownButton.disabled = true;
    }
});
