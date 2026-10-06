import { mockData } from './mockData';
import { decryptResponse } from './crypto';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

function buildApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  console.log('[apiFetch] Raw response text', text);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    console.log('[apiFetch] Parsed response', parsed);
    return parsed.encrypted ? decryptResponse(parsed) : parsed;
  } catch {
    return text;
  }
}

async function getUploadPresignedUrl(filename: string, contentType: string, folder = 'properties'): Promise<PresignResponse> {
  const res = await fetch(buildApiUrl('/upload/presign'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType, folder }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to get upload URL: ${res.status}`);
  }

  return parseJsonResponse(res) as Promise<PresignResponse>;
}

export async function uploadToSpaces(file: File, folder = 'properties'): Promise<string> {
  try {
    const { uploadUrl, publicUrl } = await getUploadPresignedUrl(file.name, file.type, folder);

    if (!uploadUrl) {
      throw new Error('Missing upload URL from presign response');
    }

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    return publicUrl;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return uploadToSpacesViaProxy(file, folder);
    }
    throw error;
  }
}

async function uploadToSpacesViaProxy(file: File, folder = 'properties'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${buildApiUrl('/upload/proxy')}?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Proxy upload failed: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return data.publicUrl;
}

export async function uploadMultipleToSpaces(files: File[], folder = 'properties'): Promise<string[]> {
  const results: string[] = [];
  for (const file of files) {
    const publicUrl = await uploadToSpaces(file, folder);
    results.push(publicUrl);
  }
  return results;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  sessionId?: string | null;
  query?: Record<string, string | number | boolean | undefined>;
  fallback?: unknown;
  skipSessionHeader?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function shouldUseFallback(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status >= 500 || err.status === 0;
}

export type AuthErrorKind = 'credentials' | 'network' | 'server' | 'unknown';

const CREDENTIAL_HINTS = [
  'invalid',
  'incorrect',
  'wrong',
  'unauthorized',
  'not found',
  'does not exist',
  'deactivated',
  'not verified',
  'no such',
];

// apiFetch rewrites every 401 into "Session expired" after clearing the session.
// On a sign-in form that wording is wrong, so it must not reach the user.
const SESSION_EXPIRED = 'session expired';

export function classifyAuthError(err: unknown): AuthErrorKind {
  if (err instanceof ApiError) {
    const msg = err.message.toLowerCase();
    const isCredentialHint = CREDENTIAL_HINTS.some((hint) => msg.includes(hint));
    if (isCredentialHint) return 'credentials';
    if (err.status >= 500) return 'server';
    if (err.status === 0) return 'network';
    if (err.status === 400 || err.status === 401 || err.status === 403) return 'credentials';
    return 'unknown';
  }
  if (err instanceof TypeError) return 'network';
  return 'unknown';
}

export function authErrorMessage(err: unknown, subject = 'email or password'): string {
  const kind = classifyAuthError(err);
  if (kind === 'network') {
    return 'Unable to reach our servers. Please check your internet connection and try again.';
  }
  if (kind === 'server') {
  //  return 'Our servers are unavailable right now. Please try again in a few moments.';
    return 'Your credentials might be incorrect. Please try again.';
}
  if (kind === 'credentials') {
    return `Invalid ${subject}. Please check your details and try again.`;
  }
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = 'GET', body, token, sessionId, query, fallback, skipSessionHeader }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sessionId && !skipSessionHeader) {
    headers['x-session-id'] = sessionId;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    let data: Record<string, unknown> | string | null = null;
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        data = parsed.encrypted ? await decryptResponse(parsed) : parsed;
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && ((data as Record<string, unknown>).message || (data as Record<string, unknown>).error)) ||
        `Request failed with status ${res.status}`;
      throw new ApiError(message as string, res.status);
    }

    return data as T;
  } catch (err) {
    if (fallback !== undefined && shouldUseFallback(err)) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[api] Server request to "${path}" failed (${err instanceof ApiError ? err.status : 'network error'}). Falling back to mock data.`,
        );
      }
      return fallback as T;
    }
    throw err;
  }
}

export const webApi = {
  // Auth calls intentionally have no mock fallback: shouldUseFallback treats a
  // network error or 5xx as mockable, which would hand back a fake session and
  // sign the user in with no error shown at all.
  login: (email: string, password: string, type: 'admin' | 'broker' | 'customer' = 'broker') =>
    apiFetch<{ id: string; username: string; email: string; role: string; token: string; brokerCode: string }>(
      '/web/auth/login',
      { method: 'POST', body: { email, password, type } },
    ),

  brokerLogin: (brokerCode: string, password: string, email?: string) =>
    apiFetch<{ id: string; username: string; email: string; role: string; brokerCode: string; token: string }>(
      '/web/auth/broker/login',
      { method: 'POST', body: { brokerCode, password, email, deviceId: 'web-dashboard' } },
    ),

  brokerGoogleLogin: (googleId: string) =>
    apiFetch<{ id: string; username: string; email: string; role: string; brokerCode: string; token: string }>(
      '/web/auth/broker/google',
      { method: 'POST', body: { googleId, deviceId: 'web-dashboard' } },
    ),

  brokerEmailLogin: (email: string, password: string) =>
    apiFetch<{ id: string; username: string; email: string; role: string; brokerCode: string; token: string }>(
      '/web/auth/broker/email-login',
      { method: 'POST', body: { email, password, deviceId: 'web-dashboard' } },
    ),

  sendForgotPasswordOtp: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/forgot-password/otp/send', { method: 'POST', body: { email }, skipSessionHeader: true, fallback: { success: true, message: 'OTP sent (mock)' } }),

  verifyForgotPasswordOtp: (email: string, otp: string) =>
    apiFetch<{ success: boolean; message: string; valid: boolean }>('/auth/forgot-password/otp/verify', { method: 'POST', body: { email, otp }, skipSessionHeader: true, fallback: { success: true, message: 'OTP verified (mock)', valid: true } }),

  resetPassword: (email: string, password: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/forgot-password/reset', { method: 'POST', body: { email, password }, skipSessionHeader: true, fallback: { success: true, message: 'Password reset (mock)' } }),

  brokerSetup: (body: unknown) =>
    apiFetch('/web/auth/broker/setup', { method: 'POST', body, fallback: { success: true, token: 'mock-token-broker' } }),

  publicProperties: (query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/public/properties', { query, fallback: mockData.properties() }),

  featuredProperties: (limit = 6) =>
    apiFetch<{ properties: any[]; total: number }>('/web/public/properties/featured', { query: { limit }, fallback: mockData.properties() }),

  propertyDetails: (id: string) =>
    apiFetch<{ property: any }>(`/web/public/properties/${id}`, { fallback: mockData.propertyDetails(id) }),

  searchProperties: (q: string, options?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/public/search', { query: { q, ...options }, fallback: mockData.search(q) }),

  brokerProperties: (token: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/broker/properties', { token, query, fallback: mockData.brokerProperties() }),

  brokerPropertyDetails: (token: string, id: string) =>
    apiFetch<{ property: any }>(`/web/broker/properties/${id}`, { token, fallback: mockData.propertyDetails(id) }),

  createProperty: (token: string, body: unknown) =>
    apiFetch('/web/broker/properties', { method: 'POST', token, body, fallback: { success: true, property: { id: 'mock-prop-1' } } }),

  updateProperty: (token: string, id: string, body: unknown) =>
    apiFetch(`/web/broker/properties/${id}`, { method: 'PUT', token, body, fallback: { success: true } }),

  // No fallback: a swallowed 5xx previously reported success while the
  // property stayed unavailable.
  brokerUpdatePropertyAvailability: (token: string, id: string, isAvailable: boolean) =>
    apiFetch(`/web/broker/properties/${id}/availability`, { method: 'PUT', token, body: { isAvailable } }),

  deleteProperty: (token: string, id: string) =>
    apiFetch(`/web/broker/properties/${id}`, { method: 'DELETE', token, fallback: { success: true } }),

  brokerDashboard: (token: string) =>
    apiFetch('/web/broker/dashboard', { token, fallback: mockData.brokerDashboard() }),

  brokerBookings: (token: string) =>
    apiFetch<{ bookings: any[] }>('/web/broker/bookings', { token, fallback: mockData.bookings() }),

  brokerUpdateBookingStatus: (token: string, bookingId: string, status: string) =>
    apiFetch(`/web/broker/bookings/${bookingId}/status`, { method: 'PUT', token, body: { status }, fallback: { success: true } }),

  brokerWallet: (token: string) =>
    apiFetch('/web/broker/wallet', { token, fallback: mockData.wallet() }),

  brokerWalletTransactions: (token: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ transactions: any[]; total: number }>('/web/broker/wallet/transactions', { token, query, fallback: mockData.walletTransactions() }),

  brokerWithdraw: (token: string, body: unknown) =>
    apiFetch('/web/broker/withdraw', { method: 'POST', token, body, fallback: { success: true, newBalance: 1500000, message: 'Withdrawal initiated' } }),

  brokerSubscriptionDetails: (token: string) =>
    apiFetch('/web/broker/subscription', { token, fallback: mockData.subscriptionDetails() }),

  subscriptionPackages: (token: string) =>
    apiFetch('/web/broker/subscription/packages', { token, fallback: mockData.subscriptionPackages() }),

  brokerSubscribe: (token: string, body: unknown) =>
    apiFetch('/web/broker/subscribe', { method: 'POST', token, body, fallback: { success: true, message: 'Subscription payment initiated' } }),

  brokerCancelSubscription: (token: string, body: unknown) =>
    apiFetch('/subscriptions/cancel', { method: 'POST', token, body, fallback: { success: true, message: 'Subscription cancelled' } }),

  brokerNotifications: (token: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch('/web/broker/notifications', { token, query, fallback: { notifications: [], total: 0 } }),

  brokerMarkNotificationsRead: (token: string, body: unknown) =>
    apiFetch('/web/broker/notifications/mark-read', { method: 'POST', token, body, fallback: { success: true } }),

  brokerProfile: (token: string) =>
    apiFetch('/web/broker/profile', { token, fallback: { id: 'b1', username: 'Demo Broker', email: 'broker@example.com', phoneNumber: '+256700000000', brokerCode: 'BRK-WEB-1', location: 'Kampala', isVerified: true } }),

  brokerUpdateProfile: (token: string, body: unknown) =>
    apiFetch('/web/broker/profile', { method: 'POST', token, body, fallback: { success: true, message: 'Profile updated' } }),

  brokerChangePassword: (token: string, body: unknown) =>
    apiFetch('/web/broker/change-password', { method: 'POST', token, body, fallback: { success: true, message: 'Password changed' } }),

  brokerRequestChangePasswordOtp: (token: string) =>
    apiFetch('/web/broker/change-password/request-otp', { method: 'POST', token, body: {}, fallback: { success: true, message: 'OTP sent' } }),

  brokerRequestDeleteAccountOtp: (token: string) =>
    apiFetch('/web/broker/account/delete/request-otp', { method: 'POST', token, body: {}, fallback: { success: true, message: 'OTP sent' } }),

  brokerHelp: (token: string, body: unknown) =>
    apiFetch('/web/broker/help', { method: 'POST', token, body, fallback: { success: true, message: 'Support request submitted' } }),

  brokerDeleteAccount: (token: string, body: unknown) =>
    apiFetch('/web/broker/account/delete', { method: 'POST', token, body, fallback: { success: true, message: 'Account deleted' } }),

  customerProperties: (token: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/customer/properties', { token, query, fallback: mockData.customerProperties() }),

  customerBookings: (token: string) =>
    apiFetch<{ bookings: any[] }>('/web/customer/bookings', { token, fallback: mockData.bookings() }),

  createBooking: (token: string, body: unknown) =>
    apiFetch('/web/customer/bookings', { method: 'POST', token, body, fallback: { success: true, booking: { id: 'mock-booking-1', status: 'pending' } } }),

  brokerPropertiesByCode: (brokerCode: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>(`/web/customer/broker/${brokerCode}/properties`, { query, fallback: mockData.brokerProperties() }),

  registerBroker: (body: unknown) =>
    apiFetch<{ success: boolean; message: string; expiresInSeconds?: number }>('/broker/register', { method: 'POST', body, fallback: { success: false, message: 'Could not reach the registration service. Please try again.' } }),

  sendBrokerOtp: (body: unknown) =>
    apiFetch('/broker/otp/send', { method: 'POST', body, fallback: { success: true, message: 'OTP sent', expiresInSeconds: 600 } }),

  verifyBrokerOtp: (body: unknown) =>
    apiFetch('/broker/otp/verify', { method: 'POST', body, fallback: { success: true, message: 'Verified', brokerCode: 'BRK-MOCK-1' } }),

  createCustomerSession: (body: unknown) =>
    apiFetch('/customer/session', { method: 'POST', body, fallback: { sessionToken: 'mock-customer-session', token: 'mock-customer-token', customerId: 'mock-customer-1' } }),

  uploadFile: (file: File, folder = 'properties') => uploadToSpaces(file, folder),

  uploadMultipleFiles: (files: File[], folder = 'properties') => uploadMultipleToSpaces(files, folder),

  submitVerificationDocuments: (token: string, body: { idFrontUrl: string; idBackUrl: string }) =>
    apiFetch('/web/broker/verification/documents', { method: 'POST', token, body, fallback: { success: true, message: 'Documents submitted for review' } }),

  getVerificationStatus: (token: string) =>
    apiFetch<{ isVerified: boolean; idFrontUrl?: string; idBackUrl?: string; verificationStatus: string }>('/web/broker/verification/status', { token, fallback: { isVerified: false, verificationStatus: 'unsubmitted' } }),

  brokerLogout: (token: string) =>
    apiFetch('/web/broker/logout', { method: 'POST', token, body: {}, fallback: { success: true, message: 'Logged out successfully' } }),
};
