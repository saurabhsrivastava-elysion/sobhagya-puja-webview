import type { MouseEvent } from 'react';

/**
 * Bridge to the Sobhagya Flutter app (flutter_inappwebview), same as the consultation call in
 * sobhagya-chat-new: the webview only tells the app to start a call, and the app does the rest.
 *
 *   window.flutter_inappwebview.callHandler('startPujaCall', {
 *     bookingId: string,          // puja booking id
 *     threadId: string,           // puja chat thread id (same as bookingId)
 *     callType: 'call' | 'video',
 *   })
 *
 * The app then calls calling-service `POST /call/initialize/puja?channel=<unique id>` with
 * `{ bookingId, appVersion, callType }` and opens its call screen with the returned details.
 *
 * Outside the app (browser, dev launcher) nothing is sent. The fallback to the in-webview call page
 * is disabled for now; see handOffCallToApp.
 */
export const START_PUJA_CALL_HANDLER = 'startPujaCall';

export type CallType = 'call' | 'video';

/** After a tap, further taps are ignored this long (same as sobhagya-chat-new's call buttons). */
const CALL_COOLDOWN_MS = 3000;
let busyUntil = 0;

export function isInApp(): boolean {
  return typeof window !== 'undefined' && typeof window.flutter_inappwebview?.callHandler === 'function';
}

/** Asks the app to start a pooja call. */
export function startPujaCallInApp(bookingId: string, callType: CallType): void {
  if (Date.now() < busyUntil) return;
  busyUntil = Date.now() + CALL_COOLDOWN_MS;
  void window.flutter_inappwebview?.callHandler(START_PUJA_CALL_HANDLER, {
    bookingId,
    threadId: bookingId,
    callType,
  });
}

/**
 * onClick for the call links: inside the app, cancels the link navigation and hands the call to the
 * app; otherwise lets the link open the in-webview call page as before.
 */
export function handOffCallToApp(bookingId: string, callType: CallType) {
  return (event: MouseEvent) => {
    // FALLBACK DISABLED FOR NOW: calls run only through the app; in a browser the buttons do nothing.
    // To test the in-webview call page from a browser again, uncomment the next line.
    // if (!isInApp()) return;
    event.preventDefault();
    startPujaCallInApp(bookingId, callType);
  };
}

declare global {
  interface Window {
    flutter_inappwebview?: { callHandler: (handlerName: string, ...args: unknown[]) => Promise<unknown> };
  }
}
