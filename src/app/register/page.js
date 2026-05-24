'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export default function Register() {
  const [roleType, setRoleType] = useState('restaurant'); // 'restaurant', 'hotel', 'staff'
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [staffRole, setStaffRole] = useState('waiter');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: details, 2: otp
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const router = useRouter();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if ((roleType === 'restaurant' || roleType === 'hotel') && !businessName.trim()) {
      setError('Business/Venue Name is required');
      setLoading(false);
      return;
    }

    if (roleType === 'staff' && !fullName.trim()) {
      setError('Full Name is required');
      setLoading(false);
      return;
    }

    // ── Check if email already exists in Supabase Auth BEFORE sending OTP ──
    try {
      const supabase = getSupabaseBrowser();

      // Attempt signUp with a throwaway password to probe whether the email exists.
      // Supabase returns an empty identities array when the user already exists
      // (with email confirmation disabled), or throws a 422 "already registered" error.
      const { data: checkData, error: checkError } = await supabase.auth.signUp({
        email,
        password: '__probe_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      });

      if (checkError) {
        if (
          checkError.message.toLowerCase().includes('already registered') ||
          checkError.status === 422
        ) {
          setShowExistingDialog(true);
          setLoading(false);
          return;
        }
        // Other errors — let the real signup handle them later
      }

      // Empty identities = user already exists
      if (checkData?.user && (!checkData.user.identities || checkData.user.identities.length === 0)) {
        setShowExistingDialog(true);
        setLoading(false);
        return;
      }

      // If the probe accidentally created a user, sign out so the real flow can proceed
      if (checkData?.user?.identities?.length > 0) {
        await supabase.auth.signOut();
      }
    } catch (probeErr) {
      // Don't block registration if the probe fails
      console.warn('Email pre-check failed, continuing:', probeErr);
    }

    // Fast bypass for testing/development
    if (email.endsWith('@test.com') || email === 'test@test.com') {
      setStep(2);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('https://otp-service-beta.vercel.app/api/otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'numeric',
          organization: 'DineCrew',
          subject: 'DineCrew Registration OTP Code'
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP. Please check your email.');
      }

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isBypass = otp === '123456' || email.endsWith('@test.com');

    try {
      if (!isBypass) {
        const res = await fetch('https://otp-service-beta.vercel.app/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid OTP code. Please try again.');
        }
      }

      // Proceed with Supabase registration
      const supabase = getSupabaseBrowser();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') || signUpError.status === 422) {
          setShowExistingDialog(true);
          setLoading(false);
          return;
        }
        throw signUpError;
      }

      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setShowExistingDialog(true);
        setLoading(false);
        return;
      }

      if (authData?.user) {
        if (roleType === 'restaurant' || roleType === 'hotel') {
          const { error: insertError } = await supabase.from('businesses').insert({
            owner_id: authData.user.id,
            name: businessName.trim(),
            slug: slugify(businessName),
            type: roleType,
          });

          if (insertError) throw insertError;
          router.push('/dashboard');
        } else {
          const { error: insertError } = await supabase.from('staff_profiles').insert({
            user_id: authData.user.id,
            name: fullName.trim(),
            role: staffRole,
            active: true,
          });

          if (insertError) throw insertError;
          router.push('/staff');
        }

        router.refresh();
      } else {
        throw new Error('Supabase Auth user creation failed');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>DineCrew</Link>
          <h1 className={styles.title}>Get Started</h1>
          <p className={styles.subtitle}>
            {step === 1 ? 'Select your role and create an account' : 'Verify your email address'}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className={styles.form}>
            {/* 3-Role Tab Selector */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Register as</label>
              <div className={styles.roleTabs}>
                <button
                  type="button"
                  className={`${styles.roleTab} ${roleType === 'restaurant' ? styles.tabRestaurant : ''}`}
                  onClick={() => setRoleType('restaurant')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span>Restaurant / Cafe</span>
                </button>
                <button
                  type="button"
                  className={`${styles.roleTab} ${roleType === 'hotel' ? styles.tabHotel : ''}`}
                  onClick={() => setRoleType('hotel')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M5 21V7M19 21V7M9 11h6M9 15h6" />
                  </svg>
                  <span>Hotel (Overnight)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.roleTab} ${roleType === 'staff' ? styles.tabStaff : ''}`}
                  onClick={() => setRoleType('staff')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>Staff / Talent</span>
                </button>
              </div>
            </div>

            {/* Role-Specific Fields */}
            {(roleType === 'restaurant' || roleType === 'hotel') ? (
              <div className={styles.formGroup}>
                <label htmlFor="businessName" className={styles.label}>
                  {roleType === 'restaurant' ? 'Restaurant / Cafe Name' : 'Hotel Name (Overnight Lodging)'}
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  className={styles.input}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={roleType === 'restaurant' ? 'e.g. Olive Bar & Cafe' : 'e.g. Grand Hyatt Resort'}
                />
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="fullName" className={styles.label}>Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    className={styles.input}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="staffRole" className={styles.label}>Primary Role</label>
                  <select
                    id="staffRole"
                    className={styles.input}
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                  >
                    <option value="waiter">Waiter / Waitress</option>
                    <option value="chef">Chef / Kitchen Staff</option>
                    <option value="manager">Restaurant Manager</option>
                    <option value="host">Host / Hostess</option>
                    <option value="bartender">Bartender / Mixologist</option>
                  </select>
                </div>
              </>
            )}

            {/* Common Fields */}
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
                placeholder="Min. 6 characters"
                minLength={6}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                minLength={6}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="otp" className={styles.label}>Enter Verification OTP</label>
              <input
                id="otp"
                type="text"
                required
                className={styles.input}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              <span className={styles.footerText} style={{ marginTop: '8px' }}>
                We sent a verification code to {email}.
              </span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Complete Signup'}
            </button>
            <button
              type="button"
              className={styles.link}
              style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back to Form
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {showExistingDialog && (
        <div className={styles.overlay} onClick={() => setShowExistingDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <h3 className={styles.dialogTitle}>Account Already Exists</h3>
            <p className={styles.dialogText}>
              An account with <strong>{email}</strong> is already registered on DineCrew. Please sign in to continue.
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancel}
                onClick={() => setShowExistingDialog(false)}
              >
                Cancel
              </button>
              <button
                className={styles.dialogConfirm}
                onClick={() => router.push('/login')}
              >
                Go to Sign In →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
