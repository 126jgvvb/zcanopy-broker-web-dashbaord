import Link from "next/link";
import { Play } from "lucide-react";
import { COLORS } from "@/lib/theme";

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
  onBook?: () => void;
  href?: string;
}

export default function PropertyCard({ id, title, description, propertyType, location, isAvailable, imageUrl, videoUrl, price, onBook, href = `/properties/${id}` }: PropertyCardProps) {
  const images = imageUrl?.filter(Boolean) || [];
  const videos = videoUrl?.filter(Boolean) || [];
  const mainImage = images[0] || "https://via.placeholder.com/600x400?text=No+Image";

  const cardContent = (
    <div className="group block rounded-2xl border border-gray-100 bg-[var(--zcanopy-surface)] shadow-sm transition-all hover:shadow-md">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gray-100">
        <img src={mainImage} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{propertyType}</p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--zcanopy-card-brown)]">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">{location}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAvailable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {isAvailable ? "Available" : "Booked"}
          </span>
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
        {price !== undefined && <p className="mt-3 text-lg font-bold text-[var(--zcanopy-card-brown)]">UGX {price.toLocaleString()}</p>}
        {onBook && isAvailable && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onBook();
            }}
            className="mt-4 w-full rounded-xl bg-[var(--zcanopy-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
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
