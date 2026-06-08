import SparkMD5 from 'spark-md5';

const CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 计算文件 MD5（与后端一致，用于秒传和对象 key）
 */
export function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();

    reader.onload = (event) => {
      const buffer = event.target?.result;
      if (!(buffer instanceof ArrayBuffer)) {
        reject(new Error('无法读取文件内容'));
        return;
      }

      spark.append(buffer);
      currentChunk += 1;

      if (currentChunk < chunks) {
        loadNext();
        return;
      }

      resolve(spark.end());
    };

    reader.onerror = () => reject(new Error('文件读取失败'));

    const loadNext = () => {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      reader.readAsArrayBuffer(file.slice(start, end));
    };

    if (file.size === 0) {
      resolve(spark.end());
      return;
    }

    loadNext();
  });
}

/** @deprecated 请使用 calculateFileMD5 */
export const calculateFileHash = calculateFileMD5;
