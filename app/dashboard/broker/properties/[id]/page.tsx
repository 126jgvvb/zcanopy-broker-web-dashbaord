'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  videoUrl?: string[];
  price?: number;
  brokerBookingFee?: number;
  latitude?: number;
  longitude?: number;
}

interface TierLimits {
  maxProperties: number;
  maxPhotosPerProperty: number;
  maxVideosPerProperty: number;
  maxVideoSizeMB: number;
}

export default function BrokerPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', location: '', price: '', brokerBookingFee: '', propertyType: 'apartment' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [tier, setTier] = useState({ name: 'Prop', limits: {} as TierLimits });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mediaSaving, setMediaSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !id) return;

    Promise.all([
      webApi.brokerPropertyDetails(token, id),
      webApi.brokerSubscriptionDetails(token),
    ])
      .then(([data, subData]: any) => {
        const prop = data.property || data;
        setProperty(prop);
        setPhotos(prop.imageUrl?.filter(Boolean) || []);
        setVideos(prop.videoUrl?.filter(Boolean) || []);
        setEditForm({
          title: prop.title || '',
          description: prop.description || '',
          location: prop.location || '',
          price: prop.price?.toString() || '',
          brokerBookingFee: prop.brokerBookingFee?.toString() || '',
          propertyType: prop.propertyType || 'apartment',
        });
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
      .catch(() => setError('Failed to load property details'))
      .finally(() => setLoading(false));
  }, [id]);

  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !property) return;
    setSaving(true);
    try {
      await webApi.updateProperty(token, property.id, {
        title: editForm.title,
        description: editForm.description,
        location: editForm.location,
        price: Number(editForm.price),
        brokerBookingFee: Number(editForm.brokerBookingFee),
        propertyType: editForm.propertyType,
        imageUrl: photos,
        videoUrl: videos,
      });
      setProperty((prev) => prev ? { ...prev, ...editForm, price: Number(editForm.price), brokerBookingFee: Number(editForm.brokerBookingFee), imageUrl: photos, videoUrl: videos } : prev);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !property) return;
    setDeleting(true);
    try {
      await webApi.deleteProperty(token, property.id);
      router.push('/dashboard/broker/properties');
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

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
    setVideos((prev) => [...prev, URL.createObjectURL(file)]);
  };

  const handleSaveMedia = async () => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !property) return;
    setMediaSaving(true);
    try {
      await webApi.updateProperty(token, property.id, {
        title: property.title,
        description: property.description,
        location: property.location,
        price: property.price,
        propertyType: property.propertyType,
        imageUrl: photos,
        videoUrl: videos,
      });
      alert('Media updated successfully');
    } catch {
      alert('Failed to update media');
    } finally {
      setMediaSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading property details" />;
  if (error) return <ErrorState message={error} />;
  if (!property) return <ErrorState message="Property not found" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="zc-kicker">{property.propertyType}</p>
          <h2 className="mt-1 text-4xl text-[var(--zcanopy-card-brown)]">{property.title}</h2>
          <p className="mt-1 text-[var(--zcanopy-muted)]">{property.location}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-xl bg-[var(--zcanopy-primary)] px-5 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(169,113,14,0.85)] transition-all hover:bg-[var(--zcanopy-primary-alt)]"
          >
            {editing ? 'Cancel Edit' : 'Edit Property'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-800 transition-all hover:bg-rose-100"
          >
            Delete
          </button>
        </div>
      </div>

      {editing && (
        <Panel title="Edit Property">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
                <select
                  value={editForm.propertyType}
                  onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
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
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Price (UGX)</label>
              <input
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Broker Booking Fee (UGX)</label>
              <input
                type="number"
                value={editForm.brokerBookingFee}
                onChange={(e) => setEditForm({ ...editForm, brokerBookingFee: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </Panel>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--zcanopy-card-brown)]">Delete Property</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete "{property.title}"? This action cannot be undone.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title={`Photos (${photos.length}/${tier.limits.maxPhotosPerProperty})`}>
            {photos.length > 0 ? (
              <div className="relative">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100">
                  <img src={photos[currentPhotoIndex]} alt={property.title} className="h-full w-full object-cover" />
                </div>
                {photos.length > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={prevPhoto}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-500">{currentPhotoIndex + 1} / {photos.length}</span>
                    <button
                      onClick={nextPhoto}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) => prev.filter((_, i) => i !== idx));
                          if (idx === currentPhotoIndex && currentPhotoIndex >= photos.length - 1) {
                            setCurrentPhotoIndex(Math.max(0, photos.length - 2));
                          }
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500">No photos uploaded</div>
            )}
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)]"
              />
            </div>
          </Panel>

          <Panel title={`Videos (${videos.length}/${tier.limits.maxVideosPerProperty})`}>
            {videos.length > 0 ? (
              <div className="space-y-4">
                {videos.map((video, idx) => (
                  <div key={idx} className="relative overflow-hidden rounded-2xl bg-gray-100">
                    <video src={video} controls className="w-full" />
                      <button
                        type="button"
                        onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500">No videos uploaded</div>
            )}
            <div className="mt-4">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--zcanopy-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--zcanopy-primary-alt)]"
              />
            </div>
          </Panel>

          <button
            onClick={handleSaveMedia}
            disabled={mediaSaving}
            className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {mediaSaving ? 'Saving Media...' : 'Save Media Changes'}
          </button>
        </div>

        <div className="space-y-6">
          <Panel title="Property Details">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${property.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {property.isAvailable ? 'Available' : 'Booked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Price</span>
                <span className="text-lg font-bold text-[var(--zcanopy-card-brown)]">UGX {(property.price || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Broker Booking Fee</span>
                <span className="text-sm font-semibold text-[var(--zcanopy-card-brown)]">UGX {(property.brokerBookingFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date Uploaded</span>
                <span className="text-sm font-medium">{new Date(property.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Property Type</span>
                <span className="text-sm font-medium capitalize">{property.propertyType}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="mt-1 text-sm text-gray-700">{property.description || 'No description provided'}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Location">
            {property.latitude && property.longitude ? (
              <div className="overflow-hidden rounded-2xl bg-gray-100">
                <iframe
                  title="Property Location"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.01}%2C${property.longitude + 0.01}%2C${property.latitude + 0.01}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500">
                <p>Location: {property.location}</p>
                <p className="mt-1 text-xs text-gray-400">Coordinates not available</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
