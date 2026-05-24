'use client';

import { useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useStaffProfile } from '../layout';
import styles from './page.module.css';

const AVAILABLE_SKILLS = [
  'Customer Service',
  'Fine Dining',
  'Mixology',
  'Kitchen Management',
  'Wine Knowledge',
  'POS Systems',
  'Food Safety',
  'Event Hosting',
  'Barista',
  'Multi-language',
];

export default function StaffProfilePage() {
  const supabase = getSupabaseBrowser();
  const { staffProfile, setStaffProfile } = useStaffProfile();

  const [form, setForm] = useState({
    name: staffProfile?.name || '',
    bio: staffProfile?.bio || '',
    skills: staffProfile?.skills || [],
    experience_years: staffProfile?.experience_years || 0,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
    setError('');
  }

  function handleSkillToggle(skill) {
    setForm((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
    setSuccess(false);
    setError('');
  }

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      if (!staffProfile) return;

      setSaving(true);
      setSuccess(false);
      setError('');

      try {
        const updates = {
          name: form.name.trim(),
          bio: form.bio.trim(),
          skills: form.skills,
          experience_years: parseInt(form.experience_years, 10) || 0,
        };

        if (!updates.name) {
          setError('Name is required');
          setSaving(false);
          return;
        }

        const { data, error: updateError } = await supabase
          .from('staff_profiles')
          .update(updates)
          .eq('id', staffProfile.id)
          .select('*, business:businesses(name, slug)')
          .single();

        if (updateError) throw updateError;

        setStaffProfile(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        console.error('Error updating profile:', err);
        setError('Failed to save. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [form, staffProfile]
  );

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (!staffProfile) return null;

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Your Profile</h1>
        <p className={styles.pageSubtitle}>
          Update your information. Businesses will see your profile when you apply to jobs.
        </p>
      </div>

      {/* Form */}
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>Edit Profile</h2>
        <form className={styles.form} onSubmit={handleSave}>
          {/* Name */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className={styles.input}
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Bio */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="bio">
              Bio
              <span className={styles.labelHint}>(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              className={styles.textarea}
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell businesses about yourself, your strengths, and what you enjoy about hospitality…"
              rows={4}
            />
          </div>

          {/* Skills */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Skills</label>
            <div className={styles.skillsGrid}>
              {AVAILABLE_SKILLS.map((skill) => {
                const isActive = form.skills.includes(skill);
                return (
                  <label
                    key={skill}
                    className={`${styles.skillCheckbox} ${isActive ? styles.skillCheckboxActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.skillCheckboxInput}
                      checked={isActive}
                      onChange={() => handleSkillToggle(skill)}
                    />
                    <span className={styles.skillCheckboxMark}>
                      {isActive && (
                        <svg className={styles.skillCheckboxSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    {skill}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Experience row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ width: '100%' }}>
              <label className={styles.label} htmlFor="experience_years">
                Years of Experience
              </label>
              <input
                id="experience_years"
                name="experience_years"
                type="number"
                className={styles.input}
                value={form.experience_years}
                onChange={handleChange}
                min="0"
                max="50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? (
                <>
                  <svg className={styles.saveIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className={styles.saveIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>

            {success && (
              <span className={styles.successMsg}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Profile updated
              </span>
            )}

            {error && <span className={styles.errorMsg}>{error}</span>}
          </div>
        </form>
      </div>

      {/* Preview card */}
      <aside className={styles.previewCard}>
        <p className={styles.previewLabel}>Profile Preview</p>

        <div className={styles.previewAvatar}>{getInitials(form.name)}</div>
        <h3 className={styles.previewName}>{form.name || 'Your Name'}</h3>
        <p className={styles.previewRole}>
          {staffProfile.role}{' '}
          {staffProfile.business ? `at ${staffProfile.business.name}` : ''}
        </p>

        <div className={styles.previewDivider} />

        {/* Bio */}
        <div className={styles.previewSection}>
          <p className={styles.previewSectionLabel}>About</p>
          <p className={form.bio ? styles.previewBio : `${styles.previewBio} ${styles.previewBioEmpty}`}>
            {form.bio || 'No bio added yet'}
          </p>
        </div>

        {/* Skills */}
        {form.skills.length > 0 && (
          <div className={styles.previewSection}>
            <p className={styles.previewSectionLabel}>Skills</p>
            <div className={styles.previewSkills}>
              {form.skills.map((skill) => (
                <span key={skill} className={styles.previewSkillTag}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.previewDivider} />

        {/* Meta */}
        <div className={styles.previewSection}>
          <div className={styles.previewMeta}>
            <svg className={styles.previewMetaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {form.experience_years || 0} year{form.experience_years === 1 ? '' : 's'} experience
            </span>
          </div>
        </div>

      </aside>
    </div>
  );
}
