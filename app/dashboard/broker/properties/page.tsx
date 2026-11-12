'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropertyCard from '@/components/PropertyCard';
import StandardBookingPriceSelect from '@/components/StandardBookingPriceSelect';
import { webApi, uploadToSpaces } from '@/lib/api';

import { toCdnUrl } from '@/lib/mediaUrl';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { AlertTriangle, X } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { useBrokerProperties, useBrokerSubscriptionDetails, revalidateProperties } from '@/lib/swr';

const SCRIPT_ID = 'google-maps-script';

interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  location: string;
  isAvailable: boolean;
  createdAt: string;
  imageUrl?: string[];
  price?: number;
  brokerBookingFee?: number;
}

interface TierLimits {
  maxProperties: number;
  maxPhotosPerProperty: number;
  maxVideosPerProperty: number;
  maxVideoSizeMB: number;
}

const PROPERTY_TYPES = [
  {
    label: 'Single-Family Home / Villa (Bungalow, Townhouse)',
    value: 'single_family_villa',
    subtypes: ['Bungalow', 'Townhouse'],
  },
  {
    label: 'Apartment / Flat (Condominium, Studio)',
    value: 'apartment_flat',
    subtypes: ['Condominium', 'Studio'],
  },
  {
    label: 'Rentals / Muzigo (Single/Double room, Self-contained)',
    value: 'rentals_muzigo',
    subtypes: ['Single Room', 'Double Room', 'Self-contained'],
  },
  {
    label: 'Commercial Arcade / Retail (Shop unit, Stall, Mall)',
    value: 'commercial_arcade_retail',
    subtypes: ['Shop Unit', 'Stall', 'Mall'],
  },
  {
    label: 'Office Space (Plaza, Corporate tower)',
    value: 'office_space',
    subtypes: ['Plaza', 'Corporate Tower'],
  },
  {
    label: 'Warehouse / Go-down (Storage, Depot)',
    value: 'warehouse_godown',
    subtypes: ['Storage', 'Depot'],
  },
  {
    label: 'Residential Plot (Plot of land, land)',
    value: 'residential_plot',
    subtypes: ['Plot of Land'],
  },
  {
    label: 'Agricultural Land (Farmland, Acreage, Mailo land)',
    value: 'agricultural_land',
    subtypes: ['Farmland', 'Acreage', 'Mailo Land'],
  },
  {
    label: 'Hotel / Guest House / Safari Lodge / Lodge',
    value: 'hotel_guesthouse_lodge',
    subtypes: ['Hotel', 'Guest House', 'Safari Lodge', 'Lodge'],
  },
  {
    label: 'Mixed-Use Building (Shops below, Flats above)',
    value: 'mixed_use_building',
    subtypes: ['Shops Below, Flats Above'],
  },
] as const;


export default function BrokerPropertiesPage() {
  const [mapsReady, setMapsReady] = useState(false);

  /**
   * Loads the Google Maps script (with the Places library) on demand. It is
   * only needed once the broker touches the location field or asks for their
   * GPS position, so it no longer sits in the initial page payload.
   */
  const loadMaps = useCallback(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') return;
    if (mapsReady) return;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.maps) {
        setMapsReady(true);
      } else {
        existing.addEventListener('load', () => setMapsReady(true));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => setMapsReady(true));
    document.head.appendChild(script);
  }, [mapsReady]);

  const propertiesQuery = useBrokerProperties();
  const subscriptionQuery = useBrokerSubscriptionDetails();

  const properties: Property[] = (propertiesQuery.data as any)?.properties || [];
  const loading = propertiesQuery.isLoading && subscriptionQuery.isLoading;
  const error = (propertiesQuery.error || subscriptionQuery.error) ? 'Failed to load properties' : '';

  const limits = (subscriptionQuery.data as any)?.limits || {};
  const tier = {
    name: (subscriptionQuery.data as any)?.subscriptionTier || 'prop',
    limits: {
      maxProperties: limits.maxProperties || 5,
      maxPhotosPerProperty: limits.maxPhotosPerProperty || 15,
      maxVideosPerProperty: limits.maxVideosPerProperty || 1,
      maxVideoSizeMB: limits.maxVideoSizeMB || 500,
    } as TierLimits,
  };

  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  // propertyCategory is for UI grouping only; propertyType stores the selected subtype
  const [createForm, setCreateForm] = useState({ title: '', description: '', propertyCategory: '', propertyType: '', location: '', price: '', brokerBookingFee: '' });
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState<{ type: 'error'; message: string } | null>(null);
  const [priceError, setPriceError] = useState('');
  const [feeError, setFeeError] = useState('');
  // The broker has to state explicitly whether they are standing at the
  // property. The answer decides what is saved: "yes" attaches the property's
  // coordinates, "no" saves the location name only. It has no default, so it
  // must be answered before the listing can be submitted.
  const [atPropertyLocation, setAtPropertyLocation] = useState<'yes' | 'no' | ''>('');
  const [locationError, setLocationError] = useState('');
  // Device position, captured only once the broker confirms they are on site.
  const [gpsLat, setGpsLat] = useState(0);
  const [gpsLng, setGpsLng] = useState(0);
  // Coordinates of the suggestion the broker picked from the search list.
  const [placeLat, setPlaceLat] = useState(0);
  const [placeLng, setPlaceLng] = useState(0);
  // Set once the broker edits the location text, so the reverse-geocoded name
  // never overwrites what they typed.
  const locationTouchedRef = useRef(false);

  // The coordinates saved with the listing. They are only used when the broker
  // confirmed they are at the property: the device position wins, then the
  // suggestion they picked, then (on submit) the address they typed.
  const resolvedCoords = useMemo(() => {
    if (atPropertyLocation !== 'yes') return null;
    if (gpsLat !== 0 && gpsLng !== 0) return { lat: gpsLat, lng: gpsLng };
    if (placeLat !== 0 && placeLng !== 0) return { lat: placeLat, lng: placeLng };
    return null;
  }, [atPropertyLocation, gpsLat, gpsLng, placeLat, placeLng]);

  const validatePriceAndFee = (price: string, fee: string) => {
    const priceNum = Number(price);
    const feeNum = Number(fee);
    let hasError = false;
    if (feeNum && feeNum < 5000) {
      setFeeError('Broker booking fee must be at least 5,000 UGX');
      hasError = true;
    } else {
      setFeeError('');
    }
    if (priceNum && feeNum && priceNum <= feeNum) {
      setPriceError('Price must be greater than the broker booking fee');
      hasError = true;
    } else {
      setPriceError('');
    }
    return !hasError;
  };

  // The device position is only requested once the broker has confirmed they
  // are standing at the property — that is the only case where coordinates are
  // saved with the listing.
  useEffect(() => {
    if (atPropertyLocation === 'yes') loadMaps();
    if (atPropertyLocation !== 'yes') {
      if (atPropertyLocation === 'no') {
        setGpsLat(0);
        setGpsLng(0);
      }
      return;
    }
    if (!navigator.geolocation) {
      setGpsLat(0);
      setGpsLng(0);
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
      },
      () => {
        if (cancelled) return;
        setGpsLat(0);
        setGpsLng(0);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [atPropertyLocation, loadMaps]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    if (!window.google?.maps) return;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<any>((resolve) => {
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0]);
          } else {
            resolve(undefined);
          }
        });
      });
      if (result?.formatted_address && !locationTouchedRef.current) {
        setCreateForm((prev) => ({ ...prev, location: result.formatted_address }));
      }
    } catch {
      // ignore reverse geocode failure
    }
  };

  // Fill the location name from the device position, but never overwrite a
  // name the broker typed themselves.
  useEffect(() => {
    if (atPropertyLocation !== 'yes') return;
    if (gpsLat === 0 || gpsLng === 0) return;
    if (!mapsReady) return;
    reverseGeocode(gpsLat, gpsLng);
  }, [gpsLat, gpsLng, atPropertyLocation, mapsReady]);

  /**
   * Turns a hand-typed location into coordinates. Used when the broker
   * confirms they are at the property but typed the address instead of picking
   * one of the suggestions (which already carry coordinates).
   */
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim() || !window.google?.maps) return null;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<any>((resolve) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
          resolve(status === 'OK' && results?.[0] ? results[0] : undefined);
        });
      });
      const location = result?.geometry?.location;
      if (!location) return null;
      return { lat: location.lat(), lng: location.lng() };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!showCreate) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout>;

    const fetchSuggestions = async (query: string) => {
      if (!window.google?.maps?.places) {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
        setLocationLoading(false);
        return;
      }
      if (query.trim().length < 2) {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
        setLocationLoading(false);
        return;
      }
      setLocationLoading(true);
      try {
        const service = new window.google.maps.places.AutocompleteService();
        const predictions = await new Promise<any[]>((resolve) => {
          service.getPlacePredictions(
            { input: query, types: ['geocode'] },
            (results: any, status: any) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                resolve([]);
              }
            },
          );
        });
        if (predictions.length > 0) {
          setLocationSuggestions(
            predictions.map((p) => ({
              description: p.description,
              placeId: p.place_id,
            })),
          );
          setShowLocationDropdown(true);
        } else {
          setLocationSuggestions([]);
          setShowLocationDropdown(false);
        }
      } catch {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
      } finally {
        setLocationLoading(false);
      }
    };

    if (createForm.location.trim().length >= 2) {
      debounceTimer = setTimeout(() => fetchSuggestions(createForm.location), 300);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }

    return () => clearTimeout(debounceTimer);
  }, [createForm.location, showCreate, mapsReady]);


  const handleLocationSelect = async (description: string, placeId: string) => {
    setCreateForm((prev) => ({ ...prev, location: description }));
    setShowLocationDropdown(false);
    setLocationSuggestions([]);

    if (!window.google?.maps) return;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<any>((resolve) => {
        geocoder.geocode({ placeId }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0]);
          } else {
            resolve(undefined);
          }
        });
      });
      if (result?.geometry?.location) {
        setPlaceLat(result.geometry.location.lat());
        setPlaceLng(result.geometry.location.lng());
      }
    } catch {
      // ignore geocode failure
    }
  };

  const filtered = properties.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = !propertyType || p.propertyType === propertyType;
    return matchesSearch && matchesType;
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files);

    const remainingSlots = tier.limits.maxPhotosPerProperty - photos.length;
    if (remainingSlots <= 0) {
      setUploadDialog({
        type: 'error',
        message: `Maximum ${tier.limits.maxPhotosPerProperty} photos already uploaded for ${tier.name} plan`,
      });
      return;
    }
    if (newPhotos.length > remainingSlots) {
      setUploadDialog({
        type: 'error',
        message: `You can only upload ${remainingSlots} more photo(s) on the ${tier.name} plan`,
      });
      return;
    }

    setPhotoUploading(true);
    try {
      const uploadPromises = newPhotos.map((f) => uploadToSpaces(f, 'properties'));
      const urls = await Promise.all(uploadPromises);
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      setUploadDialog({ type: 'error', message: 'Failed to upload photos. Please try again.' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (tier.limits.maxVideosPerProperty === 0) {
      setUploadDialog({
        type: 'error',
        message: 'Video upload is not available on your current plan',
      });
      return;
    }
    if (tier.limits.maxVideosPerProperty > 0 && tier.limits.maxVideosPerProperty <= (video ? 1 : 0)) {
      setUploadDialog({
        type: 'error',
        message: `Maximum ${tier.limits.maxVideosPerProperty} video(s) already uploaded for ${tier.name} plan`,
      });
      return;
    }
    setVideoUploading(true);
    // Start poster extraction immediately, but never let it delay the video
    // preview: the upload result is shown as soon as it lands.
    // The poster encoder is only needed while uploading a video.
    const posterPromise = import('@/lib/mediaOptimization')
      .then((m) => m.createVideoPoster(file))
      .catch(() => null);
    try {
      const url = await uploadToSpaces(file, 'properties');
      setVideo(url);
      setVideoPoster(null);
      setVideoUploading(false);
      const poster = await posterPromise;
      if (poster?.dataUrl) setVideoPoster(poster.dataUrl);
    } catch {
      setUploadDialog({ type: 'error', message: 'Failed to upload video. Please try again.' });
    } finally {
      setVideoUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    // Validate price and fee before submitting
    if (!validatePriceAndFee(createForm.price, createForm.brokerBookingFee)) {
      return;
    }

    // The broker has to answer the on-site question explicitly; without it we
    // cannot know whether to save coordinates or just the location name.
    setLocationError('');
    if (!atPropertyLocation) {
      setLocationError('You must confirm whether you are at the property location before submitting.');
      return;
    }
    if (!createForm.location.trim()) {
      setLocationError('Enter the property location before submitting.');
      return;
    }

    let submitLat = 0;
    let submitLng = 0;
    if (atPropertyLocation === 'yes') {
      const coords = resolvedCoords ?? (await geocodeAddress(createForm.location));
      if (!coords) {
        setLocationError(
          "We couldn't find coordinates for that location. Pick a suggestion from the list, or choose \"No\" to save the location name only.",
        );
        return;
      }
      submitLat = coords.lat;
      submitLng = coords.lng;
    }

    setCreating(true);
    try {
      await webApi.createProperty(token, {
        title: createForm.title,
        description: createForm.description,
        propertyType: createForm.propertyType,
        location: createForm.location,
        price: Number(createForm.price),
        brokerBookingFee: Number(createForm.brokerBookingFee),
        brokersUniqueCode: 'BRK-WEB-1',
        imageUrl: photos,
        videoUrl: video ? [video] : [],
        lat: submitLat,
        lng: submitLng,
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', propertyCategory: '', propertyType: '', location: '', price: '', brokerBookingFee: '' });
      setPriceError('');
      setFeeError('');
      setAtPropertyLocation('');
      setLocationError('');
      setGpsLat(0);
      setGpsLng(0);
      setPlaceLat(0);
      setPlaceLng(0);
      locationTouchedRef.current = false;
      setPhotos([]);
      setVideo(null);
      setVideoPoster(null);
      await revalidateProperties();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingState label="Loading properties" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="zc-kicker">Listings</p>
          <h2 className="mt-1 text-3xl text-[var(--zcanopy-card-brown)] sm:text-4xl">My Properties</h2>
          <p className="mt-1 text-[var(--zcanopy-muted)]">Manage and refine your portfolio.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-xl bg-[var(--zcanopy-primary)] px-5 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)]"
        >
          {showCreate ? 'Cancel' : 'Add Property'}
        </button>
      </div>

      {showCreate && (
        <Panel title="Add New Property">
          <div className="mb-4 rounded-2xl border border-[var(--zcanopy-border)] bg-[color-mix(in_srgb,var(--zcanopy-accent-gold)_10%,transparent)] p-4">
            <p className="text-sm font-medium text-[var(--zcanopy-card-brown)]">Current Plan: <span className="font-semibold tracking-wide" style={{ color: COLORS.primary }}>{tier.name.toUpperCase()}</span></p>
            <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">
              Photos: {photos.length}/{tier.limits.maxPhotosPerProperty} • Videos: {video ? '1' : '0'}/{tier.limits.maxVideosPerProperty} • Max video size: {tier.limits.maxVideoSizeMB}MB
            </p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Property Category</label>
                <select
                  value={createForm.propertyCategory}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, propertyCategory: e.target.value, propertyType: '' }))}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                  required
                >
                  <option value="">Select a category</option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {createForm.propertyCategory && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Property Type <span className="text-red-500">*</span></label>
                  <select
                    value={createForm.propertyType}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, propertyType: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                    required
                  >
                    <option value="">Select a type</option>
                    {PROPERTY_TYPES.find((t) => t.value === createForm.propertyCategory)?.subtypes.map((subtype) => (
                      <option key={subtype} value={subtype}>
                        {subtype}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Please explicitly choose the specific property type.</p>
                </div>
              )}
            </div>
            <div
              className={`rounded-2xl border-2 p-4 ${
                locationError
                  ? 'border-[var(--zcanopy-danger)] bg-[var(--zcanopy-danger-soft)]'
                  : 'border-[var(--zcanopy-primary)] bg-[color-mix(in_srgb,var(--zcanopy-accent-gold)_12%,var(--zcanopy-surface))]'
              }`}
            >
              <p className="flex items-start gap-2 text-sm font-bold text-[var(--zcanopy-card-brown)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--zcanopy-primary)]" />
                <span>
                  You must confirm: are you at the property location? <span className="text-[var(--zcanopy-danger)]">*</span>
                </span>
              </p>
              <p className="mt-1 pl-6 text-xs text-[var(--zcanopy-text-secondary)]">
                This cannot be skipped — the property will not submit until you answer. It decides what is saved with the listing.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-3 transition-colors ${
                    atPropertyLocation === 'yes'
                      ? 'border-[var(--zcanopy-primary)] bg-[color-mix(in_srgb,var(--zcanopy-primary)_10%,var(--zcanopy-surface))] shadow-[var(--zcanopy-shadow)]'
                      : 'border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] hover:border-[var(--zcanopy-primary)]/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="at-property-location"
                    value="yes"
                    checked={atPropertyLocation === 'yes'}
                    onChange={() => {
                      setAtPropertyLocation('yes');
                      setLocationError('');
                    }}
                    className="mt-0.5 h-4 w-4 accent-[var(--zcanopy-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--zcanopy-card-brown)]">Yes — I am at the property</span>
                    <span className="mt-0.5 block text-xs text-[var(--zcanopy-text-secondary)]">
                      The location is captured from your current position and its coordinates are saved for maps and nearby search.
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-3 transition-colors ${
                    atPropertyLocation === 'no'
                      ? 'border-[var(--zcanopy-primary)] bg-[color-mix(in_srgb,var(--zcanopy-primary)_10%,var(--zcanopy-surface))] shadow-[var(--zcanopy-shadow)]'
                      : 'border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] hover:border-[var(--zcanopy-primary)]/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="at-property-location"
                    value="no"
                    checked={atPropertyLocation === 'no'}
                    onChange={() => {
                      setAtPropertyLocation('no');
                      setLocationError('');
                      // Drop a name that was auto-filled from the device
                      // position — the broker now types the real location.
                      if (!locationTouchedRef.current) {
                        setCreateForm((prev) => ({ ...prev, location: '' }));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 accent-[var(--zcanopy-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--zcanopy-card-brown)]">No — I am not there</span>
                    <span className="mt-0.5 block text-xs text-[var(--zcanopy-text-secondary)]">
                      Type the location below. Only the location name is saved — no coordinates are attached to the listing.
                    </span>
                  </span>
                </label>
              </div>
              {locationError && <p className="mt-2 text-xs font-semibold text-[var(--zcanopy-danger)]">{locationError}</p>}
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Location</label>
              <input
                ref={locationInputRef}
                type="text"
                value={createForm.location}
                onChange={(e) => {
                  // Remember that the broker typed the name themselves, so the
                  // reverse-geocoded name never overwrites it.
                  locationTouchedRef.current = true;
                  setCreateForm({ ...createForm, location: e.target.value });
                }}
                onFocus={() => {
                  loadMaps();
                  if (createForm.location.trim().length >= 2) {
                    setShowLocationDropdown(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                placeholder="Search for a location..."
                required
                autoComplete="off"
              />
              {showLocationDropdown && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] shadow-lg">
                  {locationLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                  ) : locationSuggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No suggestions found</div>
                  ) : (
                    locationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.placeId}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleLocationSelect(suggestion.description, suggestion.placeId)}
                        className="w-full break-words px-4 py-3 text-left text-sm text-[var(--zcanopy-card-brown)] transition-colors hover:bg-[var(--zcanopy-table-head)] first:rounded-t-xl last:rounded-b-xl"
                      >
                        {suggestion.description}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {resolvedCoords && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] p-3">
                <span className="text-xs text-[var(--zcanopy-muted)]">Coordinates:</span>
                <span className="text-xs font-medium text-[var(--zcanopy-card-brown)]">
                  {resolvedCoords.lat.toFixed(6)}, {resolvedCoords.lng.toFixed(6)}
                </span>
              </div>
            )}
            {atPropertyLocation === 'yes' && !resolvedCoords && (
              <p className="rounded-xl border border-[var(--zcanopy-warning)] bg-[var(--zcanopy-warning-soft)] px-3 py-2 text-xs font-medium text-[var(--zcanopy-warning)]">
                We could not read your GPS position. Allow location access, or pick the location from the list below — the coordinates will be looked up from the address when you submit.
              </p>
            )}
            {atPropertyLocation === 'no' && (
              <p className="text-xs text-[var(--zcanopy-muted)]">
                Only the location name will be saved — no coordinates will be attached to this property.
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Price (UGX)</label>
              <input
                type="number"
                value={createForm.price}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, price: e.target.value }));
                  validatePriceAndFee(e.target.value, createForm.brokerBookingFee);
                }}
                className={`w-full rounded-xl border ${priceError ? 'border-red-500' : 'border-[var(--zcanopy-border)]'} bg-white/70 px-4 py-2.5 shadow-sm`}
                required
              />
              {priceError && <p className="mt-1 text-xs text-red-500">{priceError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Broker Booking Fee (UGX)</label>
              <input
                type="number"
                value={createForm.brokerBookingFee}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, brokerBookingFee: e.target.value }));
                  validatePriceAndFee(createForm.price, e.target.value);
                }}
                className={`w-full rounded-xl border ${feeError ? 'border-red-500' : 'border-[var(--zcanopy-border)]'} bg-white/70 px-4 py-2.5 shadow-sm`}
                placeholder="e.g. 50000 (min 5,000)"
              />
              {feeError && <p className="mt-1 text-xs text-red-500">{feeError}</p>}
              <StandardBookingPriceSelect
                id="standard-booking-price-new"
                price={createForm.price}
                fee={createForm.brokerBookingFee}
                onSelectFee={(value) => {
                  setCreateForm((prev) => ({ ...prev, brokerBookingFee: value }));
                  validatePriceAndFee(createForm.price, value);
                }}
                disabled={creating}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Photos ({photos.length}/{tier.limits.maxPhotosPerProperty})</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={photoUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
              />
              {photoUploading && (
                <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--zcanopy-primary)] border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Uploading photos...</span>
                </div>
              )}
              {photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] p-2">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--zcanopy-border)]">
                      <img src={src} alt={`Upload ${idx + 1}`} width={256} height={192} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 rounded-full bg-rose-700/90 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--zcanopy-card-brown)]">Video ({video ? '1' : '0'}/{tier.limits.maxVideosPerProperty})</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={videoUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
              />
              {videoUploading && (
                <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--zcanopy-primary)] border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Uploading video...</span>
                </div>
              )}
              {video && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] p-3">
                  <video
                    src={toCdnUrl(video)}
                    poster={videoPoster ?? undefined}
                    width={320}
                    height={192}
                    preload="none"
                    playsInline
                    className="h-24 w-32 rounded-lg object-cover ring-1 ring-[var(--zcanopy-border)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVideo(null);
                      setVideoPoster(null);
                    }}
                    className="rounded-full bg-rose-700/90 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Remove video
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Property'}
            </button>
          </form>
        </Panel>
      )}

      {uploadDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--zcanopy-danger-soft)] text-[var(--zcanopy-danger)]">
                <X className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-[var(--zcanopy-card-brown)]">Upload Limit Reached</h3>
            </div>
            <p className="text-sm text-gray-600">{uploadDialog.message}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setUploadDialog(null)}
                className="rounded-xl bg-[var(--zcanopy-primary)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--zcanopy-primary-alt)]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] px-4 py-2.5 shadow-sm"
          />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] px-4 py-2.5 shadow-sm sm:w-auto"
          >
            <option value="">All Types</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <div className="py-12 text-center">
            <p className="text-[var(--zcanopy-muted)]">No properties found.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
          {filtered.map((property) => (
            property.id ? <PropertyCard key={property.id} {...property} href={`/dashboard/broker/properties/${property.id}`} /> : null
          ))}
        </div>
      )}
    </div>
  );
}
