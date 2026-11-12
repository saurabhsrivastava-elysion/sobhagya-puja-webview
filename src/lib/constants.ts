export const APP_NAME = 'Sobhagya Puja';
export const pageTitle = (page: string) => `${page} · ${APP_NAME}`;

/** Puja times are Indian times for everyone; the backend works in IST too. */
export const TIME_ZONE = 'Asia/Kolkata';

/** Header carrying a rotated access token; webview tokens are re-fetched from auth-service instead. */
export const AUTH_TOKEN_HEADER = 'auth-token';
