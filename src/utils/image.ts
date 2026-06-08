/** 七牛图片处理，与 Frame_API/src/utils/image.ts 保持一致 */

export type ImageScene = 'thumb' | 'grid' | 'preview' | 'cover' | 'placeholder';
export type ImageFormat = 'webp' | 'jpg' | 'png' | 'avif';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  mode?: 1 | 2 | 3 | 4 | 5;
  quality?: number;
  format?: ImageFormat;
  interlace?: boolean;
  blur?: number;
  scene?: ImageScene;
}

const SCENE_PRESETS: Record<ImageScene, ImageProcessOptions> = {
  placeholder: { width: 20, mode: 1, quality: 50, blur: 20, format: 'webp' },
  thumb: { width: 300, height: 300, mode: 1, quality: 75, format: 'webp' },
  grid: { width: 540, mode: 2, quality: 80, format: 'webp' },
  preview: { width: 1280, mode: 2, quality: 85, format: 'webp' },
  cover: { width: 400, height: 400, mode: 1, quality: 80, format: 'webp' },
};

export const stripImageProcessing = (url: string): string => {
  if (!url) return '';
  const [base, query] = url.split('?');
  if (!query) return url;
  return query.startsWith('imageView2/') ? base : url;
};

/** @deprecated 使用 getOriginalImageUrl 或 stripImageProcessing */
export const getOriginalImageUrl = stripImageProcessing;

export const buildImageUrl = (url: string, options: ImageProcessOptions = {}): string => {
  if (!url) return url;

  const originalUrl = stripImageProcessing(url);
  const preset = options.scene ? SCENE_PRESETS[options.scene] : undefined;
  const opts: ImageProcessOptions = { ...preset, ...options };

  const { width, height, mode = 1, quality, format, interlace, blur } = opts;

  if (!width && !height && quality === undefined && !format && blur === undefined) {
    return originalUrl;
  }

  const segments = [`imageView2/${mode}`];
  if (width) segments.push(`w/${Math.floor(width)}`);
  if (height) segments.push(`h/${Math.floor(height)}`);
  if (quality !== undefined) segments.push(`q/${Math.floor(quality)}`);
  if (format) segments.push(`format/${format}`);
  if (interlace) segments.push('interlace/1');
  if (blur !== undefined) segments.push(`blur/${Math.floor(blur)}`);

  return `${originalUrl}?${segments.join('/')}`;
};

/** 相册封面展示 URL（前端兜底，兼容 API 返回原图地址） */
export const getCoverImageUrl = (cover?: string) => {
  if (!cover) return '';
  return buildImageUrl(cover, { scene: 'cover' });
};

/** 列表缩略图 URL（管理端相册网格、选择器） */
export const getThumbImageUrl = (url?: string, originalUrl?: string) => {
  const source = originalUrl || url;
  if (!source) return '';
  return buildImageUrl(source, { scene: 'thumb' });
};

/** 预览大图 URL */
export const getPreviewImageUrl = (url?: string, originalUrl?: string) => {
  const source = originalUrl || stripImageProcessing(url || '');
  if (!source) return '';
  return buildImageUrl(source, { scene: 'preview' });
};

/** @deprecated 使用 buildImageUrl */
export const buildImageView2Url = (url: string, width?: number, height?: number) => {
  return buildImageUrl(url, { width, height, mode: 1, quality: 75, format: 'webp' });
};
