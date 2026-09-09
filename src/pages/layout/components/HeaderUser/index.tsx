import { useState } from 'react';
import { Dropdown } from 'antd';
import { IoMdExit } from 'react-icons/io';
import { FiUser } from 'react-icons/fi';
import ProfileModal from '../ProfileModal';

interface HeaderUserProps {
  data: { name?: string; username?: string; avatar?: string };
  handleLogout: () => void;
}

export default ({ data, handleLogout }: HeaderUserProps) => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 头像取名字首字母（中文取首个汉字）
  const initial = (data.name || data.username || '?').trim().charAt(0).toUpperCase();

  const avatarNode = data.avatar ? (
    <img src={data.avatar} alt={data.name || 'avatar'} className="size-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">
      {initial}
    </span>
  );

  const panel = (
    <div className="w-60 overflow-hidden rounded-lg border border-line bg-panel shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
        {data.avatar ? (
          <img src={data.avatar} alt={data.name || 'avatar'} className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{data.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-ink-muted">{data.username}</div>
        </div>
      </div>

      <div className="p-1.5">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-muted hover:bg-row-hover hover:text-ink"
          onClick={() => {
            setOpen(false);
            setProfileOpen(true);
          }}
        >
          <FiUser className="text-base" />
          个人中心
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-muted hover:bg-danger-soft hover:text-danger"
        >
          <IoMdExit className="text-base" />
          退出登录
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
        popupRender={() => panel}
        overlayStyle={{ boxShadow: 'none', padding: 0 }}
      >
        <button
          type="button"
          aria-label="用户菜单"
          className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-1.5 ${
            open ? 'border-brand bg-brand-soft' : 'border-transparent hover:border-line hover:bg-canvas'
          }`}
        >
          {avatarNode}
          <span className="hidden max-w-28 truncate text-[13px] font-medium text-ink sm:block">{data.name}</span>
        </button>
      </Dropdown>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};
