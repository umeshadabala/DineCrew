'use client';

import { useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './GuestPortal.module.css';

const TIP_PRESETS = [50, 100, 200, 500];

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Inline SVG QR-ish payment display (not a real QR encoder — we rely on the UPI deep link) ──
function UpiPaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <path d="M21 14v3h-3" />
      <path d="M21 21h-3v-3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Main GuestPortal component
// ──────────────────────────────────────────────
export default function GuestPortal({ business, staff, tables = [], tableId }) {
  const showRoomSelection = business.type === 'hotel' && !tableId;
  
  const [currentStep, setCurrentStep] = useState(showRoomSelection ? 0 : 1);
  const [selectedTableId, setSelectedTableId] = useState(tableId);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [tipAmount, setTipAmount] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAd, setShowAd] = useState(true);

  const totalSteps = 5;

  const effectiveTip = tipAmount ?? (customTip ? Number(customTip) : 0);

  // Navigation helpers
  const goNext = useCallback(() => setCurrentStep((s) => Math.min(s + 1, totalSteps)), []);
  const goTo = useCallback((step) => setCurrentStep(step), []);

  const handleSelectTable = (tableId) => {
    setSelectedTableId(tableId);
    const tbl = tables.find(t => t.id === tableId);
    if (tbl?.assigned_staff_id) {
      const assigned = staff.find(s => s.id === tbl.assigned_staff_id);
      if (assigned) {
        setSelectedStaff(assigned);
      }
    }
  };

  // ── Step 1 ─ Select Staff ──
  function renderSelectStaff() {
    if (!staff || staff.length === 0) {
      return (
        <div className={styles.step}>
          <div className={styles.stepContent}>
            <h2 className={styles.sectionTitle}>Our Team</h2>
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className={styles.emptyText}>
                No team members are available right now. You can still leave feedback.
              </p>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => goTo(4)}>
              Leave Feedback
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.step}>
        <div className={styles.stepContent}>
          <h2 className={styles.sectionTitle}>Who served you today?</h2>
          <p className={styles.sectionSubtitle}>Select a team member to tip</p>

          <div className={styles.staffList}>
            {staff.map((member) => (
              <button
                key={member.id}
                className={`${styles.staffCard} ${selectedStaff?.id === member.id ? styles.staffCardSelected : ''}`}
                onClick={() => setSelectedStaff(member)}
                type="button"
              >
                <div className={styles.staffAvatar}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" />
                  ) : (
                    getInitials(member.name)
                  )}
                </div>
                <div className={styles.staffInfo}>
                  <span className={styles.staffName}>{member.name}</span>
                  {member.role && <span className={styles.roleBadge}>{member.role}</span>}
                </div>
                {selectedStaff?.id === member.id && (
                  <div className={styles.staffCheck}>
                    <CheckIcon />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            disabled={!selectedStaff}
            onClick={goNext}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2 ─ Tip Amount ──
  function renderTipAmount() {
    return (
      <div className={styles.step}>
        <div className={styles.stepContent}>
          <div className={styles.selectedStaffBanner}>
            <div className={styles.staffAvatar}>
              {selectedStaff.avatar_url ? (
                <img src={selectedStaff.avatar_url} alt="" />
              ) : (
                getInitials(selectedStaff.name)
              )}
            </div>
            <div className={styles.selectedStaffInfo}>
              <span className={styles.staffName}>{selectedStaff.name}</span>
              {selectedStaff.role && <span className={styles.roleBadge}>{selectedStaff.role}</span>}
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Add a tip</h2>

          <div className={styles.tipGrid}>
            {TIP_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`${styles.tipButton} ${tipAmount === amount && !customTip ? styles.tipButtonSelected : ''}`}
                onClick={() => {
                  setTipAmount(amount);
                  setCustomTip('');
                }}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          <div className={styles.customTipWrapper}>
            <label className={styles.customTipLabel} htmlFor="customTip">
              Or enter a custom amount
            </label>
            <div className={styles.inputPrefixWrapper}>
              <span className={styles.inputPrefix}>₹</span>
              <input
                id="customTip"
                type="number"
                inputMode="numeric"
                min="1"
                className={styles.customTipInput}
                placeholder="Enter amount"
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipAmount(null);
                }}
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            disabled={effectiveTip <= 0}
            onClick={goNext}
          >
            Continue — ₹{effectiveTip || 0}
          </button>
          <button className={styles.skipLink} onClick={() => {
            setTipAmount(0);
            setCustomTip('');
            goTo(4);
          }}>
            Skip Tip
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 ─ Payment / UPI ──
  function renderPayment() {
    const upiId = selectedStaff?.upi_id;
    const staffName = encodeURIComponent(selectedStaff?.name || 'Staff');
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${staffName}&cu=INR`
      : null;

    return (
      <div className={styles.step}>
        <div className={styles.stepContent}>
          <div className={styles.paymentCard}>
            <div className={styles.paymentAmount}>₹{effectiveTip}</div>
            <div className={styles.paymentTo}>Tip for {selectedStaff.name}</div>
            
            <div className={styles.receiptDivider} />

            {upiLink ? (
              <>
                <a
                  href={upiLink}
                  className={styles.upiButton}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UpiPaymentIcon />
                  Pay with UPI
                </a>

                <div className={styles.upiIdRow}>
                  <span className={styles.upiIdLabel}>UPI ID:</span>
                  <span className={styles.upiIdValue}>{upiId}</span>
                </div>
              </>
            ) : (
                 <div className={styles.noUpiMessage}>
                   This team member hasn&apos;t set up UPI payments yet.
                   You can tip them directly in cash.
                 </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
           <button className={styles.primaryButton} onClick={goNext}>
             I&apos;ve completed payment
           </button>
          <button className={styles.skipLink} onClick={goNext}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4 ─ Feedback ──
  function renderFeedback() {
    const handleSubmit = async () => {
      setSubmitting(true);
      try {
        const supabase = getSupabaseBrowser();
        await supabase.from('reviews').insert({
          business_id: business.id,
          table_id: selectedTableId || null,
          staff_id: selectedStaff?.id || null,
          tip_amount: effectiveTip || 0,
          sentiment: sentiment,
          feedback: feedback || null,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to submit review:', err);
      }
      setSubmitting(false);
      goNext();
    };

    return (
      <div className={styles.step}>
        <div className={styles.stepContent}>
          <div className={styles.feedbackSection}>
            <h2 className={styles.sectionTitle}>How was your experience?</h2>

            <div className={styles.emojiRow}>
              <button
                type="button"
                className={`${styles.emojiButton} ${sentiment === 'positive' ? styles.emojiButtonSelected : ''}`}
                onClick={() => setSentiment('positive')}
                data-sentiment="positive"
              >
                <span className={styles.emojiIcon}>👍</span>
                <span className={styles.emojiLabel}>Loved it</span>
              </button>
              <button
                type="button"
                className={`${styles.emojiButton} ${sentiment === 'negative' ? styles.emojiButtonSelected : ''}`}
                onClick={() => setSentiment('negative')}
                data-sentiment="negative"
              >
                <span className={styles.emojiIcon}>👎</span>
                <span className={styles.emojiLabel}>Could be better</span>
              </button>
            </div>

            <textarea
              className={styles.feedbackTextarea}
              placeholder="Any additional comments? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
          <button className={styles.skipLink} onClick={goNext}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Step 5 ─ Thank You ──
  function renderThankYou() {
    const showGoogleReview =
      business.google_place_id && sentiment === 'positive';
    const googleReviewUrl = showGoogleReview
      ? `https://search.google.com/local/writereview?placeid=${business.google_place_id}`
      : null;

    return (
      <div className={styles.step}>
        <div className={styles.stepContent} style={{ justifyContent: 'center' }}>
          <div className={styles.thankYou}>
            <div className={styles.checkCircle}>
              <CheckIcon />
            </div>
            <h2 className={styles.thankYouTitle}>Thank you!</h2>
            <p className={styles.thankYouSubtext}>
              Your feedback helps {business.name} serve you better.
            </p>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.googleReviewLink}
              >
                <ExternalLinkIcon />
                Leave us a Google Review
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 0 ─ Room Selection ──
  function renderSelectRoom() {
    return (
      <div className={styles.step}>
        <div className={styles.stepContent}>
          <h2 className={styles.sectionTitle}>Welcome to {business.name}</h2>
          <p className={styles.sectionSubtitle}>Please select your Room Number to continue</p>

          <div className={styles.roomSelectWrapper}>
            <label htmlFor="room-select" className={styles.roomLabel}>Room Number</label>
            <select
              id="room-select"
              className={styles.roomSelectInput}
              value={selectedTableId || ''}
              onChange={(e) => handleSelectTable(e.target.value)}
            >
              <option value="">-- Select Room Number --</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Room {t.table_number}
                </option>
              ))}
            </select>
          </div>

          {tables.length === 0 && (
            <div className={styles.emptyRoomsWarning}>
              <p>No rooms have been set up by the hotel administrator yet.</p>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            disabled={!selectedTableId && tables.length > 0}
            onClick={goNext}
          >
            Continue
          </button>
          {tables.length === 0 && (
            <button className={styles.skipLink} onClick={() => setCurrentStep(1)}>
              Skip Room Selection
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render current step ──
  function renderCurrentStep() {
    switch (currentStep) {
      case 0:
        return renderSelectRoom();
      case 1:
        return renderSelectStaff();
      case 2:
        return renderTipAmount();
      case 3:
        return renderPayment();
      case 4:
        return renderFeedback();
      case 5:
        return renderThankYou();
      default:
        return null;
    }
  }

  const activeTable = tables.find(t => t.id === selectedTableId);
  const progressPercent = showRoomSelection 
    ? ((currentStep + 1) / 5) * 100 
    : (currentStep / 4) * 100;

  return (
    <main className={styles.portal}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoAvatar}>
          {getInitials(business.name)}
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.businessName}>{business.name}</h1>
          {currentStep < 5 && (
            <span className={styles.headerSubtext}>
              {currentStep === 0 && 'Select room number'}
              {currentStep === 1 && 'Select team member'}
              {currentStep === 2 && 'Choose tip amount'}
              {currentStep === 3 && 'Complete payment'}
              {currentStep === 4 && 'Share feedback'}
            </span>
          )}
        </div>
        {activeTable && (
          <div className={styles.tableBadge}>
            {business.type === 'hotel' ? `Room ${activeTable.table_number}` : `Table ${activeTable.table_number}`}
          </div>
        )}
      </header>

      {/* Progress Bar */}
      {currentStep < 5 && (
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      )}

      {/* Step content */}
      <div className={styles.stepWrapper} key={currentStep}>
        {renderCurrentStep()}
      </div>

      {/* Sponsored Ad Pop-up Overlay */}
      {showAd && (
        <div className={styles.adOverlay}>
          <div className={styles.adContent}>
            <button className={styles.adCloseX} onClick={() => setShowAd(false)} aria-label="Close Ad">
              &times;
            </button>
            <div className={styles.adBadge}>Sponsored Ad</div>
            <div className={styles.adImageWrapper}>
              <img src="/parkospace-ad.jpg" alt="ParkoSpace Ad" className={styles.adImage} />
            </div>
            <button className={styles.adCloseBtn} onClick={() => setShowAd(false)}>
              Continue to Tipping Portal &rarr;
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
