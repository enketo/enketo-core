/**
 * @module sniffer
 **/

const ua = navigator.userAgent;

// We usually don't need to know which OS is running, but want to know
// whether a specific OS is runnning.

/**
 * @namespace os
 **/
const os = {
    /**
     * @type string
     **/
    get ios() {
        return /iPad|iPhone|iPod/i.test( ua );
    },
    /**
     * @type string
     **/
    get android() {
        return /android/i.test( ua );
    }
};

export { os };
