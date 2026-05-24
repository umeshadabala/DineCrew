'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useStaffProfile } from './layout';
import styles from './page.module.css';

export default function StaffOverviewPage() {
  const { staffProfile } = useStaffProfile();
  const supabase = getSupabaseBrowser();

  const [applications, setApplications] = useState([]);
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!staffProfile) return;

      try {
        setLoading(true);
        // Fetch user's job applications
        const { data: appsData, error: appsError } = await supabase
          .from('job_applications')
          .select('*, job:job_postings(*, business:businesses(name, slug))')
          .eq('staff_id', staffProfile.id)
          .order('created_at', { ascending: false });

        if (appsError) throw appsError;
        setApplications(appsData || []);

        // Fetch latest active job postings (limit to 4)
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select('*, business:businesses(name, slug)')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(4);

        if (jobsError) throw jobsError;
        setLatestJobs(jobsData || []);
      } catch (err) {
        console.error('Error fetching staff dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [staffProfile, supabase]);

  // Compute job stats
  const stats = useMemo(() => {
    const totalApplied = applications.length;
    const pendingCount = applications.filter((a) => a.status === 'pending').length;
    const acceptedCount = applications.filter((a) => a.status === 'accepted').length;

    return { totalApplied, pendingCount, acceptedCount };
  }, [applications]);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatSalary(min, max) {
    const fmt = (n) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);

    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    if (max) return `Up to ${fmt(max)}`;
    return 'Negotiable';
  }

  const firstName = staffProfile?.name?.split(' ')[0] || 'there';

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>Welcome back, {firstName}</h1>
        <p className={styles.subtitle}>
          Manage your job applications and explore new hospitality career opportunities.
        </p>
      </header>

      {/* Stats */}
      {loading ? (
        <div className={styles.statsGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : (
        <div className={styles.statsGrid}>
          {/* Total Applications */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Total Applications</span>
              <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                <svg className={styles.statIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
            </div>
            <span className={styles.statValue}>{stats.totalApplied}</span>
            <span className={styles.statFooter}>Jobs you have applied to</span>
          </div>

          {/* Pending Review */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Pending Review</span>
              <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
                <svg className={styles.statIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <span className={styles.statValue}>{stats.pendingCount}</span>
            <span className={styles.statFooter}>Awaiting employer response</span>
          </div>

          {/* Accepted Applications */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Interviews / Offers</span>
              <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                <svg className={styles.statIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <span className={styles.statValue}>{stats.acceptedCount}</span>
            <span className={styles.statFooter}>Successful applications</span>
          </div>
        </div>
      )}

      {/* Main Dashboard Panels */}
      <div className={styles.dashboardGrid}>
        {/* Left Side: Recent Applications */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>My Recent Applications</h2>
            {applications.length > 0 && (
              <Link href="/staff/jobs" className={styles.viewJobsLink}>
                View all applications &rarr;
              </Link>
            )}
          </div>

          {loading ? (
            <div className={styles.tableWrapper}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonRow}`} />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className={styles.tableWrapper}>
              <div className={styles.empty}>
                <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <p className={styles.emptyTitle}>No applications submitted yet</p>
                <p className={styles.emptyText}>
                  Explore open jobs in the marketplace and submit applications.
                </p>
                <Link href="/staff/jobs" className={styles.viewJobsLink} style={{ marginTop: 'var(--space-2)' }}>
                  Browse Jobs Now
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Business</th>
                    <th>Date Applied</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app.id}>
                      <td>
                        <span style={{ fontWeight: 'var(--weight-semibold)' }}>
                          {app.job?.title || 'Unknown Job'}
                        </span>
                      </td>
                      <td>{app.job?.business?.name || 'Unknown Business'}</td>
                      <td>{formatDate(app.created_at)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            app.status === 'pending'
                              ? styles.statusPending
                              : app.status === 'reviewed'
                              ? styles.statusReviewed
                              : app.status === 'accepted'
                              ? styles.statusAccepted
                              : styles.statusRejected
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Side: Recommended Jobs */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Latest Jobs</h2>
            <Link href="/staff/jobs" className={styles.viewJobsLink}>
              Browse all jobs &rarr;
            </Link>
          </div>

          {loading ? (
            <div className={styles.jobOpeningsList}>
              {[1, 2].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonRow}`} style={{ height: '80px' }} />
              ))}
            </div>
          ) : latestJobs.length === 0 ? (
            <div className={styles.empty} style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <p className={styles.emptyTitle}>No open listings</p>
              <p className={styles.emptyText}>There are no jobs posted at the moment.</p>
            </div>
          ) : (
            <div className={styles.jobOpeningsList}>
              {latestJobs.map((job) => (
                <div key={job.id} className={styles.miniJobCard}>
                  <div className={styles.miniJobHeader}>
                    <div>
                      <h3 className={styles.miniJobTitle}>{job.title}</h3>
                      <p className={styles.miniJobBusiness}>
                        {job.business?.name || 'Unknown Business'}
                      </p>
                    </div>
                    <span className={styles.roleBadge}>{job.role}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {job.employment_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
