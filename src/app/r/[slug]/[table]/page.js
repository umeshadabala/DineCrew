import { getSupabaseServer } from '@/lib/supabase-server';
import GuestPortal from '@/components/GuestPortal';
import styles from '../page.module.css';

export default async function TableGuestPage({ params }) {
  const { slug, table } = await params;
  const supabase = await getSupabaseServer();

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single();

  if (bizError || !business) {
    return (
      <main className={styles.notFound}>
        <svg className={styles.notFoundIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15s1.5-2 4-2 4 2 4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        <h1 className={styles.notFoundTitle}>Restaurant not found</h1>
         <p className={styles.notFoundText}>
           The QR code you scanned doesn&apos;t match any restaurant in our system. Please ask your server for help.
         </p>
      </main>
    );
  }

  const { data: tableData } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', business.id)
    .eq('qr_slug', table)
    .single();

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name');

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('table_number');

  return (
    <GuestPortal
      business={business}
      staff={staff || []}
      tables={tables || []}
      tableId={tableData?.id || null}
    />
  );
}
