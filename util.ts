/**
 * Debounce, retry on failure, and skip every other call for async functions
 * @param callback function to call
 * @param timeout time in ms for debouncing and for retries
 * @return callback with wrappers applied
 */
export function resilientAsyncDebounceSkipper<T extends any[]>(callback: (...args: T) => Promise<void>, timeout = 100) {
  let timeoutRef: number | undefined = undefined;
  // Skip every other move event (1st user-triggered, 2nd programmatic fixing)
  // proper way would probably be to incr counter for expected ignorable move events, then decr on every event. Resume taking action once = 0
  let shouldSkip = false;

  function wrappedFn(...args: T) {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
    timeoutRef = setTimeout(() => {
      timeoutRef = undefined;
      shouldSkip = !shouldSkip;
      if (!shouldSkip) return;
      callback(...args).catch(err => {
        shouldSkip = false;
        console.log(err, "retrying...");
        wrappedFn(...args);
      });
    }, timeout);
  }

  return wrappedFn;
}
