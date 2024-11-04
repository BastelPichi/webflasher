/* nrf51.js
 * crimes against humanity - this is very hacky but "it-works":tm:
 *
 * Copyright Devan Lai 2017
 */

import { Logger } from './package.js';
import { Exception, Warning, UsbError } from './stlinkex.js';
import { Stm32FP } from './stm32fp.js';
import {
    hex_word as H32,
    async_sleep,
    async_timeout
} from './util.js';


class NRF51 extends Stm32FP {    
}


export { NRF51 };
