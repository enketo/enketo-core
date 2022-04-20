/**
 * @callback OnIdle
 * @param {Function} callback
 * @param {number} maxDelay
 * @return {void}
 */

/** @type {OnIdle} */
const onIdle =
    typeof requestIdleCallback === 'function'
        ? (callback, timeout) => {
              requestIdleCallback(callback, { timeout });
          }
        : (callback) => {
              setTimeout(callback);
          };

/**
 * Queues `callback` to be called asynchronously:
 *
 * - using `requestIdleCallback` where supported, on idle or after `maxDelay` milliseconds
 *   (default: `10`), whichever comes first
 * - falling back to `setTimeout` with the minimum delay (varies by browser, but generally
 *   4 milliseconds
 *
 * @param {Function} callback
 * @param {number} maxDelay
 */
export const callOnIdle = (callback, maxDelay = 16) => {
    onIdle(callback, maxDelay);
};
