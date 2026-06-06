const DEFAULT_MAX_LONG_EDGE = 2560;
const DEFAULT_QUALITY = 80;

export interface CompressImageOptions {
  quality?: number;
  maxLongEdge?: number;
}

/**
 * 客户端图片压缩：限制长边 + 质量压缩，减少上传体积
 */
export const compressImage = (file: File, options: CompressImageOptions = {}): Promise<File> => {
  const quality = options.quality ?? DEFAULT_QUALITY;
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target?.result as string;

      img.onload = () => {
        const { width, height } = img;
        const longEdge = Math.max(width, height);
        const shouldResize = longEdge > maxLongEdge;
        const shouldCompress = quality < 100;

        if (!shouldResize && !shouldCompress) {
          resolve(file);
          return;
        }

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
        const outputQuality = shouldCompress ? quality / 100 : 0.92;

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

            resolve(compressedFile);
          },
          outputType,
          outputQuality,
        );
      };

      img.onerror = () => reject(new Error('图片加载失败'));
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
  });
};
