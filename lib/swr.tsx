'use client';

import useSWR, { SWRConfig, SWRResponse, mutate as globalMutate } from 'swr';
import { webApi } from './api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zcanopy_token');
}

export const SWR_KEYS = {
  brokerProperties: () => ['brokerProperties', getToken()] as const,
  brokerPropertyDetails: (id: string) => ['brokerPropertyDetails', id, getToken()] as const,
  brokerSubscriptionDetails: () => ['brokerSubscriptionDetails', getToken()] as const,
  subscriptionPackages: () => ['subscriptionPackages', getToken()] as const,
  brokerDashboard: () => ['brokerDashboard', getToken()] as const,
  brokerBookings: () => ['brokerBookings', getToken()] as const,
  brokerWallet: () => ['brokerWallet', getToken()] as const,
  brokerNotifications: () => ['brokerNotifications', getToken()] as const,
  brokerProfile: () => ['brokerProfile', getToken()] as const,
};

async function brokerPropertiesFetcher() {
  const token = getToken();
  if (!token) throw new Error('No auth token');
  return webApi.brokerProperties(token);
}

async function brokerPropertyDetailsFetcher(key: readonly [string, string, string | null]) {
  const id = key[1];
  const token = key[2] || getToken();
  if (!token || !id) throw new Error('No auth token');
  return webApi.brokerPropertyDetails(token, id);
}

async function brokerSubscriptionDetailsFetcher() {
  const token = getToken();
  if (!token) throw new Error('No auth token');
  return webApi.brokerSubscriptionDetails(token);
}

async function subscriptionPackagesFetcher() {
  const token = getToken();
  if (!token) throw new Error('No auth token');
  return webApi.subscriptionPackages(token);
}

export function useBrokerProperties(): SWRResponse<any, any> {
  const key = SWR_KEYS.brokerProperties();
  return useSWR(key[0] ? key : null, brokerPropertiesFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function useBrokerPropertyDetails(id: string): SWRResponse<any, any> {
  const key = SWR_KEYS.brokerPropertyDetails(id);
  return useSWR(key[0] && key[1] ? key : null, brokerPropertyDetailsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function useBrokerSubscriptionDetails(): SWRResponse<any, any> {
  const key = SWR_KEYS.brokerSubscriptionDetails();
  return useSWR(key[0] ? key : null, brokerSubscriptionDetailsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function useSubscriptionPackages(): SWRResponse<any, any> {
  const key = SWR_KEYS.subscriptionPackages();
  return useSWR(key[0] ? key : null, subscriptionPackagesFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export async function revalidateProperties() {
  const key = SWR_KEYS.brokerProperties();
  if (key[0]) await globalMutate(key);
}

export async function revalidatePropertyDetails(id: string) {
  const key = SWR_KEYS.brokerPropertyDetails(id);
  if (key[0] && key[1]) await globalMutate(key);
}

export async function revalidateSubscriptionDetails() {
  const key = SWR_KEYS.brokerSubscriptionDetails();
  if (key[0]) await globalMutate(key);
}

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
