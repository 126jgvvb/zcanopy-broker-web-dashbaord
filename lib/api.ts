import { mockData } from './mockData';
import { decryptResponse } from './crypto';
import { optimizeImageFile } from './mediaOptimization';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export interface LandlordVerificationStatus {
  status: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  instrumentNumber?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  verificationId?: string | null;
  needsLandlordAuthorization?: boolean;
  landlordPhoneMasked?: string | null;
  landlord?: {
    fullName?: string;
    nin?: string;
    mzoDistrict?: string;
    tenureType?: string;
  } | null;
}

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

const VIDEO_FILE_PATTERN =
  /\.(mp4|m4v|mov|webm|3gp|3g2|avi|mkv|mts|m2ts|wmv|flv|ogv|mpeg|mpg)$/i;
const TRANSCODE_POLL_INTERVAL_MS = 3000;
// The server may keep working after this, and because it replaces the object
// in place the original URL still ends up pointing at the optimised file.
const TRANSCODE_TIMEOUT_MS = 5 * 60 * 1000;

function isVideoUpload(file: File): boolean {
  return file.type?.startsWith('video/') || VIDEO_FILE_PATTERN.test(file.name);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseUploadJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return (parsed?.encrypted ? await decryptResponse(parsed) : parsed) as T;
  } catch {
    return null;
  }
}

/**
 * Ask the gateway to re-encode an uploaded video in the background, then wait
 * for it to finish. Always resolves to a usable URL: if transcoding fails or
 * takes too long we keep the original upload rather than breaking the flow.
 */
async function waitForVideoTranscode(key: string, fallbackUrl: string): Promise<string> {
  if (!key) return fallbackUrl;

  try {
    const startRes = await fetch(buildApiUrl('/upload/transcode'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      cache: 'no-store',
    });
    if (!startRes.ok) return fallbackUrl;

    const started = await parseUploadJson<{ jobId?: string; status?: string; publicUrl?: string | null }>(startRes);
    if (started?.status === 'done' && started.publicUrl) return started.publicUrl;
    if (!started?.jobId) return fallbackUrl;

    const deadline = Date.now() + TRANSCODE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await delay(TRANSCODE_POLL_INTERVAL_MS);

      const statusRes = await fetch(
        buildApiUrl(`/upload/transcode/${encodeURIComponent(started.jobId)}`),
        { cache: 'no-store' },
      );
      if (statusRes.status === 404) return fallbackUrl;
      if (!statusRes.ok) continue;

      const job = await parseUploadJson<{ status?: string; publicUrl?: string | null }>(statusRes);
      if (!job) continue;
      if (job.status === 'done') return job.publicUrl || fallbackUrl;
      if (job.status === 'failed') return fallbackUrl;
    }
  } catch {
    // Fall through to the original upload.
  }

  return fallbackUrl;
}

export async function uploadToSpaces(file: File, folder = 'properties'): Promise<string> {
  // Compress/resize phone captures (and convert to WebP) before they leave the
  // device. Videos pass through unchanged; their poster frame is generated
  // separately for previews.
  const uploadFile = await optimizeImageFile(file);
  const isVideo = isVideoUpload(file);

  try {
    const { uploadUrl, publicUrl, key } = await getUploadPresignedUrl(
      uploadFile.name,
      uploadFile.type,
      folder,
    );

    if (!uploadUrl) {
      throw new Error('Missing upload URL from presign response');
    }

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: uploadFile,
      headers: {
        'Content-Type': uploadFile.type,
      },
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    // Phone videos are often 15-30 MB with an unbounded bitrate, which buffers
    // badly on mobile data. The gateway re-encodes them to a sane H.264/AAC MP4
    // and replaces the object in place.
    return isVideo ? waitForVideoTranscode(key, publicUrl) : publicUrl;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const proxied = await uploadToSpacesViaProxy(uploadFile, folder);
      return isVideo
        ? waitForVideoTranscode(proxied.key, proxied.publicUrl)
        : proxied.publicUrl;
    }
    throw error;
  }
}

async function uploadToSpacesViaProxy(
  file: File,
  folder = 'properties',
): Promise<{ key: string; publicUrl: string }> {
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
  return { key: data.key, publicUrl: data.publicUrl };
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

  /* ---- Landlord & title (UgNLIS) verification ---- */

  submitLandlordDetails: (token: string, payload: unknown) =>
    apiFetch('/web/broker/landlord-details', { method: 'POST', token, body: payload, fallback: { success: true, message: 'Landlord details submitted (mock)', status: 'pending' } }),

  sendLandlordBrokerOtps: (token: string, body: { fullName: string; nin: string; phoneNumber: string }) =>
    apiFetch('/web/broker/landlord-details/send-broker-otps', { method: 'POST', token, body, fallback: { success: true, message: 'Confirmation OTPs sent (mock)' } }),

  // The landlord-authorisation calls deliberately have no mock fallback: a
  // faked "verified" response would let a broker believe they were approved
  // when the server never approved them.
  sendLandlordAuthorizationOtp: (token: string, body: { verificationId: string }) =>
    apiFetch('/web/broker/landlord-details/authorization-otp', {
      method: 'POST',
      token,
      body,
    }),

  verifyLandlordAuthorization: (token: string, body: { verificationId: string; otp: string; landlordNin: string }) =>
    apiFetch('/web/broker/landlord-details/verify-authorization', {
      method: 'POST',
      token,
      body,
    }),

  getLandlordDetailsStatus: (token: string) =>
    apiFetch<LandlordVerificationStatus>('/web/broker/landlord-details/status', { token, fallback: { status: 'unsubmitted' } }),

  requestWithdrawalOtp: (token: string) =>
    apiFetch('/web/broker/withdraw/request-otp', { method: 'POST', token, body: {}, fallback: { success: true, message: 'OTP sent to landlord (mock)' } }),

  brokerLogout: (token: string) =>
    apiFetch('/web/broker/logout', { method: 'POST', token, body: {}, fallback: { success: true, message: 'Logged out successfully' } }),
};
