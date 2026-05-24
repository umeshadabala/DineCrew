'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from './layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

export default function DashboardOverview() {
  const { business } = useDashboard();
  const [stats, setStats] = useState({
    reviewCount: 0,
    averageRating: 5.0,
    totalTips: 0,
    staffCount: 0,
  });
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    if (!business) return;

    const fetchOverviewData = async () => {
      try {
        setLoading(true);

        // 1. Fetch reviews count & rating details
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, sentiment, food_rating, service_rating, tip_amount, feedback, created_at, staff_profiles(name)')
          .eq('business_id', business.id);

        if (reviewsError) throw reviewsError;

        // 2. Fetch staff count
        const { count: staffCount, error: staffError } = await supabase
          .from('staff_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('active', true);

        if (staffError) throw staffError;

        // Calculate stats from reviews
        const totalReviews = reviewsData.length;
        let sumRating = 0;
        let ratingCount = 0;
        let sumTips = 0;

        reviewsData.forEach((rev) => {
          if (rev.food_rating) {
            sumRating += rev.food_rating;
            ratingCount++;
          }
          if (rev.service_rating) {
            sumRating += rev.service_rating;
            ratingCount++;
          }
          if (rev.tip_amount) {
            sumTips += Number(rev.tip_amount);
          }
        });

        // If ratings are available, average them. Otherwise base it on sentiment.
        let avgRating = 5.0;
        if (ratingCount > 0) {
          avgRating = (sumRating / ratingCount).toFixed(1);
        } else if (totalReviews > 0) {
          const positiveCount = reviewsData.filter(r => r.sentiment === 'positive').length;
          avgRating = ((positiveCount / totalReviews) * 5).toFixed(1);
        }

        // Format recent reviews (take top 5 latest)
        const sortedReviews = [...reviewsData]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        setStats({
          reviewCount: totalReviews,
          averageRating: avgRating,
          totalTips: sumTips,
          staffCount: staffCount || 0,
        });

        setRecentReviews(sortedReviews);
      } catch (err) {
        console.error('Error fetching overview stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [business]);

  if (loading) {
    return (
      <div className={styles.loadingPulse}>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerGrid}>
          <div className={styles.shimmerCard}></div>
          <div className={styles.shimmerCard}></div>
          <div className={styles.shimmerCard}></div>
          <div className={styles.shimmerCard}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Welcome Hero Banner */}
      <section className={styles.welcomeBanner}>
         <div className={styles.welcomeInfo}>
           <h2 className={styles.welcomeTitle}>Hello, {business?.name}!</h2>
           <p className={styles.welcomeSub}>Here is what&apos;s happening at your restaurant today.</p>
         </div>
        <div className={styles.quickActions}>
          <Link href="/dashboard/staff" className={styles.actionBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="16" y1="11" x2="22" y2="11" />
            </svg>
            <span>Add Staff</span>
          </Link>
          <Link href="/dashboard/tables" className={styles.actionBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 3v18" />
              <path d="M3 12h18" />
            </svg>
            <span>Venue QR & {business?.type === 'hotel' ? 'Rooms' : 'Tables'}</span>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        {/* Card 1: Rating */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Average Rating</span>
            <div className={`${styles.statIcon} ${styles.iconGold}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className={styles.statValue}>{stats.averageRating} <span className={styles.statValueMax}>/ 5</span></div>
          <div className={styles.statSub}>Based on guest ratings & feedback</div>
        </div>

        {/* Card 2: Total Tips */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Tips Earned</span>
            <div className={`${styles.statIcon} ${styles.iconTeal}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className={styles.statValue}>₹{stats.totalTips.toLocaleString('en-IN')}</div>
          <div className={styles.statSub}>Directly received by your staff</div>
        </div>

        {/* Card 3: Feedback Submissions */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Reviews Received</span>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <div className={styles.statValue}>{stats.reviewCount}</div>
          <div className={styles.statSub}>Total guest reviews submitted</div>
        </div>

        {/* Card 4: Active Staff */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Active Staff</span>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className={styles.statValue}>{stats.staffCount}</div>
          <div className={styles.statSub}>Currently registered members</div>
        </div>
      </section>

      {/* Main Grid: Feedback & Navigation */}
      <div className={styles.dashboardGrid}>
        {/* Recent Feedback Panel */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Guest Reviews</h3>
            <Link href="/dashboard/reviews" className={styles.panelLink}>View All</Link>
          </div>
          <div className={styles.panelContent}>
            {recentReviews.length === 0 ? (
              <div className={styles.emptyState}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>No reviews received yet.</p>
                <span className={styles.emptySub}>QR scan feedback will appear here.</span>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {recentReviews.map((review) => (
                  <div key={review.id} className={styles.reviewItem}>
                    <div className={styles.reviewMeta}>
                      <div className={styles.reviewTarget}>
                        <span className={styles.staffBadge}>
                          {review.staff_profiles?.name || 'General Feedback'}
                        </span>
                        {review.tip_amount > 0 && (
                          <span className={styles.tipBadge}>
                            Tipped ₹{review.tip_amount}
                          </span>
                        )}
                      </div>
                      <span className={styles.reviewTime}>
                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className={styles.reviewBody}>
                      <div className={styles.sentimentIndicator}>
                        {review.sentiment === 'positive' && (
                          <span className={`${styles.badge} ${styles.badgeSuccess}`}>👍 Good</span>
                        )}
                        {review.sentiment === 'negative' && (
                          <span className={`${styles.badge} ${styles.badgeError}`}>👎 Bad</span>
                        )}
                        {review.sentiment === 'neutral' && (
                          <span className={`${styles.badge} ${styles.badgeWarning}`}>😐 Neutral</span>
                        )}
                        
                        {/* Rating stars if available */}
                        {(review.food_rating || review.service_rating) && (
                          <span className={styles.starsText}>
                            ★ Food: {review.food_rating || '-'} | Service: {review.service_rating || '-'}
                          </span>
                        )}
                      </div>
                      {review.feedback && (
                                    <p className={styles.feedbackText}>&quot;{review.feedback}&quot;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info & Operations Card */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Operations Overview</h3>
          </div>
          <div className={styles.panelContent}>
            <div className={styles.quickLinksGrid}>
              <Link href="/dashboard/tables" className={styles.featureLinkCard}>
                <div className={styles.featureLinkHeader}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tealText}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <path d="M3 9h18" />
                  </svg>
                  <h4>{business?.type === 'hotel' ? 'Rooms & QR Setup' : 'Tables & QR Setup'}</h4>
                </div>
                <p>
                  {business?.type === 'hotel' 
                    ? 'Get your venue QR code, set up rooms, and assign default housekeepers or servers.' 
                    : 'Get your venue QR code, set up dining tables, and assign default servers.'}
                </p>
              </Link>

              <Link href="/dashboard/jobs" className={styles.featureLinkCard}>
                <div className={styles.featureLinkHeader}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.purpleText}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <h4>Hospitality Hiring</h4>
                </div>
                <p>Post open shifts or permanent jobs and connect directly with talent on the DineCrew network.</p>
              </Link>
            </div>
            
            <div className={styles.gettingStartedGuide}>
              <h4 className={styles.guideTitle}>Getting Started Checklist</h4>
              <ul className={styles.guideList}>
                <li className={stats.staffCount > 0 ? styles.guideCompleted : ''}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Add your staff profiles and configure their UPI IDs</span>
                </li>
                <li className={stats.reviewCount > 0 ? styles.guideCompleted : ''}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{business?.type === 'hotel' ? 'Configure rooms and assign default staff' : 'Configure dining tables and assign default staff'}</span>
                </li>
                <li>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{business?.type === 'hotel' ? 'Display your unique venue QR code in rooms or lobby' : 'Display your unique venue QR code on tables or checkout'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
