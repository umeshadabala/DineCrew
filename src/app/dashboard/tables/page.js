'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
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

export default function DashboardTables() {
  const { business } = useDashboard();
  const [tables, setTables] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [assignedStaffId, setAssignedStaffId] = useState('');

  // Selected QR modal preview state
  const [activeQrModal, setActiveQrModal] = useState(null);

  const supabase = getSupabaseBrowser();

  const fetchTablesAndStaff = useCallback(async () => {
    if (!business) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*, staff_profiles(name)')
        .eq('business_id', business.id)
        .order('table_number', { ascending: true });

      if (tablesError) throw tablesError;

      // 2. Fetch active staff for assignments
      const { data: staffData, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('name', { ascending: true });

      if (staffError) throw staffError;

      setTables(tablesData || []);
      setStaff(staffData || []);
    } catch (err) {
      setError('Failed to load table details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [business, supabase]);
 
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTablesAndStaff();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTablesAndStaff]);

  const showFlash = (type, message) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    try {
      setError(null);
      const qrSlug = slugify(tableNumber);

      // Check duplicate slug in state first
      if (tables.some(t => t.qr_slug === qrSlug)) {
        throw new Error(`A table with slug "${qrSlug}" already exists.`);
      }

      const { error: insertError } = await supabase
        .from('tables')
        .insert({
          business_id: business.id,
          table_number: tableNumber.trim(),
          qr_slug: qrSlug,
          capacity: Number(capacity),
          assigned_staff_id: assignedStaffId || null,
        });

      if (insertError) throw insertError;

      setTableNumber('');
      setCapacity(4);
      setAssignedStaffId('');
      setShowAddForm(false);
      
      showFlash('success', `Table ${tableNumber} created successfully`);
      fetchTablesAndStaff();
    } catch (err) {
      showFlash('error', err.message);
    }
  };

  const handleUpdateStaff = async (tableId, staffId) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('tables')
        .update({ assigned_staff_id: staffId || null })
        .eq('id', tableId);

      if (updateError) throw updateError;
      showFlash('success', 'Staff assigned updated successfully');
      fetchTablesAndStaff();
    } catch (err) {
      showFlash('error', 'Failed to assign staff: ' + err.message);
    }
  };

  const handleDeleteTable = async (tableId, tableNum) => {
    if (!confirm(`Are you sure you want to delete Table ${tableNum}?`)) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (deleteError) throw deleteError;

      showFlash('success', `Table ${tableNum} has been deleted`);
      fetchTablesAndStaff();
    } catch (err) {
      showFlash('error', 'Error deleting table: ' + err.message);
    }
  };

  // Helper to generate the guest URL
  const getGuestUrl = (qrSlug) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dinecrew.com';
    return `${origin}/r/${business?.slug}/${qrSlug}`;
  };

  if (loading && tables.length === 0) {
    return (
      <div className={styles.loadingPulse}>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerCard}></div>
      </div>
    );
  }

  const venueUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/r/${business?.slug}` 
    : `https://dinecrew.com/r/${business?.slug}`;
  const venueQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(venueUrl)}`;

  return (
    <div className={styles.container}>
      {/* Toast notifications */}
      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}
      {error && <div className={`${styles.toast} ${styles.toastError}`}>{error}</div>}

      {/* Primary Venue QR Code Section */}
      <div className={styles.venueQrCard}>
        <div className={styles.venueQrInfo}>
          <span className={styles.qrBadge}>Venue QR Code</span>
          <h3 className={styles.venueQrTitle}>{business?.name} QR</h3>
          <p className={styles.venueQrSubtitle}>
            This is the main QR code for your venue. Print this code and display it on table stands, counters, or lobbies.
          </p>
          <p className={styles.venueQrDescription}>
            {business?.type === 'hotel' 
              ? 'When guests scan this code, they will be asked to enter their Room Number, select their housekeeper/server, and leave a tip or review.' 
              : 'When guests scan this code, they will select their server and leave a tip or review. Restaurants & cafes bypass the table selection step entirely.'}
          </p>
          <div className={styles.venueQrActions}>
            <button 
              className={styles.printBtn} 
              onClick={() => window.open(venueQrImageUrl, '_blank')}
            >
              Print QR Code
            </button>
            <button 
              className={styles.copyLinkBtn}
              onClick={() => {
                navigator.clipboard.writeText(venueUrl);
                showFlash('success', 'Guest link copied!');
              }}
            >
              Copy Link
            </button>
            <a href={venueUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
              Preview Portal ↗
            </a>
          </div>
          <div className={styles.venueUrlDisplay}>
            <span>Link URL:</span> <code>{venueUrl}</code>
          </div>
        </div>
        <div className={styles.venueQrDisplay}>
          <img src={venueQrImageUrl} alt="Venue QR Code" className={styles.venueQrImage} />
        </div>
      </div>

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{business?.type === 'hotel' ? 'Rooms Directory' : 'Tables Directory'}</h2>
          <p className={styles.subtitle}>
            {business?.type === 'hotel' 
              ? 'List your hotel rooms and assign default staff members to pre-fill choices for guests.' 
              : 'List your dining tables and assign default servers for internal tracking.'}
          </p>
        </div>
        <button 
          className={showAddForm ? styles.cancelBtn : styles.addBtn}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : (business?.type === 'hotel' ? 'Add Room' : 'Add Table')}
        </button>
      </div>

      {/* Inline Create Form */}
      {showAddForm && (
        <form onSubmit={handleAddTable} className={`${styles.formCard} ${styles.animateFade}`}>
          <h3 className={styles.formTitle}>{business?.type === 'hotel' ? 'New Room Setup' : 'New Table Setup'}</h3>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="table-number">{business?.type === 'hotel' ? 'Room Number / Name' : 'Table Number / Name'}</label>
              <input
                id="table-number"
                type="text"
                required
                placeholder={business?.type === 'hotel' ? 'e.g. Room 302, Suite A' : 'e.g. Table 12, VIP Booth'}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="table-capacity">Guest Capacity</label>
              <input
                id="table-capacity"
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="assigned-staff">{business?.type === 'hotel' ? 'Default Room Server' : 'Default Table Server'}</label>
              <select
                id="assigned-staff"
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
              >
                <option value="">-- No server assigned --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <p className={styles.formHint}>
              Saved internally for room/table assignment mappings.
            </p>
            <button type="submit" className={styles.submitBtn}>
              Save {business?.type === 'hotel' ? 'Room' : 'Table'}
            </button>
          </div>
        </form>
      )}

      {/* Tables/Rooms Grid */}
      <div className={styles.tablesGrid}>
        {tables.length === 0 ? (
          <div className={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M3 9h18" />
            </svg>
            <h3>{business?.type === 'hotel' ? 'No rooms set up' : 'No tables set up'}</h3>
            <p>Add entries here to assign specific staff members to rooms/tables.</p>
          </div>
        ) : (
          tables.map((table) => {
            return (
              <div key={table.id} className={styles.tableCard}>
                <div className={styles.tableCardHeader}>
                  <div>
                    <h3 className={styles.tableTitle}>
                      {business?.type === 'hotel' ? `Room ${table.table_number}` : `Table ${table.table_number}`}
                    </h3>
                    <span className={styles.capacityBadge}>Capacity: {table.capacity} guests</span>
                  </div>
                </div>

                <div className={styles.tableCardBody}>
                  <div className={styles.assignmentBlock}>
                    <label className={styles.selectLabel}>Default Server</label>
                    <select
                      className={styles.staffSelect}
                      value={table.assigned_staff_id || ''}
                      onChange={(e) => handleUpdateStaff(table.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.tableCardActions}>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                  >
                    Delete Entry
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
