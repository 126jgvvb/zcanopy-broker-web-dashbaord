/**
 * Normalise DigitalOcean Spaces media URLs so playback and images go through
 * the CDN edge instead of the raw bucket origin.
 *
 * Records created before the CDN was enabled can still contain the origin
 * hostname (`<bucket>.<region>.digitaloceanspaces.com`). Serving those through
 * Cloudflare dramatically improves throughput for distant users, which is the
 * difference between a video that buffers and one that streams.
 */
export function toCdnUrl<T extends string | null | undefined>(url: T): T | string {
  if (!url) return url as T;
  if (url.includes(".cdn.digitaloceanspaces.com")) return url;
  return url.replace(
    /^(https?:\/\/[^/]+?)\.digitaloceanspaces\.com\//,
    "$1.cdn.digitaloceanspaces.com/",
  );
}
