import { X } from 'lucide-react';
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { builtInSkinOptions } from './built-in-skins';
import styles from './player-account.module.css';

export type PlayerAccountIdentity = {
  displayName: string;
  username: string;
  userId: string;
  boxId: string;
  avatarSkinId: string;
};

export type PlayerProfileChanges = Pick<PlayerAccountIdentity, 'displayName' | 'avatarSkinId'>;

type PlayerAccountProps = {
  identity: PlayerAccountIdentity;
  onSave: (changes: PlayerProfileChanges) => Promise<void>;
  onLogout: () => Promise<void>;
};

export function PlayerAccount({ identity, onSave, onLogout }: PlayerAccountProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [skinId, setSkinId] = useState(identity.avatarSkinId || 'explorer');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    setDisplayName(identity.displayName);
    setSkinId(identity.avatarSkinId || 'explorer');
  }, [identity.avatarSkinId, identity.displayName, profileOpen]);

  const openProfile = () => {
    setMenuOpen(false);
    setError('');
    setProfileOpen(true);
  };

  const closeProfile = () => {
    if (saving) return;
    setProfileOpen(false);
    setError('');
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setError('请输入昵称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ displayName: nextDisplayName, avatarSkinId: skinId });
      setProfileOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '资料保存失败');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    setError('');
    try {
      await onLogout();
      setMenuOpen(false);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : '退出登录失败');
    } finally {
      setLoggingOut(false);
    }
  };

  const stopPropagation = (event: ReactMouseEvent) => event.stopPropagation();
  const accountName = identity.displayName || identity.username || '已登录用户';

  return (
    <>
      <div className={styles.account} ref={rootRef} onClick={stopPropagation}>
        <button
          className={styles.trigger}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {accountName}
        </button>
        {menuOpen ? (
          <aside className={styles.menu} role="menu">
            <div className={styles.identity}>
              <strong>{accountName}</strong>
              {identity.userId ? <small>账号 ID · {identity.userId}</small> : null}
              {identity.boxId ? <small>神岛 ID · {identity.boxId}</small> : null}
            </div>
            <button className={styles.menuAction} type="button" role="menuitem" onClick={openProfile}>
              编辑资料
            </button>
            <button
              className={styles.logout}
              type="button"
              role="menuitem"
              disabled={loggingOut}
              onClick={() => void logout()}
            >
              {loggingOut ? '正在退出…' : '退出登录'}
            </button>
            {error ? <p className={styles.menuError}>{error}</p> : null}
          </aside>
        ) : null}
      </div>

      {profileOpen ? (
        <div className={styles.backdrop} onMouseDown={closeProfile}>
          <form className={styles.dialog} onSubmit={saveProfile} onMouseDown={stopPropagation}>
            <header className={styles.dialogHeading}>
              <div>
                <h2>编辑资料</h2>
                <p>修改昵称和进入地图时使用的角色</p>
              </div>
              <button
                className={styles.close}
                type="button"
                aria-label="关闭编辑资料"
                disabled={saving}
                onClick={closeProfile}
              >
                <X size={17} />
              </button>
            </header>
            <div className={styles.content}>
              <label className={styles.field}>
                <span>用户名</span>
                <input value={identity.username} disabled readOnly />
                <small>用户名用于登录，不可修改</small>
              </label>
              <label className={styles.field} htmlFor="player-profile-name">
                <span>昵称</span>
                <input
                  id="player-profile-name"
                  autoFocus
                  maxLength={32}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <fieldset className={styles.skinField}>
                <legend>游戏角色</legend>
                <div className={styles.skinOptions}>
                  {builtInSkinOptions.map((skin) => (
                    <button
                      key={skin.id}
                      className={`${styles.skinOption}${skinId === skin.id ? ` ${styles.selected}` : ''}`}
                      type="button"
                      aria-pressed={skinId === skin.id}
                      onClick={() => setSkinId(skin.id)}
                    >
                      <img src={skin.preview} alt="" />
                      <span>{skin.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {error ? <p className={styles.error}>{error}</p> : null}
            </div>
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" disabled={saving} onClick={closeProfile}>
                取消
              </button>
              <button className={styles.primaryButton} type="submit" disabled={saving || !displayName.trim()}>
                {saving ? '保存中…' : '保存资料'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
