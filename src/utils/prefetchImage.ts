const prefetched = new Set<string>();

export function prefetchImage(url?: string) {
  if (!url || prefetched.has(url)) {
    return;
  }

  prefetched.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

export function prefetchImageRange(urls: string[], center: number, radius = 3) {
  for (let index = center - radius; index <= center + radius; index += 1) {
    prefetchImage(urls[index]);
  }
}

export function prefetchImages(urls: string[]) {
  urls.forEach((url) => prefetchImage(url));
}
