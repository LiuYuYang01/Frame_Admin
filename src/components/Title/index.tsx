import type { ReactNode } from 'react';

interface Props {
  value: string;
  children?: ReactNode;
}

export default ({ value, children }: Props) => {
  return (
    <div className="px-3 mb-4">
      <div className="overflow-auto flex justify-between items-center">
        <h2 className="font-semibold text-black dark:text-white text-xl min-w-24">{value}</h2>
        {children}
      </div>
    </div>
  );
};
