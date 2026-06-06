import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ColorMode = 'light' | 'dark';

interface ConfigStore {
  colorMode: ColorMode;
  setColorMode: (data: ColorMode) => void;
}

export default create(
  persist<ConfigStore>(
    (set) => ({
      colorMode: 'light',
      setColorMode: (colorMode: ColorMode) => set(() => ({ colorMode })),
    }),
    {
      name: 'config_storage',
      getStorage: () => localStorage,
    },
  ),
);
