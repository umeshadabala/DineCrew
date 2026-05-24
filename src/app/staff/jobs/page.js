'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useStaffProfile } from '../layout';
import styles from './page.module.css';

export default function StaffJobsPage() {
  const supabase = getSupabaseBrowser();
  const { staffProfile } = useStaffProfile();

  const [activeTab, setActiveTab] = useState('browse');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Apply modal
  const [applyingJob, setApplyingJob] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Set of job IDs the user has already applied to
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());

  useEffect(() => {
    async function fetchData() {
      if (!staffProfile) return;

      try {
        // Fetch active job postings from ALL businesses
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select('*, business:businesses(name, slug)')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        setJobs(jobsData || []);

        // Fetch user's applications
        const { data: appsData, error: appsError } = await supabase
          .from('job_applications')
          .select('*, job:job_postings(*, business:businesses(name, slug))')
          .eq('staff_id', staffProfile.id)
          .order('created_at', { ascending: false });

        if (appsError) throw appsError;
        setApplications(appsData || []);
        setAppliedJobIds(new Set((appsData || []).map((a) => a.job_id)));
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [staffProfile]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (roleFilter && job.role !== roleFilter) return false;
    if (typeFilter && job.employment_type !== typeFilter) return false;
    return true;
  });

  const handleApply = useCallback(
    async (e) => {
      e.preventDefault();
      if (!applyingJob || !staffProfile) return;

      setSubmitting(true);
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .insert({
            job_id: applyingJob.id,
            staff_id: staffProfile.id,
            cover_note: coverNote.trim() || null,
          })
          .select('*, job:job_postings(*, business:businesses(name, slug))')
          .single();

        if (error) throw error;

        setApplications((prev) => [data, ...prev]);
        setAppliedJobIds((prev) => new Set([...prev, applyingJob.id]));
        setApplyingJob(null);
        setCoverNote('');
      } catch (err) {
        console.error('Error applying:', err);
        alert('Failed to apply. You may have already applied to this job.');
      } finally {
        setSubmitting(false);
      }
    },
    [applyingJob, staffProfile, coverNote]
  );

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

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  }

  function getStatusClass(status) {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'reviewed':
        return styles.statusReviewed;
      case 'accepted':
        return styles.statusAccepted;
      case 'rejected':
        return styles.statusRejected;
      default:
        return '';
    }
  }

  if (!staffProfile) return null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Jobs</h1>
        <p className={styles.subtitle}>
          Browse open positions across restaurants and hospitality venues
        </p>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'browse' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Jobs
          <span className={styles.tabBadge}>{jobs.length}</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'applications' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          My Applications
          <span className={styles.tabBadge}>{applications.length}</span>
        </button>
      </div>

      {/* Browse tab */}
      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="waiter">Waiter</option>
              <option value="chef">Chef</option>
              <option value="manager">Manager</option>
              <option value="host">Host</option>
              <option value="bartender">Bartender</option>
            </select>

            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.jobsGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className={styles.empty}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <p className={styles.emptyTitle}>No jobs found</p>
              <p className={styles.emptyText}>
                {roleFilter || typeFilter
                  ? 'Try adjusting your filters to see more results.'
                  : 'No job postings are available right now. Check back later!'}
              </p>
            </div>
          ) : (
            <div className={styles.jobsGrid}>
              {filteredJobs.map((job) => {
                const alreadyApplied = appliedJobIds.has(job.id);
                return (
                  <article key={job.id} className={styles.jobCard}>
                    <div className={styles.jobCardHeader}>
                      <div>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        <p className={styles.jobBusiness}>
                          {job.business?.name || 'Unknown Business'}
                        </p>
                      </div>
                      <span className={styles.roleBadge}>{job.role}</span>
                    </div>

                    <div className={styles.jobMeta}>
                      {/* Salary */}
                      <div className={styles.jobMetaItem}>
                        <svg className={styles.jobMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                      </div>

                      {/* Type */}
                      <div className={styles.jobMetaItem}>
                        <svg className={styles.jobMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ textTransform: 'capitalize' }}>
                          {job.employment_type.replace('-', ' ')}
                        </span>
                      </div>

                      {/* Location */}
                      {job.location && (
                        <div className={styles.jobMetaItem}>
                          <svg className={styles.jobMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{job.location}</span>
                        </div>
                      )}
                    </div>

                    {job.description && (
                      <p className={styles.jobDescription}>{job.description}</p>
                    )}

                    <div className={styles.jobCardFooter}>
                      <span className={styles.jobDate}>
                        Posted {timeAgo(job.created_at)}
                      </span>

                      {alreadyApplied ? (
                        <span className={styles.appliedBadge}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Applied
                        </span>
                      ) : (
                        <button
                          className={styles.applyBtn}
                          onClick={() => {
                            setApplyingJob(job);
                            setCoverNote('');
                          }}
                        >
                          <svg className={styles.applyBtnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          Apply
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <>
          {loading ? (
            <div className={styles.applicationsGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className={styles.empty}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className={styles.emptyTitle}>No applications yet</p>
              <p className={styles.emptyText}>
                Browse open jobs and apply to start building your applications list.
              </p>
            </div>
          ) : (
            <div className={styles.applicationsGrid}>
              {applications.map((app) => (
                <article key={app.id} className={styles.applicationCard}>
                  <div className={styles.applicationCardHeader}>
                    <div>
                      <h3 className={styles.applicationTitle}>
                        {app.job?.title || 'Unknown Position'}
                      </h3>
                      <p className={styles.applicationBusiness}>
                        {app.job?.business?.name || 'Unknown Business'}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusClass(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className={styles.jobMeta}>
                    {app.job && (
                      <>
                        <div className={styles.jobMetaItem}>
                          <svg className={styles.jobMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          <span>{formatSalary(app.job.salary_min, app.job.salary_max)}</span>
                        </div>
                        <div className={styles.jobMetaItem}>
                          <svg className={styles.jobMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span style={{ textTransform: 'capitalize' }}>
                            {app.job.employment_type.replace('-', ' ')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {app.cover_note && (
                    <p className={styles.jobDescription}>{app.cover_note}</p>
                  )}

                  <p className={styles.applicationDate}>
                    Applied on {formatDate(app.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Apply modal */}
      {applyingJob && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setApplyingJob(null);
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2 className={styles.modalTitle}>Apply to {applyingJob.title}</h2>
            <p className={styles.modalSubtitle}>
              at {applyingJob.business?.name || 'this business'}
            </p>

            <form onSubmit={handleApply}>
              <textarea
                className={styles.modalTextarea}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Write a short cover note (optional). Tell them why you'd be a great fit…"
                rows={4}
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setApplyingJob(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
