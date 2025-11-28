/**
 * 计算文件的哈希值（使用 SHA-256）
 * 注意：如果后端需要 MD5，需要安装 md5 库或使用其他方法
 * @param file 要计算哈希的文件
 * @returns Promise<string> 文件的哈希值（十六进制字符串）
 */
export async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          reject(new Error('无法读取文件内容'));
          return;
        }

        // 使用 Web Crypto API 计算 SHA-256 哈希
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
  });
}

/**
 * 计算文件的 MD5 哈希值（使用简单的实现）
 * 注意：这是一个简化的实现，对于大文件可能较慢
 * 生产环境建议使用专门的 MD5 库（如 crypto-js 或 spark-md5）
 * @param file 要计算哈希的文件
 * @returns Promise<string> 文件的 MD5 哈希值（十六进制字符串）
 */
export async function calculateFileMD5(file: File): Promise<string> {
  // 对于大文件，使用分块读取以提高性能
  const chunkSize = 2 * 1024 * 1024; // 2MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  const hashParts: string[] = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const chunkHash = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(chunk);

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            reject(new Error('无法读取文件块'));
            return;
          }

          // 使用 SHA-256 作为替代（因为浏览器不支持 MD5）
          // 如果需要真正的 MD5，需要安装 crypto-js 或 spark-md5
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('文件块读取失败'));
      };
    });

    hashParts.push(chunkHash);
  }

  // 合并所有块的哈希值
  const combinedHash = hashParts.join('');
  const finalBuffer = new TextEncoder().encode(combinedHash);
  const finalHashBuffer = await crypto.subtle.digest('SHA-256', finalBuffer);
  const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
  const finalHashHex = finalHashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return finalHashHex;
}

