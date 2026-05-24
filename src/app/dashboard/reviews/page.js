'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

export default function DashboardReviews() {
  const { business } = useDashboard();
  const [reviews, setReviews] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [staffFilter, setStaffFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30'); // '24h', '7', '30', 'all'

  const supabase = getSupabaseBrowser();

  const fetchStaffOptions = useCallback(async () => {
    if (!business) return;
    try {
      const { data, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name')
        .eq('business_id', business.id)
        .order('name', { ascending: true });

      if (staffError) throw staffError;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff filters:', err);
    }
  }, [business, supabase]);

  const fetchReviews = useCallback(async () => {
    if (!business) return;
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('reviews')
        .select('*, staff_profiles(name), tables(table_number)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      // Apply sentiment filter
      if (sentimentFilter !== 'all') {
        query = query.eq('sentiment', sentimentFilter);
      }

      // Apply staff filter
      if (staffFilter !== 'all') {
        if (staffFilter === 'general') {
          query = query.is('staff_id', null);
        } else {
          query = query.eq('staff_id', staffFilter);
        }
      }

      // Apply time filter
      if (timeFilter !== 'all') {
        let threshold = new Date();
        if (timeFilter === '24h') {
          threshold.setHours(threshold.getHours() - 24);
        } else {
          threshold.setDate(threshold.getDate() - Number(timeFilter));
        }
        query = query.gte('created_at', threshold.toISOString());
      }

      const { data, error: reviewsError } = await query;

      if (reviewsError) throw reviewsError;
      setReviews(data || []);
    } catch (err) {
      setError('Failed to fetch reviews: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [business, supabase, staffFilter, sentimentFilter, timeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaffOptions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStaffOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReviews]);

  const renderStars = (rating) => {
    if (!rating) return '-';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className={styles.container}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Filter Toolbar */}
      <section className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="filter-staff">Staff Member</label>
          <select 
            id="filter-staff" 
            value={staffFilter} 
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <option value="all">All Staff & General</option>
            <option value="general">General (No Staff Selected)</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="filter-sentiment">Sentiment</label>
          <select 
            id="filter-sentiment" 
            value={sentimentFilter} 
            onChange={(e) => setSentimentFilter(e.target.value)}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">👍 Positive</option>
            <option value="negative">👎 Negative</option>
            <option value="neutral">😐 Neutral</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="filter-time">Time Period</label>
          <select 
            id="filter-time" 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </section>

      {/* Reviews Table/List Container */}
      <section className={styles.reviewsSection}>
        {loading ? (
          <div className={styles.loadingPulse}>
            <div className={styles.shimmerRow}></div>
            <div className={styles.shimmerRow}></div>
            <div className={styles.shimmerRow}></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>No matching reviews found</h3>
            <p>Try adjusting your filters or checking back later.</p>
          </div>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.reviewerInfo}>
                    <span className={styles.guestName}>{review.guest_name || 'Anonymous Guest'}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className={styles.badgeSection}>
                    {review.sentiment === 'positive' && (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>👍 Loved It</span>
                    )}
                    {review.sentiment === 'negative' && (
                      <span className={`${styles.badge} ${styles.badgeError}`}>👎 Could Improve</span>
                    )}
                    {review.sentiment === 'neutral' && (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>😐 Neutral</span>
                    )}

                    {review.tip_amount > 0 && (
                      <span className={styles.tipBadge}>
                        Tipped ₹{Number(review.tip_amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardContext}>
                  <div className={styles.contextItem}>
                    <span className={styles.contextLabel}>Table:</span>
                    <span className={styles.contextVal}>{review.tables?.table_number || 'General QR'}</span>
                  </div>
                  <div className={styles.contextItem}>
                    <span className={styles.contextLabel}>Staff Assigned:</span>
                    <span className={styles.contextVal}>{review.staff_profiles?.name || 'General Venue'}</span>
                  </div>
                  {review.food_rating && (
                    <div className={styles.contextItem}>
                      <span className={styles.contextLabel}>Food:</span>
                      <span className={styles.starsVal}>{renderStars(review.food_rating)}</span>
                    </div>
                  )}
                  {review.service_rating && (
                    <div className={styles.contextItem}>
                      <span className={styles.contextLabel}>Service:</span>
                      <span className={styles.starsVal}>{renderStars(review.service_rating)}</span>
                    </div>
                  )}
                </div>

                {review.feedback ? (
                  <div className={styles.feedbackBlock}>
                                   <p className={styles.feedbackText}>&quot;{review.feedback}&quot;</p>
                  </div>
                ) : (
                  <div className={styles.feedbackBlock}>
                    <p className={styles.noFeedbackText}>No written comments provided.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
