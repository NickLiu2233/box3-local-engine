import React from 'react';
import { useRouter } from 'next/router';

const TimeRestrictionPage: React.FC = () => {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 图标 */}
        <div style={styles.iconContainer}>
          <div style={styles.iconWrapper}>
            <svg
              style={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h1 style={styles.title}>时间到！</h1>

        {/* 说明文字 */}
        <p style={styles.description}>当前时间不在地图开放时段内</p>
        <p style={styles.subDescription}>
          请在地图开放时段内进入，注意合理安排时间哦～
        </p>

        {/* 返回按钮 */}
        <button
          onClick={handleGoHome}
          style={styles.button}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d46b00';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ff8100';
          }}
        >
          返回首页
        </button>

        {/* 提示信息 */}
        <div style={styles.timeInfo}>
          <p style={styles.timeText}>地图开放时间: 08:00-22:00</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #595959 0%, #404040 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    maxWidth: '400px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow:
      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    padding: '32px',
    textAlign: 'center' as const,
    border: '1px solid #e4e3db',
  },
  iconContainer: {
    marginBottom: '24px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    backgroundColor: '#ffdb99',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  icon: {
    width: '24px',
    height: '24px',
    color: '#ff8100',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1b1c18',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  description: {
    color: '#464741',
    marginBottom: '8px',
    margin: '0 0 8px 0',
    fontSize: '16px',
  },
  subDescription: {
    fontSize: '14px',
    color: '#777771',
    marginBottom: '32px',
    margin: '0 0 32px 0',
  },
  button: {
    width: '100%',
    backgroundColor: '#ff8100',
    color: '#ffffff',
    fontWeight: '500',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '16px',
    outline: 'none',
  },
  timeInfo: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f1ede3',
    borderRadius: '8px',
    border: '1px solid #e4e3db',
  },
  timeText: {
    fontSize: '12px',
    color: '#5e5f59',
    margin: '0',
  },
};

export default TimeRestrictionPage;
