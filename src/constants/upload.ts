export interface ImageQualityOption {
  label: string;
  value: number;
  hint: string;
}

export const IMAGE_QUALITY_OPTIONS: ImageQualityOption[] = [
  { label: '原图', value: 100, hint: '100' },
  { label: '高清', value: 90, hint: '90' },
  { label: '均衡', value: 70, hint: '70' },
  { label: '推荐', value: 50, hint: '50' },
  { label: '极致', value: 30, hint: '30' },
];

export const IMAGE_QUALITY_SELECT_OPTIONS = IMAGE_QUALITY_OPTIONS.map(({ label, value, hint }) => ({
  label: `${label} (${hint})`,
  value,
}));

/** 默认输出质量：推荐 (50) */
export const DEFAULT_IMAGE_QUALITY = 50;
