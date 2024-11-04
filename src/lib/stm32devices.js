/* stm32devices.js
 * STM32 series device hardware info and flash configurations
 *
 * Ported from lib/stm32devices.py in the pystlink project,
 * Copyright Pavel Revak 2015
 *
 *   : by PART_NO/CORE
 *       : by DEV_ID
 *           : by flash_size and or device type
 */

export default [
    {
        'part_no': 0xc23,
        'core': 'CortexM3',
        'idcode_reg': 0xE0042000,
        'devices': [
            {
                'dev_id': 0x410,
                'flash_size_reg': 0x1ffff7e0,
                'flash_driver': 'STM32FP',
                'erase_sizes': [1024],
                'devices': [
                    {'type': 'STM32', 'flash_size':  128, 'sram_size':  16, 'eeprom_size':  0, 'freq':  48},
                    {'type': 'GD32', 'flash_size':  128, 'sram_size':  20, 'eeprom_size':  0, 'freq':  72},
                ],
            },
        ],
    },
    {
        'part_no': 0xc24,
        'core': 'CortexM4',
        'idcode_reg': 0xE0042000,
        'devices': [
            {
                'dev_id': 0x1C5,
                'flash_size_reg': 0x1ffff7e0,
                'flash_driver': 'STM32FP',
                'erase_sizes': [1024],
                'devices': [
                    {'type': 'AT32', 'flash_size':  128, 'sram_size':  20, 'eeprom_size':  0, 'freq':  72},
                ],
            },
        ],
    },
    {
        'part_no': 0xc20,
        'core': 'CortexM0',
        'idcode_reg': 0x40015800,
        'devices': [
            {
                'dev_id': 0x00,
                'flash_size_reg': 0x10000014,
                'flash_driver': 'NRF51',
                'erase_sizes': [1024],
                'devices': [
                    {'type': 'NRF51', 'flash_size':   256, 'sram_size':   16, 'eeprom_size':  0, 'freq':  48},
                ],
            },
        ],
    },
];
