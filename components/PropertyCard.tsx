import Link from "next/link";
import { Play } from "lucide-react";

interface PropertyCardProps {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  location: string;
  isAvailable: boolean;
  imageUrl?: string[];
  videoUrl?: string[];
  price?: number;
  brokerBookingFee?: number;
  onBook?: () => void;
  href?: string;
}

export default function PropertyCard({ id, title, description, propertyType, location, isAvailable, imageUrl, videoUrl, price, brokerBookingFee, onBook, href = `/properties/${id}` }: PropertyCardProps) {
  const images = imageUrl?.filter(Boolean) || [];
  const videos = videoUrl?.filter(Boolean) || [];
  const mainImage = images[0] || "https://via.placeholder.com/600x400?text=No+Image";

  const cardContent = (
    <div className="group block overflow-hidden rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] shadow-[var(--zcanopy-shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--zcanopy-shadow-hover)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color-mix(in_srgb,var(--zcanopy-card-brown)_8%,white)]">
        <img src={mainImage} alt={title} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm ${isAvailable ? "bg-white/90 text-emerald-800" : "bg-white/90 text-rose-800"}`}>
          {isAvailable ? "Available" : "Booked"}
        </span>
        {price !== undefined && (
          <p className="absolute bottom-3 left-3 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-white drop-shadow">
            UGX {price.toLocaleString()}
          </p>
        )}
        {brokerBookingFee !== undefined && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--zcanopy-primary)]/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            Fee: UGX {brokerBookingFee.toLocaleString()}
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="zc-kicker">{propertyType}</p>
        <h3 className="mt-1.5 text-2xl text-[var(--zcanopy-card-brown)]">{title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--zcanopy-muted)]">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[var(--zcanopy-muted)]">{location}</span>
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-hidden rounded-xl">
            {images.slice(1, 5).map((img, idx) => (
              <div key={idx} className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img src={img} alt={`${title} ${idx + 2}`} className="h-full w-full object-cover" />
              </div>
            ))}
            {images.length > 5 && (
              <div className="flex h-20 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                +{images.length - 5}
              </div>
            )}
          </div>
        )}
        {videos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-hidden rounded-xl">
            {videos.slice(0, 3).map((vid, idx) => (
              <div key={idx} className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <video src={vid} className="h-full w-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
            ))}
            {videos.length > 3 && (
              <div className="flex h-24 w-40 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                +{videos.length - 3}
              </div>
            )}
          </div>
        )}
        {onBook && isAvailable && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onBook();
            }}
            className="mt-4 w-full rounded-xl bg-[var(--zcanopy-primary)] px-4 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_20px_-10px_rgba(169,113,14,0.7)] transition-all hover:bg-[var(--zcanopy-primary-alt)]"
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );

  if (onBook) {
    return <div className="cursor-default">{cardContent}</div>;
  }

  return <Link href={href} className="group block">{cardContent}</Link>;
}
