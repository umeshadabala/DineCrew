'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

function LoginForm() {
  const [roleType, setRoleType] = useState('restaurant'); // 'restaurant', 'hotel', 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Translate raw Supabase errors into user-friendly messages
      const msg = signInError.message?.toLowerCase() || '';
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError('Incorrect email or password. Please double-check and try again, or register if you don\'t have an account.');
      } else if (msg.includes('email not confirmed')) {
        setError('Your email has not been confirmed yet. Please check your inbox.');
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    try {
      // 1. Check if user is a business owner (restaurant or hotel)
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, type')
        .eq('owner_id', authData.user.id)
        .maybeSingle();

      if (bizError) throw bizError;

      if (business) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // 2. Check if user is a staff member
      const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (staffError) throw staffError;

      if (staff) {
        router.push('/staff');
        router.refresh();
        return;
      }

      // 3. Unregistered account case
      await supabase.auth.signOut();
      setError('This account does not have a registered business or staff profile. Please sign up first.');
      setLoading(false);
    } catch (err) {
      setError('Authentication check failed: ' + err.message);
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    if (roleType === 'restaurant') return 'Restaurant & Cafe Portal';
    if (roleType === 'hotel') return 'Hotel Portal';
    return 'Staff Member Portal';
  };

  const getRoleSub = () => {
    if (roleType === 'restaurant') return 'Manage tables, tips, and staff for your dining venue';
    if (roleType === 'hotel') return 'Manage rooms, feedback, and tips for your hotel';
    return 'Browse hospitality job openings and manage your applications';
  };

  const getTabClass = (tab) => {
    if (roleType !== tab) return '';
    if (tab === 'restaurant') return styles.tabRestaurant;
    if (tab === 'hotel') return styles.tabHotel;
    return styles.tabStaff;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>DineCrew</Link>
        <h1 className={styles.title}>{getRoleTitle()}</h1>
        <p className={styles.subtitle}>{getRoleSub()}</p>
      </div>

      {/* Role Selection Tabs */}
      <div className={styles.roleTabs}>
        <button
          type="button"
          className={`${styles.roleTab} ${getTabClass('restaurant')}`}
          onClick={() => setRoleType('restaurant')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>Restaurant / Cafe</span>
        </button>
        <button
          type="button"
          className={`${styles.roleTab} ${getTabClass('hotel')}`}
          onClick={() => setRoleType('hotel')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M5 21V7M19 21V7M9 11h6M9 15h6" />
          </svg>
          <span>Hotel</span>
        </button>
        <button
          type="button"
          className={`${styles.roleTab} ${getTabClass('staff')}`}
          onClick={() => setRoleType('staff')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span>Staff Portal</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email Address</label>
          <input
            id="email"
            type="email"
            required
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <input
            id="password"
            type="password"
            required
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.footer}>
         <p className={styles.footerText}>
           Don&apos;t have an account?{' '}
           <Link href="/register" className={styles.link}>
             Register
           </Link>
         </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.card}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
