/** 七牛 imageView2 缩略图，与 Frame_API/src/utils/image.ts 保持一致 */
export const buildImageView2Url = (url: string, width?: number, height?: number) => {
  if (!url || (!width && !height)) {
    return url;
  }

  const normalizedWidth = typeof width === 'number' && !isNaN(width) ? Math.floor(width) : undefined;
  const normalizedHeight = typeof height === 'number' && !isNaN(height) ? Math.floor(height) : undefined;

  if (!normalizedWidth && !normalizedHeight) {
    return url;
  }

  const segments = ['imageView2/1'];
  if (normalizedWidth) {
    segments.push(`w/${normalizedWidth}`);
  }
  if (normalizedHeight) {
    segments.push(`h/${normalizedHeight}`);
  }

  const suffix = segments.join('/');
  const connector = url.includes('?') ? '&' : '?';

  return `${url}${connector}${suffix}`;
};

/** 去除 imageView2 参数，还原原图 URL */
export const getOriginalImageUrl = (url: string) => {
  if (!url) return '';
  const [base, query] = url.split('?');
  if (!query) return url;
  return query.startsWith('imageView2/1/') ? base : url;
};
