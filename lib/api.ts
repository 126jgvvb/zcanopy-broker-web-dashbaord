import { mockData } from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

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
  query?: Record<string, string | number | boolean | undefined>;
  fallback?: unknown;
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

export async function apiFetch<T = unknown>(
  path: string,
  { method = 'GET', body, token, query, fallback }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

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
        data = JSON.parse(text) as Record<string, unknown>;
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
  login: (email: string, password: string, type: 'broker' | 'customer' = 'broker') =>
    apiFetch<{ id: string; username: string; email: string; role: string; token: string }>(
      '/web/auth/login',
      { method: 'POST', body: { email, password, type }, fallback: mockData.login() },
    ),

  brokerLogin: (brokerCode: string, password: string) =>
    apiFetch<{ id: string; username: string; email: string; role: string; brokerCode: string; token: string }>(
      '/web/auth/broker/login',
      { method: 'POST', body: { brokerCode, password, deviceId: 'web-dashboard' }, fallback: mockData.brokerLogin() },
    ),

  brokerSetup: (body: unknown) =>
    apiFetch('/web/auth/broker/setup', { method: 'POST', body, fallback: { success: true, token: 'mock-token-broker' } }),

  publicProperties: (query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/public/properties', { query, fallback: mockData.properties() }),

  featuredProperties: (limit = 6) =>
    apiFetch<{ properties: any[]; total: number }>('/web/public/properties/featured', { query: { limit }, fallback: mockData.properties() }),

  propertyDetails: (id: string) =>
    apiFetch<{ property: any }>(`/web/public/properties/${id}`, { fallback: mockData.propertyDetails(id) }),

  searchProperties: (q: string) =>
    apiFetch<{ properties: any[]; total: number }>(`/web/public/search?q=${encodeURIComponent(q)}`, { fallback: mockData.search(q) }),

  brokerProperties: (token: string, query?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<{ properties: any[]; total: number }>('/web/broker/properties', { token, query, fallback: mockData.brokerProperties() }),

  brokerPropertyDetails: (token: string, id: string) =>
    apiFetch<{ property: any }>(`/web/broker/properties/${id}`, { token, fallback: mockData.propertyDetails(id) }),

  createProperty: (token: string, body: unknown) =>
    apiFetch('/web/broker/properties', { method: 'POST', token, body, fallback: { success: true, property: { id: 'mock-prop-1' } } }),

  updateProperty: (token: string, id: string, body: unknown) =>
    apiFetch(`/web/broker/properties/${id}`, { method: 'PUT', token, body, fallback: { success: true } }),

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
    apiFetch('/broker/register', { method: 'POST', body, fallback: { brokerId: 'mock-broker-1', email: (body as any)?.email, phoneNumber: (body as any)?.phoneNumber, brokerCode: '' } }),

  sendBrokerOtp: (body: unknown) =>
    apiFetch('/broker/otp/send', { method: 'POST', body, fallback: { success: true, message: 'OTP sent', expiresInSeconds: 600 } }),

  verifyBrokerOtp: (body: unknown) =>
    apiFetch('/broker/otp/verify', { method: 'POST', body, fallback: { success: true, message: 'Verified', brokerCode: 'BRK-MOCK-1' } }),

  createCustomerSession: (body: unknown) =>
    apiFetch('/customer/session', { method: 'POST', body, fallback: { sessionToken: 'mock-customer-session', customerId: 'mock-customer-1' } }),
};
