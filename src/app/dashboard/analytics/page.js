'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../layout';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import styles from './page.module.css';

export default function DashboardAnalytics() {
  const { business } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data aggregates
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyTips, setDailyTips] = useState([]);
  const [mealPeriods, setMealPeriods] = useState([
    { name: 'Breakfast (6 AM - 11 AM)', count: 0, percent: 0 },
    { name: 'Lunch (11 AM - 4 PM)', count: 0, percent: 0 },
    { name: 'Dinner (4 PM - 10 PM)', count: 0, percent: 0 },
    { name: 'Late Night (10 PM - 6 AM)', count: 0, percent: 0 },
  ]);
  const [overallStats, setOverallStats] = useState({
    totalTips: 0,
    averageTip: 0,
    positiveSentimentRate: 0,
    tipCount: 0,
  });

  const supabase = getSupabaseBrowser();
 
  const processAnalyticsData = useCallback((reviews, staffList) => {
    // Basic Overall Stats
    let totalTips = 0;
    let tipCount = 0;
    let positiveReviews = 0;
    const totalReviews = reviews.length;
 
    reviews.forEach((r) => {
      if (r.tip_amount && Number(r.tip_amount) > 0) {
        totalTips += Number(r.tip_amount);
        tipCount++;
      }
      if (r.sentiment === 'positive') {
        positiveReviews++;
      }
    });
 
    const averageTip = tipCount > 0 ? (totalTips / tipCount) : 0;
    const positiveSentimentRate = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;
 
    setOverallStats({
      totalTips,
      averageTip,
      positiveSentimentRate,
      tipCount,
    });
 
    // 1. Staff Leaderboard aggregation
    const staffMap = {};
    staffList.forEach((s) => {
      staffMap[s.id] = {
        name: s.name,
        role: s.role,
        totalTips: 0,
        reviewsCount: 0,
        positiveCount: 0,
      };
    });
 
    reviews.forEach((r) => {
      if (!r.staff_id) return; // General review
      
      // Ensure staff is in map in case profile was removed or deleted from active roster
      if (!staffMap[r.staff_id]) {
        staffMap[r.staff_id] = {
          name: r.staff_profiles?.name || 'Unknown Staff',
          role: r.staff_profiles?.role || 'waiter',
          totalTips: 0,
          reviewsCount: 0,
          positiveCount: 0,
        };
      }
 
      const st = staffMap[r.staff_id];
      st.reviewsCount++;
      if (r.tip_amount) st.totalTips += Number(r.tip_amount);
      if (r.sentiment === 'positive') st.positiveCount++;
    });
 
    // Map to list, calculate percentage, and sort by total tips
    const leaderboardList = Object.keys(staffMap).map((id) => {
      const s = staffMap[id];
      const sentimentRate = s.reviewsCount > 0 ? Math.round((s.positiveCount / s.reviewsCount) * 100) : 0;
      return {
        id,
        name: s.name,
        role: s.role,
        totalTips: s.totalTips,
        reviewsCount: s.reviewsCount,
        sentimentRate,
      };
    }).sort((a, b) => b.totalTips - a.totalTips);
 
    setLeaderboard(leaderboardList);
 
    // 2. Daily Tips Over Time aggregation (last 7 days)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateStr: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        rawDate: d.toDateString(),
        tips: 0,
      });
    }
 
    reviews.forEach((r) => {
      const revDateStr = new Date(r.created_at).toDateString();
      const match = days.find(d => d.rawDate === revDateStr);
      if (match && r.tip_amount) {
        match.tips += Number(r.tip_amount);
      }
    });
 
    // Find max tip value to calculate percentages for CSS height
    const maxTip = Math.max(...days.map(d => d.tips), 100); // minimum 100 limit for scale
    const dailyTipsWithPercent = days.map(d => ({
      ...d,
      percent: Math.min(Math.round((d.tips / maxTip) * 100), 100),
    }));
 
    setDailyTips(dailyTipsWithPercent);
 
    // 3. Peak Hour/Meal Period aggregation
    const periods = [
      { name: 'Breakfast (6 AM - 11 AM)', count: 0, percent: 0 },
      { name: 'Lunch (11 AM - 4 PM)', count: 0, percent: 0 },
      { name: 'Dinner (4 PM - 10 PM)', count: 0, percent: 0 },
      { name: 'Late Night (10 PM - 6 AM)', count: 0, percent: 0 },
    ];
 
    reviews.forEach((r) => {
      const hour = new Date(r.created_at).getHours();
      if (hour >= 6 && hour < 11) {
        periods[0].count++;
      } else if (hour >= 11 && hour < 16) {
        periods[1].count++;
      } else if (hour >= 16 && hour < 22) {
        periods[2].count++;
      } else {
        periods[3].count++;
      }
    });
 
    const maxCount = Math.max(...periods.map(p => p.count), 1);
    const periodsWithPercent = periods.map(p => ({
      ...p,
      percent: Math.round((p.count / maxCount) * 100),
    }));
 
    setMealPeriods(periodsWithPercent);
  }, []);
 
  useEffect(() => {
    if (!business) return;
 
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
 
        // 1. Fetch reviews joined with staff
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('*, staff_profiles(name, role)')
          .eq('business_id', business.id);
 
        if (reviewsError) throw reviewsError;
 
        // 2. Fetch all staff to ensure complete leaderboard
        const { data: staffProfiles, error: staffError } = await supabase
          .from('staff_profiles')
          .select('id, name, role')
          .eq('business_id', business.id);
 
        if (staffError) throw staffError;
 
        processAnalyticsData(reviews || [], staffProfiles || []);
      } catch (err) {
        setError('Failed to compute analytics: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
 
    fetchAnalytics();
  }, [business, supabase, processAnalyticsData]);

  if (loading) {
    return (
      <div className={styles.loadingPulse}>
        <div className={styles.shimmerCard}></div>
        <div className={styles.shimmerGrid}>
          <div className={styles.shimmerCard}></div>
          <div className={styles.shimmerCard}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Analytics Summary Banner */}
      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Tips Processed</span>
          <div className={styles.summaryValue}>₹{overallStats.totalTips.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className={styles.summarySub}>Across {overallStats.tipCount} tip transactions</p>
        </div>
        
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Average Tip Amount</span>
          <div className={styles.summaryValue}>₹{overallStats.averageTip.toFixed(2)}</div>
          <p className={styles.summarySub}>Per transaction</p>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Positive Sentiment Rate</span>
          <div className={styles.summaryValue}>{overallStats.positiveSentimentRate}%</div>
          <div className={styles.progressBarBg}>
            <div className={styles.progressBarFill} style={{ width: `${overallStats.positiveSentimentRate}%` }}></div>
          </div>
          <p className={styles.summarySub}>Percentage of thumbs-up reviews</p>
        </div>
      </section>

      {/* Visual Analytics Section */}
      <section className={styles.chartsGrid}>
        {/* Tips Earned Over Time */}
        <div className={styles.chartPanel}>
          <h3 className={styles.panelTitle}>Tips Earned (Last 7 Days)</h3>
          <div className={styles.barChartContainer}>
            <div className={styles.chartYAxis}>
              <span>Max</span>
              <span>50%</span>
              <span>0</span>
            </div>
            
            <div className={styles.barChart}>
              {dailyTips.map((day, idx) => (
                <div key={idx} className={styles.chartCol}>
                  <div className={styles.barWrapper}>
                    <div 
                      className={styles.bar} 
                      style={{ height: `${day.percent}%` }}
                      title={`₹${day.tips}`}
                    >
                      <span className={styles.barTooltip}>₹{day.tips}</span>
                    </div>
                  </div>
                  <span className={styles.barLabel}>{day.dateStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Busiest Peak Hours */}
        <div className={styles.chartPanel}>
          <h3 className={styles.panelTitle}>Review Volume by Meal Period</h3>
          <div className={styles.horizontalChart}>
            {mealPeriods.map((period, idx) => (
              <div key={idx} className={styles.hRow}>
                <div className={styles.hLabel}>{period.name}</div>
                <div className={styles.hBarContainer}>
                  <div 
                    className={styles.hBar} 
                    style={{ width: `${period.percent}%` }}
                  >
                    <span className={styles.hBarValue}>{period.count} reviews</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staff Leaderboard Section */}
      <section className={styles.leaderboardPanel}>
        <h3 className={styles.panelTitle}>Staff Performance Leaderboard</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Staff Name</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Total Tips</th>
                <th style={{ textAlign: 'right' }}>Reviews</th>
                <th style={{ textAlign: 'right' }}>Positive Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                    No staff performance statistics available yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`${styles.rankBadge} ${index === 0 ? styles.rank1 : index === 1 ? styles.rank2 : index === 2 ? styles.rank3 : ''}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td>
                      <span className={styles.staffName}>{row.name}</span>
                    </td>
                    <td>
                      <span className={styles.roleBadge}>{row.role}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      ₹{row.totalTips.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.reviewsCount}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.sentimentColumn}>
                        <span>{row.sentimentRate}%</span>
                        <div className={styles.miniBarBg}>
                          <div className={styles.miniBarFill} style={{ width: `${row.sentimentRate}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
