import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.navbar}>
        <div className={styles.logo}>DineCrew</div>
        <nav className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/register" className={styles.btnPrimary}>Get Started</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>The Unified Management & Tipping Platform for Modern Hospitality</h1>
          <p className={styles.heroSubtitle}>
            Empower your staff, delight your guests, and manage your restaurant effortlessly with our all-in-one platform.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className={styles.btnPrimaryLarge}>Get Started Free</Link>
            <a href="#how-it-works" className={styles.btnSecondaryLarge}>See How It Works</a>
          </div>
          
          <div className={styles.heroIllustration}>
            <svg viewBox="0 0 800 400" className={styles.svgIllustration} xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="400" fill="var(--color-primary-bg)" rx="24" />
              <circle cx="400" cy="200" r="120" fill="var(--color-primary-light)" opacity="0.5" />
              <rect x="250" y="150" width="300" height="100" rx="16" fill="white" stroke="var(--color-border)" strokeWidth="2" />
              <circle cx="280" cy="200" r="16" fill="var(--color-primary)" />
              <rect x="320" y="180" width="150" height="12" rx="6" fill="var(--color-text)" opacity="0.8" />
              <rect x="320" y="208" width="100" height="12" rx="6" fill="var(--color-text-secondary)" opacity="0.6" />
              <rect x="500" y="185" width="30" height="30" rx="8" fill="var(--color-success)" opacity="0.8" />
            </svg>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <h2 className={styles.sectionTitle}>Everything you need to run your floor</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💸</div>
              <h3>Smart Tipping</h3>
              <p>QR-based direct tips to staff via UPI. No app download required.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <h3>Staff Management</h3>
              <p>Manage waiters, chefs, and managers in one unified dashboard.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⭐</div>
              <h3>Guest Feedback</h3>
              <p>Private feedback from guests to improve your service privately.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👔</div>
              <h3>Talent Marketplace</h3>
              <p>Post jobs and find top hospitality talent in your city.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track performance, tips, and customer sentiment trends.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🪑</div>
              <h3>Venue QR Setup</h3>
              <p>A single QR code for your entire venue. Guests scan and tip or review instantly.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>Get set up in less than 10 minutes</p>
          
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3>Register Your Venue</h3>
              <p>Create an account for your Restaurant & Cafe or Hotel. Set up your location profile.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3>Set Up Your Team</h3>
              <p>Add your staff profiles and input their UPI IDs. DineCrew enables direct P2P payments with 0% fees.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3>Display Your Venue QR</h3>
              <p>Print your single venue QR code. Place it at dining tables, hotel rooms, or reception desks for easy scanning.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.logo}>DineCrew</div>
        <p className={styles.copyright}>© 2025 DineCrew. All rights reserved.</p>
      </footer>
    </div>
  );
}
