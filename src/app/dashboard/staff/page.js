'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

const ROLES = ['waiter', 'chef', 'manager', 'host', 'bartender'];

export default function DashboardStaff() {
  const { business } = useDashboard();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Add staff form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('waiter');
  const [newUpiId, setNewUpiId] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [newBio, setNewBio] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('waiter');
  const [editUpiId, setEditUpiId] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editBio, setEditBio] = useState('');

  const supabase = getSupabaseBrowser();

  const fetchStaff = useCallback(async () => {
    if (!business) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setStaff(data || []);
    } catch (err) {
      setError('Failed to load staff profiles: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [business, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 0);
    return () => clearTimeout(timer);
  }, [business, fetchStaff]);

  // Flash messages
  const showFlash = (type, message) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('staff_profiles')
        .insert({
          business_id: business.id,
          name: newName.trim(),
          role: newRole,
          upi_id: newUpiId.trim() || null,
          active: newActive,
          bio: newBio.trim() || null,
        })
        .select();

      if (insertError) throw insertError;

      setNewName('');
      setNewRole('waiter');
      setNewUpiId('');
      setNewBio('');
      setNewActive(true);
      setShowAddForm(false);
      
      showFlash('success', 'Staff member added successfully');
      fetchStaff();
    } catch (err) {
      showFlash('error', 'Error adding staff: ' + err.message);
    }
  };

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setEditUpiId(member.upi_id || '');
    setEditActive(member.active);
    setEditBio(member.bio || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e, id) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('staff_profiles')
        .update({
          name: editName.trim(),
          role: editRole,
          upi_id: editUpiId.trim() || null,
          active: editActive,
          bio: editBio.trim() || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setEditingId(null);
      showFlash('success', 'Staff profile updated successfully');
      fetchStaff();
    } catch (err) {
      showFlash('error', 'Error updating staff: ' + err.message);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name} from your staff?`)) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      showFlash('success', `${name} has been removed`);
      fetchStaff();
    } catch (err) {
      showFlash('error', 'Error removing staff: ' + err.message);
    }
  };

  if (loading && staff.length === 0) {
    return (
      <div className={styles.loadingPulse}>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerCard}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Messages */}
      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}
      {error && <div className={`${styles.toast} ${styles.toastError}`}>{error}</div>}

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Staff Roster</h2>
          <p className={styles.subtitle}>Manage your waiters, bartenders, hosts, and chefs.</p>
        </div>
        <button 
          className={showAddForm ? styles.cancelBtn : styles.addBtn}
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (editingId) setEditingId(null);
          }}
        >
          {showAddForm ? 'Cancel' : 'Add Staff Member'}
        </button>
      </div>

      {/* Inline Add Staff Form */}
      {showAddForm && (
        <form onSubmit={handleAddStaff} className={`${styles.formCard} ${styles.animateFade}`}>
          <h3 className={styles.formTitle}>Add New Staff</h3>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="staff-name">Full Name</label>
              <input
                id="staff-name"
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="staff-role">Role</label>
              <select
                id="staff-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="staff-upi">UPI ID (for direct guest tips)</label>
              <input
                id="staff-upi"
                type="text"
                placeholder="e.g. rahul@upi"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="staff-bio">Short Bio (optional)</label>
              <input
                id="staff-bio"
                type="text"
                placeholder="e.g. Friendly server with 3 years experience"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              <span>Set as Active (Visible to Guests)</span>
            </label>
            <button type="submit" className={styles.submitBtn}>
              Save Staff Profile
            </button>
          </div>
        </form>
      )}

      {/* Staff Roster List */}
      <div className={styles.staffGrid}>
        {staff.length === 0 ? (
          <div className={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <h3>No staff members found</h3>
            <p>Add your first waiter or bartender to start generating custom QR codes.</p>
          </div>
        ) : (
          staff.map((member) => {
            const isEditing = editingId === member.id;
            
            if (isEditing) {
              return (
                <form 
                  key={member.id} 
                  onSubmit={(e) => handleSaveEdit(e, member.id)}
                  className={`${styles.formCard} ${styles.editingCard}`}
                >
                  <h4 className={styles.editCardTitle}>Edit Profile: {member.name}</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label>Full Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>UPI ID</label>
                      <input
                        type="text"
                        value={editUpiId}
                        onChange={(e) => setEditUpiId(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Bio</label>
                      <input
                        type="text"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      <span>Active</span>
                    </label>
                    <div className={styles.editButtonGrp}>
                      <button 
                        type="button" 
                        className={styles.secondaryBtn} 
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button type="submit" className={styles.submitBtn}>
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              );
            }

            return (
              <div 
                key={member.id} 
                className={`${styles.staffCard} ${!member.active ? styles.inactiveCard : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.statusSection}>
                    <span className={`${styles.statusBadge} ${member.active ? styles.active : styles.inactive}`}>
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.staffName}>{member.name}</h3>
                  <span className={styles.roleBadge}>{member.role}</span>
                  
                  {member.upi_id ? (
                    <div className={styles.upiContainer}>
                      <span className={styles.upiLabel}>UPI ID:</span>
                      <span className={styles.upiValue} title={member.upi_id}>{member.upi_id}</span>
                    </div>
                  ) : (
                    <div className={`${styles.upiContainer} ${styles.upiMissing}`}>
                      <span className={styles.upiLabel}>UPI ID:</span>
                      <span className={styles.upiValue}>Not set (Cannot receive tips)</span>
                    </div>
                  )}

                  {member.bio && (
                     <p className={styles.staffBio}>&quot;{member.bio}&quot;</p>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button 
                    className={styles.editBtn}
                    onClick={() => handleStartEdit(member)}
                  >
                    Edit
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteStaff(member.id, member.name)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
