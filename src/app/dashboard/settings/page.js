'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

export default function DashboardSettings() {
  const { business, refreshData } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  
  // Danger confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const supabase = getSupabaseBrowser();

  useEffect(() => {
    if (business) {
      // Use requestAnimationFrame or setTimeout to avoid synchronous setState in useEffect
      requestAnimationFrame(() => {
        setName(business.name || '');
        setPhone(business.phone || '');
        setEmail(business.email || '');
        setAddress(business.address || '');
        setCity(business.city || '');
        setGooglePlaceId(business.google_place_id || '');
      });
    }
  }, [business]);

  const showFlash = (type, message) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          google_place_id: googlePlaceId.trim() || null,
        })
        .eq('id', business.id);

      if (updateError) throw updateError;

      showFlash('success', 'Business settings updated successfully');
      refreshData(); // Refresh the context data so the sidebar updates too
    } catch (err) {
      showFlash('error', 'Error updating settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      showFlash('error', 'Please type DELETE to confirm');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Deleting the business. RLS and CASCADE will handle tables, staff, reviews, jobs, applications.
      const { error: deleteError } = await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id);

      if (deleteError) throw deleteError;

      // Delete the Supabase auth user
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;

      alert('Your DineCrew business account has been deleted.');
      router.push('/');
      router.refresh();
    } catch (err) {
      showFlash('error', 'Error deleting business profile: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast notifications */}
      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}
      {error && <div className={`${styles.toast} ${styles.toastError}`}>{error}</div>}

      <div className={styles.settingsGrid}>
        {/* Profile Card Form */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Venue Profile</h3>
          </div>
          <form onSubmit={handleUpdateSettings} className={styles.panelContent}>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="biz-name">Business Name</label>
                <input
                  id="biz-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="biz-slug">Subdomain / QR Path (Read-only)</label>
                <input
                  id="biz-slug"
                  type="text"
                  disabled
                  value={business?.slug || ''}
                  className={styles.disabledInput}
                />
                <span className={styles.hintText}>
                  Changing slugs is disabled to protect active venue QR codes.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="biz-phone">Contact Phone</label>
                <input
                  id="biz-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="biz-email">Contact Email</label>
                <input
                  id="biz-email"
                  type="email"
                  placeholder="e.g. operations@venue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                <label htmlFor="biz-address">Street Address</label>
                <input
                  id="biz-address"
                  type="text"
                  placeholder="e.g. Shop 24, Outer Circle"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="biz-city">City</label>
                <input
                  id="biz-city"
                  type="text"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="biz-place">Google Place ID (optional)</label>
                <input
                  id="biz-place"
                  type="text"
                  placeholder="e.g. ChIJV4kYFzPA"
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                />
                <span className={styles.hintText}>
                  Enables deep linking to your Google Maps review section for happy guests.
                </span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Informative Help Sidebar */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Platform Settings Info</h3>
          </div>
          <div className={styles.panelContent}>
            <div className={styles.infoBlock}>
              <h4>Integrating with Google Maps</h4>
              <p>
                By adding your Google Place ID, DineCrew automatically redirects guests who submit a 
                thumbs-up feedback screen to your Google Business Profile page. This increases your search ranking 
                by turning private restaurant tips into public search reviews!
              </p>
              <a 
                href="https://developers.google.com/maps/documentation/places/web-service/place-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.infoLink}
              >
                How to find your Place ID ↗
              </a>
            </div>

            <div className={styles.infoBlock}>
              <h4>Currency & Payouts</h4>
               <p>
                 DineCrew uses standard UPI Deep-linking for immediate Peer-to-Peer payment settlement. 
                 Tips are sent directly from the guest&apos;s phone to the staff&apos;s personal bank account using 
                 their configured UPI IDs. DineCrew takes 0% commission on tips.
               </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`${styles.panelCard} ${styles.dangerPanel}`} style={{ gridColumn: 'span 2' }}>
          <div className={styles.panelHeader}>
            <h3 className={styles.dangerTitle}>Danger Zone</h3>
          </div>
          <div className={styles.panelContent}>
            {!showDeleteConfirm ? (
              <div className={styles.dangerRow}>
                <div>
                  <h4>Delete Business Account</h4>
                  <p>
                    Permanently delete your DineCrew business profile, including all staff, tables, active job postings, 
                    and guest reviews. This action is irreversible.
                  </p>
                </div>
                <button 
                  className={styles.deleteInitBtn}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Business
                </button>
              </div>
            ) : (
              <div className={`${styles.dangerConfirmBox} ${styles.animateFade}`}>
                <h4>Are you absolutely sure?</h4>
                <p>
                  This will wipe out your staff list, table configurations, tip histories, and job postings. 
                  Please type <strong>DELETE</strong> in the box below to confirm:
                </p>
                <div className={styles.confirmActions}>
                  <input
                    type="text"
                    required
                    placeholder="Type DELETE"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className={styles.confirmInput}
                  />
                  <button 
                    className={styles.deleteConfirmBtn}
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmationText !== 'DELETE' || loading}
                  >
                    Permanently Wipe Data
                  </button>
                  <button 
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationText('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
