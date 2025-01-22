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

/**
 * Debounce factory. First invocation is immediate, subsequent calls w/i `cooldown` ms are debounced (only last in timeframe executes)
 * @param fn function to call
 * @param cooldown milliseconds to wait before subsequent invocations. ie: 1000ms cooldown will only call the function at most once every second
 */
export function debounce<T extends any[]>(fn: (...args: T) => void, cooldown = 1000) {
  let lastCall = 0;
  let timeout: number | undefined;

  return (...args: T) => {
    const now = Date.now();
    if (now - lastCall >= cooldown) {
      fn(...args); // Immediate invocation
      lastCall = now;
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
      }, cooldown - (now - lastCall));
    }
  };
}
