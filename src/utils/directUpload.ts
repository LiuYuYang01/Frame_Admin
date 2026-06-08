export interface UploadToQiniuParams {
  file: File;
  uploadToken: string;
  key: string;
  uploadUrl: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploadToQiniuResult {
  hash: string;
  key: string;
}

/**
 * 浏览器直传七牛云
 */
export function uploadToQiniu(params: UploadToQiniuParams): Promise<UploadToQiniuResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('token', params.uploadToken);
    formData.append('key', params.key);
    formData.append('file', params.file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && params.onProgress) {
        params.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadToQiniuResult);
        } catch {
          reject(new Error('七牛上传响应解析失败'));
        }
        return;
      }

      let errorMessage = `七牛上传失败（HTTP ${xhr.status}）`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body.error) {
          errorMessage = body.error;
        }
      } catch {
        // ignore parse error
      }
      reject(new Error(errorMessage));
    };

    xhr.onerror = () => reject(new Error('七牛上传网络错误'));
    xhr.onabort = () => reject(new Error('上传已取消'));

    if (params.signal) {
      if (params.signal.aborted) {
        xhr.abort();
        return;
      }
      params.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.open('POST', params.uploadUrl);
    xhr.send(formData);
  });
}

/**
 * 限制并发执行任务
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}
