export interface ImageQualityOption {
  label: string;
  value: number;
  hint: string;
}

/** 自适应：按图片体积与分辨率自动选择压缩质量 */
export const ADAPTIVE_IMAGE_QUALITY = 0;

export const IMAGE_QUALITY_OPTIONS: ImageQualityOption[] = [
  { label: '自适应', value: 0, hint: '推荐' },
  { label: '高清', value: 80, hint: '90' },
  { label: '均衡', value: 60, hint: '50' },
  { label: '极致', value: 30, hint: '30' },
];

export const IMAGE_QUALITY_SELECT_OPTIONS = IMAGE_QUALITY_OPTIONS.map(({ label, value, hint }) => ({
  label: `${label} (${hint})`,
  value,
}));

/** 默认输出质量：自适应 */
export const DEFAULT_IMAGE_QUALITY = ADAPTIVE_IMAGE_QUALITY;
