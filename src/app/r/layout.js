import styles from './layout.module.css';
import './global.css';

export default function GuestLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  );
}
