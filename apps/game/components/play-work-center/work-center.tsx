import Link from 'next/link'
import type { MouseEvent, ReactNode } from 'react'
import { ArrowUpRight, Box } from 'lucide-react'
import { PlaySiteHeader, PlayWorkNavigation } from './header'
import styles from './work-center.module.css'

export function PlayWorkCenter({
  current,
  counts,
  account,
  children,
}: {
  current: 'maps' | 'models'
  counts: { maps: number; models: number }
  account?: ReactNode
  children: ReactNode
}) {
  return (
    <main className={styles.page}>
      <style jsx global>{`
        body {
          margin: 0;
          background: #262626;
          color: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
      <PlaySiteHeader
        account={account}
        navigation={<PlayWorkNavigation current={current} counts={counts} />}
      />
      {children}
    </main>
  )
}

export function WorkCenterHeading({ title, count }: { title: string; count: string }) {
  return (
    <div className={styles.heading}>
      <h1>{title}</h1>
      <span>{count}</span>
    </div>
  )
}

export function WorkCenterCollections<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange?: (value: T) => void
}) {
  return (
    <nav className={styles.collections} aria-label="作品分类">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? styles.active : undefined}
          aria-pressed={value === option.value}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </nav>
  )
}

export function WorkCenterGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.grid} aria-label={label}>
      {children}
    </div>
  )
}

export function WorkCenterCard({
  href,
  title,
  cover,
  metadata,
  description,
  actionLabel,
  badge,
  status,
  favorite,
  onOpen,
}: {
  href: string
  title: string
  cover?: string
  metadata?: string
  description?: string
  actionLabel: string
  badge?: string
  status?: string
  favorite?: { active: boolean; label: string; onToggle: () => void }
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <article className={styles.card}>
      {favorite ? (
        <button
          className={styles.favorite}
          aria-label={favorite.label}
          aria-pressed={favorite.active}
          onClick={favorite.onToggle}
        >
          {favorite.active ? '★' : '☆'}
        </button>
      ) : null}
      {status ? <span className={styles.closed}>{status}</span> : null}
      <Link className={styles.cardLink} href={href} onClick={onOpen}>
        <div className={styles.cover}>
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <Box size={48} strokeWidth={1.5} aria-hidden="true" />
          )}
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </div>
        <div className={styles.info}>
          <strong>{title}</strong>
          {metadata ? <small>{metadata}</small> : null}
          {description ? <p>{description}</p> : null}
          <span className={styles.cta}>
            {actionLabel} <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  )
}

export function WorkCenterEmpty({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children?: ReactNode
}) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      <small>{hint}</small>
      {children}
    </div>
  )
}
