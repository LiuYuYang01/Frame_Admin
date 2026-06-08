import { ADAPTIVE_IMAGE_QUALITY, DEFAULT_IMAGE_QUALITY } from '@/constants/upload';

const DEFAULT_MAX_LONG_EDGE = 2560;

/** 自适应模式下，小图跳过重编码的体积上限 */
const ADAPTIVE_SKIP_MAX_BYTES = 1 * 1024 * 1024;
/** 自适应模式下，小图跳过重编码的长边上限 */
const ADAPTIVE_SKIP_MAX_LONG_EDGE = 1920;

export interface CompressImageOptions {
  quality?: number;
  maxLongEdge?: number;
}

export interface CompressImageResult {
  file: File;
  width: number;
  height: number;
}

export const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;

      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('图片加载失败'));
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
  });
};

/** 根据体积与分辨率自动匹配压缩档位（80 / 60 / 30） */
export const resolveAdaptiveQuality = (file: File, width: number, height: number): number => {
  const longEdge = Math.max(width, height);
  const sizeMB = file.size / (1024 * 1024);

  if (longEdge > 4000 || sizeMB >= 10) {
    return 30;
  }

  if (longEdge > 2560 || sizeMB >= 3) {
    return 60;
  }

  return 80;
};

const shouldSkipAdaptiveCompression = (file: File, width: number, height: number): boolean => {
  const longEdge = Math.max(width, height);
  return file.size <= ADAPTIVE_SKIP_MAX_BYTES && longEdge <= ADAPTIVE_SKIP_MAX_LONG_EDGE;
};

const encodeImage = (
  img: HTMLImageElement,
  file: File,
  width: number,
  height: number,
  quality: number,
  maxLongEdge: number,
): Promise<CompressImageResult> => {
  return new Promise((resolve, reject) => {
    const longEdge = Math.max(width, height);
    const shouldResize = longEdge > maxLongEdge;
    const scale = shouldResize ? maxLongEdge / longEdge : 1;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法获取 canvas context'));
      return;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type || 'image/jpeg';
    const outputQuality = quality / 100;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片压缩失败'));
          return;
        }

        const ext = outputType === 'image/jpeg' ? '.jpg' : '';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const compressedFile = new File([blob], `${baseName}${ext}`, {
          type: outputType,
          lastModified: Date.now(),
        });

        resolve({
          file: compressedFile,
          width: targetWidth,
          height: targetHeight,
        });
      },
      outputType,
      outputQuality,
    );
  });
};

/**
 * 客户端图片压缩：自适应 (0) 按体积/分辨率选档；其余档位按指定质量压缩
 */
export const compressImage = async (file: File, options: CompressImageOptions = {}): Promise<CompressImageResult> => {
  const modeQuality = options.quality ?? DEFAULT_IMAGE_QUALITY;
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;

  if (!file.type.startsWith('image/')) {
    const dimensions = await readImageDimensions(file);
    return { file, ...dimensions };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;

      img.onload = () => {
        const { width, height } = img;

        if (modeQuality === ADAPTIVE_IMAGE_QUALITY) {
          if (shouldSkipAdaptiveCompression(file, width, height)) {
            resolve({ file, width, height });
            return;
          }

          const adaptiveQuality = resolveAdaptiveQuality(file, width, height);
          encodeImage(img, file, width, height, adaptiveQuality, maxLongEdge).then(resolve).catch(reject);
          return;
        }

        encodeImage(img, file, width, height, modeQuality, maxLongEdge).then(resolve).catch(reject);
      };

      img.onerror = () => reject(new Error('图片加载失败'));
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
  });
};
