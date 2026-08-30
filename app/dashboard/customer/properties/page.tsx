"use client";

import { useEffect, useState } from "react";
import PropertyCard from "@/components/PropertyCard";
import { webApi } from "@/lib/api";
import { LoadingState, ErrorState, Panel } from "@/components/ui";

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

interface BookingForm {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  amount: string;
  reason: string;
}

const emptyForm: BookingForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  date: "",
  amount: "",
  reason: "",
};

export default function CustomerPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("zcanopy_token");

    const promise = search
      ? webApi.searchProperties(search)
      : webApi.publicProperties();

    promise
      .then((data: any) => setProperties(data.properties || []))
      .catch(() => setError("Failed to load properties"))
      .finally(() => setLoading(false));
  }, [search]);

  const openBooking = (property: Property) => {
    setSelectedProperty(property);
    setForm(emptyForm);
    setSubmitError("");
    setSuccess("");
  };

  const closeBooking = () => {
    setSelectedProperty(null);
    setForm(emptyForm);
    setSubmitError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const token = localStorage.getItem("zcanopy_token");
      await webApi.createBooking(token || "", {
        propertyId: selectedProperty.id,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        date: form.date,
        amount: Number(form.amount),
        reason: form.reason,
        status: "pending",
      });
      setSuccess("Booking created successfully!");
      setForm(emptyForm);
      setTimeout(closeBooking, 1500);
    } catch {
      setSubmitError("Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading properties" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Browse Properties</h2>
        <p className="text-gray-500">Find your next home or investment and book directly.</p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
        />
      </div>

      {properties.length === 0 ? (
        <Panel>
          <div className="py-12 text-center">
            <p className="text-gray-500">No properties found.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} {...property} onBook={() => openBooking(property)} />
          ))}
        </div>
      )}

      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-[var(--zcanopy-surface)] p-5 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="+256 700 000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (UGX)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                    placeholder="500000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason / Notes</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  placeholder="Any special requests or notes..."
                />
              </div>

              {submitError && <ErrorState message={submitError} />}
              {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBooking}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[var(--zcanopy-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
