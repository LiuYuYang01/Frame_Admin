import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react';
import { Image } from 'antd';
import type { ImageProps } from 'antd';
import { prefetchImage, prefetchImageRange, prefetchImages } from '@/utils/prefetchImage';

export const previewMask = <div className="text-white">预览</div>;

type PreviewGroupProps = ComponentProps<typeof Image.PreviewGroup>;

interface PreviewUrlRegistry {
  register: (url: string) => () => void;
}

const PreviewUrlRegistryContext = createContext<PreviewUrlRegistry | null>(null);

const SMALL_GALLERY_PREFETCH_ALL = 24;

export function PreviewImageGroup({ preview, ...props }: PreviewGroupProps) {
  const urlsRef = useRef<string[]>([]);

  const register = useCallback((url: string) => {
    urlsRef.current.push(url);

    return () => {
      const index = urlsRef.current.indexOf(url);
      if (index >= 0) {
        urlsRef.current.splice(index, 1);
      }
    };
  }, []);

  const prefetchAround = useCallback((current: number) => {
    const urls = urlsRef.current;
    if (urls.length === 0) {
      return;
    }

    if (urls.length <= SMALL_GALLERY_PREFETCH_ALL) {
      prefetchImages(urls);
      return;
    }

    prefetchImageRange(urls, current, 3);
  }, []);

  const mergedPreview = useMemo(() => {
    const base = typeof preview === 'object' ? preview : {};

    return {
      ...base,
      onVisibleChange: (visible: boolean, prevVisible: boolean, current: number) => {
        if (visible) {
          prefetchAround(current);
        }
        base.onVisibleChange?.(visible, prevVisible, current);
      },
      onChange: (current: number, prevCurrent: number) => {
        prefetchAround(current);
        base.onChange?.(current, prevCurrent);
      },
    };
  }, [preview, prefetchAround]);

  const registry = useMemo<PreviewUrlRegistry>(() => ({ register }), [register]);

  return (
    <PreviewUrlRegistryContext.Provider value={registry}>
      <Image.PreviewGroup preview={mergedPreview} {...props} />
    </PreviewUrlRegistryContext.Provider>
  );
}

export interface PreviewImageProps extends ImageProps {
  previewSrc?: string;
}

export function PreviewImage({ previewSrc, preview, onMouseEnter, placeholder, ...rest }: PreviewImageProps) {
  const registry = useContext(PreviewUrlRegistryContext);

  useLayoutEffect(() => {
    if (!registry || !previewSrc || preview === false) {
      return;
    }

    return registry.register(previewSrc);
  }, [registry, previewSrc, preview]);

  if (preview === false) {
    return <Image preview={false} onMouseEnter={onMouseEnter} {...rest} />;
  }

  const thumbSrc = rest.src;
  const showThumbPlaceholder = Boolean(previewSrc && thumbSrc && previewSrc !== thumbSrc);

  const mergedPreview = {
    mask: previewMask,
    ...(previewSrc ? { src: previewSrc } : {}),
    ...(typeof preview === 'object' ? preview : {}),
  };

  const handleMouseEnter: ImageProps['onMouseEnter'] = (event) => {
    if (previewSrc) {
      prefetchImage(previewSrc);
    }
    onMouseEnter?.(event);
  };

  return (
    <Image
      {...rest}
      preview={mergedPreview}
      placeholder={
        showThumbPlaceholder ? (
          <img src={thumbSrc} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          placeholder
        )
      }
      onMouseEnter={handleMouseEnter}
    />
  );
}
