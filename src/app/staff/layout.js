'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './layout.module.css';

// Context so child pages can access staffProfile without refetching
const StaffContext = createContext(null);
export function useStaffProfile() {
  return useContext(StaffContext);
}

export default function StaffLayout({ children }) {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const pathname = usePathname();

  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login?redirect=/staff');
          return;
        }

        const { data: profile } = await supabase
          .from('staff_profiles')
          .select('*, business:businesses(name, slug)')
          .eq('user_id', user.id)
          .single();

        setStaffProfile(profile);
      } catch (err) {
        console.error('Error loading staff profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const navItems = [
    {
      href: '/staff',
      label: 'Overview',
      icon: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      href: '/staff/profile',
      label: 'Profile',
      icon: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      href: '/staff/jobs',
      label: 'Jobs',
      icon: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading your profile…</p>
      </div>
    );
  }

  return (
    <StaffContext.Provider value={{ staffProfile, setStaffProfile }}>
      <div className={styles.layout}>
        {/* Navbar */}
        <nav className={styles.navbar}>
          <div className={styles.navInner}>
            <Link href="/staff" className={styles.logoLink}>
              <svg className={styles.logoIcon} viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 4a4 4 0 110 8 4 4 0 010-8zm0 20c-3.866 0-7.26-1.984-9.258-4.986C8.758 18.52 13.334 17 16 17s7.242 1.52 9.258 4.014C23.26 24.016 19.866 26 16 26z" />
              </svg>
              <span className={styles.logoText}>Dine<span>Crew</span></span>
            </Link>

            {/* Desktop nav links */}
            <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ''}`}>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/staff'
                    ? pathname === '/staff'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}

              {/* Sign out in mobile menu */}
              <button
                className={`${styles.signOutBtn} ${styles.mobileOnly}`}
                onClick={handleSignOut}
                style={{ marginTop: 'auto' }}
              >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>

            {/* Right side */}
            <div className={styles.navRight}>
              {staffProfile && (
                <div className={styles.staffBadge}>
                  <div className={styles.staffAvatar}>
                    {getInitials(staffProfile.name)}
                  </div>
                  <span>{staffProfile.name}</span>
                </div>
              )}

              <button className={styles.signOutBtn} onClick={handleSignOut}>
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>

              {/* Hamburger */}
              <button
                className={styles.hamburger}
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {mobileMenuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className={styles.main}>
          {!staffProfile ? (
            <div className={styles.noProfile}>
              <svg className={styles.noProfileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <h2 className={styles.noProfileTitle}>No Staff Profile Found</h2>
              <p className={styles.noProfileText}>
                Your account is not linked to any staff profile yet. Please ask your
                restaurant manager to add you, or contact support.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </StaffContext.Provider>
  );
}
