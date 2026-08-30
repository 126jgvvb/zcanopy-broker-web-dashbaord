'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
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
}

export default function BrokerExplorerPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await webApi.searchProperties(query);
      let results = (data as any).properties || [];
      if (propertyType) {
        results = results.filter((p: Property) => p.propertyType === propertyType);
      }
      if (location) {
        results = results.filter((p: Property) => p.location.toLowerCase().includes(location.toLowerCase()));
      }
      if (minPrice) {
        results = results.filter((p: Property) => (p as any).price >= Number(minPrice));
      }
      if (maxPrice) {
        results = results.filter((p: Property) => (p as any).price <= Number(maxPrice));
      }
      setProperties(results);
    } catch {
      setError('Failed to search properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  if (loading) return <LoadingState label="Searching properties" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Property Explorer</h2>
        <p className="text-gray-500">Search and discover properties.</p>
      </div>

      <Panel title="Search Filters">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title..."
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location..."
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
          />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
          </select>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min Price"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max Price"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
          />
        </div>
        <button
          onClick={search}
          className="mt-4 w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)]"
        >
          Search
        </button>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <div key={property.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-colors hover:border-[var(--zcanopy-accent-gold)]">
            <div className="h-48 w-full bg-gray-100">
              {property.imageUrl && property.imageUrl[0] ? (
                <img src={property.imageUrl[0]} alt={property.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[var(--zcanopy-card-brown)]">{property.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{property.location}</p>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${property.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {property.isAvailable ? 'Available' : 'Booked'}
              </span>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-500">
            No properties found.
          </div>
        )}
      </div>
    </div>
  );
}
