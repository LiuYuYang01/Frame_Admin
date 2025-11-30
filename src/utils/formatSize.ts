/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串，如 "1.53MB", "2.1MB", "500.5KB" 等
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);

  // B 不显示小数
  if (i === 0) {
    return `${Math.round(value)}${sizes[i]}`;
  }

  // KB 显示 1 位小数
  if (i === 1) {
    return `${value.toFixed(1)}${sizes[i]}`;
  }

  // MB 及以上显示 2 位小数，去掉末尾的 0
  const formatted = value.toFixed(2);
  const trimmed = formatted.replace(/\.?0+$/, '');
  return `${trimmed}${sizes[i]}`;
}
