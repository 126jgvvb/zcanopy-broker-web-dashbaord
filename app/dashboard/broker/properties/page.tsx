'use client';

import { useEffect, useState } from 'react';
import PropertyCard from '@/components/PropertyCard';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { X } from 'lucide-react';
import { COLORS } from '@/lib/theme';

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

export default function BrokerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', propertyType: 'apartment', location: '', price: '', brokerBookingFee: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [tier, setTier] = useState({ name: 'Prop', limits: {} as TierLimits });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    Promise.all([
      webApi.brokerProperties(token),
      webApi.brokerSubscriptionDetails(token),
    ])
      .then(([propsData, subData]: any) => {
        setProperties((propsData as any).properties || []);
        const limits = (subData as any).limits || {};
        setTier({
          name: (subData as any).subscriptionTier || 'prop',
          limits: {
            maxProperties: limits.maxProperties || 5,
            maxPhotosPerProperty: limits.maxPhotosPerProperty || 15,
            maxVideosPerProperty: limits.maxVideosPerProperty || 1,
            maxVideoSizeMB: limits.maxVideoSizeMB || 500,
          },
        });
      })
      .catch(() => setError('Failed to load properties'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = properties.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = !propertyType || p.propertyType === propertyType;
    return matchesSearch && matchesType;
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map((f) => URL.createObjectURL(f));
    if (photos.length + newPhotos.length > tier.limits.maxPhotosPerProperty) {
      alert(`Maximum ${tier.limits.maxPhotosPerProperty} photos allowed for ${tier.name} plan`);
      return;
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (tier.limits.maxVideosPerProperty === 0) {
      alert('Video upload is not available on your current plan');
      return;
    }
    setVideo(URL.createObjectURL(file));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
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
        videoUrl: video,
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', propertyType: 'apartment', location: '', price: '', brokerBookingFee: '' });
      setPhotos([]);
      setVideo(null);
      const data = await webApi.brokerProperties(token);
      setProperties((data as any).properties || []);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingState label="Loading properties" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="zc-kicker">Listings</p>
          <h2 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">My Properties</h2>
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
                <select
                  value={createForm.propertyType}
                  onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })}
                  className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                >
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Price (UGX)</label>
              <input
                type="number"
                value={createForm.price}
                onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Broker Booking Fee (UGX)</label>
              <input
                type="number"
                value={createForm.brokerBookingFee}
                onChange={(e) => setCreateForm({ ...createForm, brokerBookingFee: e.target.value })}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-[var(--zcanopy-border)] bg-white/70 px-4 py-2.5 shadow-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Photos ({photos.length}/{tier.limits.maxPhotosPerProperty})</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)]"
              />
              {photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] p-2">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--zcanopy-border)]">
                      <img src={src} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
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
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Video ({video ? '1' : '0'}/{tier.limits.maxVideosPerProperty})</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)]"
              />
              {video && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-table-head)] p-3">
                  <video src={video} className="h-24 w-32 rounded-lg object-cover ring-1 ring-[var(--zcanopy-border)]" />
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties..."
            className="flex-1 rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] px-4 py-2.5 shadow-sm"
          />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] px-4 py-2.5 shadow-sm"
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
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
            <PropertyCard key={property.id} {...property} href={`/dashboard/broker/properties/${property.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
