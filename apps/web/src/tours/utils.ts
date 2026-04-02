// apps/web/src/tours/utils.ts

/**
 * Polls the DOM every 100ms until the element matching `selector` appears,
 * or until `timeout` ms elapses. Returns the element or null.
 *
 * Used between tour steps that require navigating to a new route —
 * driver.js calls onNextClick synchronously, but React Router navigation
 * takes time before the DOM element exists.
 */
export function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) {
        console.warn(`[Tour] Element "${selector}" not found within ${timeout}ms — skipping step`);
        return resolve(null);
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}
