'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

const ROLES = ['waiter', 'chef', 'manager', 'host', 'bartender'];
const TYPES = ['full-time', 'part-time', 'contract'];

export default function DashboardJobs() {
  const { business } = useDashboard();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({}); // mapped by jobId
  const [talent, setTalent] = useState([]); // independent staff members
  const [activeTab, setActiveTab] = useState('postings'); // 'postings' or 'talent'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('waiter');
  const [employmentType, setEmploymentType] = useState('full-time');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Expand states for applications details
  const [expandedJobId, setExpandedJobId] = useState(null);

  const supabase = getSupabaseBrowser();

  const fetchJobsAndApplications = useCallback(async () => {
    if (!business) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch job postings
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // 2. Fetch all job applications for these jobs
      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(j => j.id);
        const { data: appsData, error: appsError } = await supabase
          .from('job_applications')
          .select('*, staff_profiles(*)')
          .in('job_id', jobIds);

        if (appsError) throw appsError;

        // Group applications by jobId
        const appsMap = {};
        jobIds.forEach(id => { appsMap[id] = []; });
        appsData.forEach(app => {
          if (appsMap[app.job_id]) {
            appsMap[app.job_id].push(app);
          }
        });
        setApplications(appsMap);
      } else {
        setApplications({});
      }

      // 3. Fetch independent talent pool (staff not currently linked to a business, i.e. business_id is null)
      const { data: talentData, error: talentError } = await supabase
        .from('staff_profiles')
        .select('*')
        .is('business_id', null)
        .eq('active', true)
        .order('experience_years', { ascending: false });

      if (talentError) throw talentError;
      setTalent(talentData || []);

      setJobs(jobsData || []);
    } catch (err) {
      setError('Failed to fetch job data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [business, supabase]);
 
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobsAndApplications();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchJobsAndApplications]);

  const showFlash = (type, message) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setError(null);

      const minVal = salaryMin ? Number(salaryMin) : null;
      const maxVal = salaryMax ? Number(salaryMax) : null;

      if (minVal && maxVal && maxVal < minVal) {
        throw new Error('Maximum salary cannot be less than minimum salary');
      }

      const { error: insertError } = await supabase
        .from('job_postings')
        .insert({
          business_id: business.id,
          title: title.trim(),
          role,
          employment_type: employmentType,
          salary_min: minVal,
          salary_max: maxVal,
          location: location.trim() || null,
          description: description.trim() || null,
          active: true,
        });

      if (insertError) throw insertError;

      // Reset form
      setTitle('');
      setRole('waiter');
      setEmploymentType('full-time');
      setSalaryMin('');
      setSalaryMax('');
      setLocation('');
      setDescription('');
      setShowAddForm(false);

      showFlash('success', `Job posting "${title}" created successfully`);
      fetchJobsAndApplications();
    } catch (err) {
      showFlash('error', err.message);
    }
  };

  const handleToggleActive = async (jobId, currentStatus) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('job_postings')
        .update({ active: !currentStatus })
        .eq('id', jobId);

      if (updateError) throw updateError;
      showFlash('success', `Job posting status updated`);
      fetchJobsAndApplications();
    } catch (err) {
      showFlash('error', 'Error updating status: ' + err.message);
    }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (updateError) throw updateError;
      showFlash('success', `Applicant status updated to ${newStatus}`);
      fetchJobsAndApplications();
    } catch (err) {
      showFlash('error', 'Failed to update application: ' + err.message);
    }
  };

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (!confirm(`Are you sure you want to delete the job posting "${jobTitle}"? This will delete all applications too.`)) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId);

      if (deleteError) throw deleteError;

      showFlash('success', `Job posting deleted`);
      fetchJobsAndApplications();
    } catch (err) {
      showFlash('error', 'Error deleting job: ' + err.message);
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className={styles.loadingPulse}>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerCard}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast notifications */}
      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}
      {error && <div className={`${styles.toast} ${styles.toastError}`}>{error}</div>}

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Hiring & Jobs</h2>
          <p className={styles.subtitle}>Post job openings and review cover notes from candidates in the area.</p>
        </div>
        <button 
          className={showAddForm ? styles.cancelBtn : styles.addBtn}
          onClick={() => {
            setShowAddForm(!showAddForm);
            setExpandedJobId(null);
          }}
        >
          {showAddForm ? 'Cancel' : 'Post A Job'}
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'postings' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('postings');
            setShowAddForm(false);
          }}
        >
          My Job Listings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'talent' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('talent');
            setShowAddForm(false);
          }}
        >
          Talent Pool ({talent.length})
        </button>
      </div>

      {/* Inline Post Job Form */}
      {showAddForm && (
        <form onSubmit={handlePostJob} className={`${styles.formCard} ${styles.animateFade}`}>
          <h3 className={styles.formTitle}>Create Job Listing</h3>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="job-title">Job Title</label>
              <input
                id="job-title"
                type="text"
                required
                placeholder="e.g. Fine Dining Waiter, Barback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="job-role">Role Category</label>
              <select
                id="job-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="job-type">Employment Type</label>
              <select
                id="job-type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                {TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="job-salary-min">Min Monthly Salary (₹)</label>
              <input
                id="job-salary-min"
                type="number"
                min="0"
                placeholder="e.g. 15000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="job-salary-max">Max Monthly Salary (₹)</label>
              <input
                id="job-salary-max"
                type="number"
                min="0"
                placeholder="e.g. 25000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="job-location">Location</label>
              <input
                id="job-location"
                type="text"
                placeholder="e.g. Connaught Place, New Delhi"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.inputGroup} style={{ marginTop: '16px' }}>
            <label htmlFor="job-desc">Job Description & Requirements</label>
            <textarea
              id="job-desc"
              rows="4"
              placeholder="Outline shifts, benefits, responsibilities, and experience required..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.formActions}>
            <span>Active immediately upon submission</span>
            <button type="submit" className={styles.submitBtn}>
              Publish Job Listing
            </button>
          </div>
        </form>
      )}

      {/* Content based on Active Tab */}
      {activeTab === 'postings' ? (
        <div className={styles.jobsList}>
          {jobs.length === 0 ? (
            <div className={styles.emptyState}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <h3>No job postings created</h3>
              <p>Connect with professional hospitality staff by posting your first job listing.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const jobApps = applications[job.id] || [];
              const isExpanded = expandedJobId === job.id;

              return (
                <div key={job.id} className={`${styles.jobCard} ${!job.active ? styles.inactiveJob : ''}`}>
                  <div className={job.id === expandedJobId ? `${styles.jobCardHeader} ${styles.noBorder}` : styles.jobCardHeader}>
                    <div className={styles.jobInfo}>
                      <div className={styles.titleRow}>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        <span className={`${styles.statusBadge} ${job.active ? styles.active : styles.closed}`}>
                          {job.active ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.roleBadge}>{job.role}</span>
                        <span className={styles.typeBadge}>{job.employment_type}</span>
                        {job.location && <span className={styles.locBadge}>📍 {job.location}</span>}
                        {(job.salary_min || job.salary_max) && (
                          <span className={styles.salaryBadge}>
                            ₹{job.salary_min ? job.salary_min.toLocaleString('en-IN') : '0'} 
                            {job.salary_max ? ` - ₹${job.salary_max.toLocaleString('en-IN')}` : ' +'} / mo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.jobCardActions}>
                      <button 
                        className={`${styles.appCounterBtn} ${jobApps.length > 0 ? styles.hasApps : ''}`}
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      >
                        {jobApps.length} Application{jobApps.length !== 1 ? 's' : ''}
                        <span className={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      <button 
                        className={styles.statusToggleBtn}
                        onClick={() => handleToggleActive(job.id, job.active)}
                      >
                        {job.active ? 'Close' : 'Open'}
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteJob(job.id, job.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {job.description && (
                    <div className={styles.jobDesc}>
                      <p>{job.description}</p>
                    </div>
                  )}

                  {/* Expanded Applications Section */}
                  {isExpanded && (
                    <div className={`${styles.appsContainer} ${styles.animateFade}`}>
                      <h4 className={styles.appsTitle}>Applications for {job.title}</h4>
                      {jobApps.length === 0 ? (
                        <p className={styles.noAppsText}>No candidates have applied to this position yet.</p>
                      ) : (
                        <div className={styles.appsList}>
                          {jobApps.map((app) => (
                            <div key={app.id} className={styles.appItem}>
                              <div className={styles.appHeader}>
                                <div className={styles.applicantProfile}>
                                  <div className={styles.appAvatar}>
                                    {app.staff_profiles?.name?.substring(0, 2).toUpperCase() || 'SP'}
                                  </div>
                                  <div>
                                    <h5 className={styles.appName}>{app.staff_profiles?.name}</h5>
                                    <p className={styles.appMeta}>
                                      Role Preference: {app.staff_profiles?.role} | Experience: {app.staff_profiles?.experience_years || 0} years
                                    </p>
                                  </div>
                                </div>

                                <div className={styles.appActions}>
                                  {app.status === 'pending' ? (
                                    <div className={styles.statusActionGrp}>
                                      <button 
                                        className={styles.acceptBtn}
                                        onClick={() => handleUpdateApplicationStatus(app.id, 'accepted')}
                                      >
                                        Accept
                                      </button>
                                      <button 
                                        className={styles.rejectBtn}
                                        onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`${styles.outcomeBadge} ${styles[app.status]}`}>
                                      {app.status.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {app.cover_note && (
                                <div className={styles.appCover}>
                                  <strong>Message:</strong>
                                  <p>&quot;{app.cover_note}&quot;</p>
                                </div>
                              )}

                              {app.staff_profiles?.skills && app.staff_profiles.skills.length > 0 && (
                                <div className={styles.appSkills}>
                                  <strong>Skills:</strong>
                                  <div className={styles.skillsGrid}>
                                    {app.staff_profiles.skills.map((skill, index) => (
                                      <span key={index} className={styles.skillTag}>{skill}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Talent Pool Tab */
        <div className={styles.talentGrid}>
          {talent.length === 0 ? (
            <div className={styles.emptyState} style={{ gridColumn: 'span 2' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <h3>No independent staff profiles found</h3>
              <p>Registered waiters, chefs, and managers looking for work will appear here.</p>
            </div>
          ) : (
            talent.map((profile) => (
              <div key={profile.id} className={styles.talentCard}>
                <div className={styles.talentHeader}>
                  <div className={styles.talentProfile}>
                    <div className={styles.talentAvatar}>
                      {profile.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={styles.talentName}>{profile.name}</h4>
                      <span className={styles.roleBadge}>{profile.role}</span>
                    </div>
                  </div>
                  <div className={styles.experienceBadge}>
                    {profile.experience_years || 0} yrs exp
                  </div>
                </div>

                {profile.bio && (
                  <p className={styles.talentBio}>&quot;{profile.bio}&quot;</p>
                )}

                {profile.skills && profile.skills.length > 0 ? (
                  <div className={styles.talentSkills}>
                    <span className={styles.sectionLabel}>Skills:</span>
                    <div className={styles.skillsGrid}>
                      {profile.skills.map((skill, idx) => (
                        <span key={idx} className={styles.skillTag}>{skill}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={styles.noSkillsText}>No listed skills.</p>
                )}

                <div className={styles.talentFooter}>
                  {profile.upi_id && (
                    <div className={styles.upiBadge}>
                      <span>UPI ID: {profile.upi_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
