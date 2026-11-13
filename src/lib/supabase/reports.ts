import { createClient } from '@/lib/supabase/client';

export type ReportStatus = 'draf' | 'aktif' | 'ditemukan' | 'klaim' | 'selesai';

export type UserReportRow = {
  id: string;
  report_code: string;
  type: 'hilang' | 'temuan';
  item_title: string;
  category: string;
  location: string;
  incident_at: string;
  public_description: string;
  image_url: string | null;
  image_urls: string[] | null;
  diterima_di_pos: boolean;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

export type ReportEventRow = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export type ClaimRow = {
  id: string;
  user_id?: string;
  report_id: string | null;
  item_id: string;
  status: 'diajukan' | 'ditinjau' | 'disetujui' | 'ditolak';
  ticket_code: string;
  pickup_location: string | null;
  pickup_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  item?: {
    id?: string;
    title: string;
    location: string;
    image_url: string | null;
    status?: string | null;
  } | null;
};

export type ClaimItemRow = {
  id: string;
  title: string;
  location: string;
  status: string;
};

export async function fetchUserReports() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, reports: [], claims: [] as ClaimRow[] };

  const [{ data: reports, error: reportsError }, { data: claims, error: claimsError }] = await Promise.all([
    supabase
      .from('reports')
      .select('id, report_code, type, item_title, category, location, incident_at, public_description, image_url, image_urls, diterima_di_pos, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('claims')
      .select('id, user_id, report_id, item_id, status, ticket_code, pickup_location, pickup_at, reviewed_at, approved_at, created_at, updated_at, item:items!item_id(id, title, location, image_url, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (reportsError) throw reportsError;
  if (claimsError) throw claimsError;

  const mappedClaims: ClaimRow[] = ((claims || []) as unknown as Array<{
    id: string;
    user_id?: string;
    report_id: string | null;
    item_id: string;
    status: 'diajukan' | 'ditinjau' | 'disetujui' | 'ditolak';
    ticket_code: string;
    pickup_location: string | null;
    pickup_at: string | null;
    reviewed_at: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    item: { id?: string; title: string; location: string; image_url: string | null; status: string } | Array<{ id?: string; title: string; location: string; image_url: string | null; status: string }> | null;
  }>).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    report_id: c.report_id,
    item_id: c.item_id,
    status: c.status,
    ticket_code: c.ticket_code,
    pickup_location: c.pickup_location,
    pickup_at: c.pickup_at,
    reviewed_at: c.reviewed_at,
    approved_at: c.approved_at,
    created_at: c.created_at,
    updated_at: c.updated_at,
    item: Array.isArray(c.item) ? c.item[0] || null : c.item,
  }));

  return { user, reports: (reports || []) as UserReportRow[], claims: mappedClaims };
}

function selectLatestUserReport(reports: UserReportRow[], claims: ClaimRow[], reportId?: string, ticketCode?: string) {
  if (ticketCode) {
    const ticketClaim = claims.find((item) => item.ticket_code.toLowerCase() === ticketCode.toLowerCase()) || null;
    if (ticketClaim) return { report: null, claim: ticketClaim };
  }

  const directClaim = !reportId ? claims.find((item) => !item.report_id) : null;
  if (directClaim) return { report: null, claim: directClaim };

  const report = (reportId ? reports.find((item) => item.id === reportId) : reports[0]) || null;
  const claim = report
    ? claims.filter((item) => item.report_id === report.id)[0] || null
    : claims[0] || null;

  return { report, claim };
}

export async function fetchLatestUserReport(reportId?: string, ticketCode?: string) {
  const { user, reports, claims } = await fetchUserReports();
  const supabase = createClient();

  // For finders (item owners) the ticket is NOT in their own claims list
  // (fetchUserReports filters by user_id), so resolve ?ticket= directly.
  // RLS ("Report and item owners can view claims") still enforces access:
  // only claimant / item owner / staff can resolve this ticket.
  if (ticketCode && user) {
    const ownTicket = claims.find((item) => item.ticket_code.toLowerCase() === ticketCode.toLowerCase());
    if (!ownTicket) {
      const { data: ticketData } = await supabase
        .from('claims')
        .select('id, user_id, report_id, item_id, status, ticket_code, pickup_location, pickup_at, reviewed_at, approved_at, created_at, updated_at, item:items!item_id(id, title, location, image_url, status)')
        .ilike('ticket_code', ticketCode)
        .maybeSingle();
      if (ticketData) {
        const c = ticketData as unknown as {
          id: string; user_id?: string; report_id: string | null; item_id: string;
          status: ClaimRow['status']; ticket_code: string; pickup_location: string | null; pickup_at: string | null;
          reviewed_at: string | null;
          approved_at: string | null;
          created_at: string; updated_at: string;
          item: ClaimRow['item'] | Array<{ id?: string; title: string; location: string; image_url: string | null; status: string }> | null;
        };
        const mapped: ClaimRow = {
          id: c.id,
          user_id: c.user_id,
          report_id: c.report_id,
          item_id: c.item_id,
          status: c.status,
          ticket_code: c.ticket_code,
          pickup_location: c.pickup_location,
          pickup_at: c.pickup_at,
          reviewed_at: c.reviewed_at,
          approved_at: c.approved_at,
          created_at: c.created_at,
          updated_at: c.updated_at,
          item: Array.isArray(c.item) ? (c.item[0] as ClaimRow['item']) || null : (c.item as ClaimRow['item']) || null,
        };
        const { data: claimItem } = await supabase.from('items').select('id, title, location, status').eq('id', mapped.item_id).maybeSingle();
        return {
          user, reports, claims,
          report: null as UserReportRow | null,
          events: [] as ReportEventRow[],
          claim: mapped,
          claimItem: (claimItem || null) as ClaimItemRow | null,
          isClaimOwner: c.user_id === user.id,
        };
      }
    }
  }

  const { report, claim: selectedClaim } = selectLatestUserReport(reports, claims, reportId, ticketCode);
  let claim = selectedClaim;
  let isClaimOwner = !claim || !claim.user_id || claim.user_id === user?.id;

  if (!report) {
    if (!claim) return { user, reports, claims, report: null as UserReportRow | null, events: [] as ReportEventRow[], claim: null as ClaimRow | null, claimItem: null as ClaimItemRow | null, isClaimOwner: true };
    const { data: claimItem } = await supabase.from('items').select('id, title, location, status').eq('id', claim.item_id).maybeSingle();
    isClaimOwner = !claim.user_id || claim.user_id === user?.id;
    return { user, reports, claims, report: null as UserReportRow | null, events: [] as ReportEventRow[], claim, claimItem: (claimItem || null) as ClaimItemRow | null, isClaimOwner };
  }

  // Finder viewing a temuan report: surface the ticket(s) on that item so
  // the report view can link to the ticket (claims live on items, not reports).
  if (!claim && report.type === 'temuan') {
    const { data: itemRow } = await supabase
      .from('items')
      .select('id')
      .eq('source_report_id', report.id)
      .maybeSingle();
    if (itemRow?.id) {
      const { data: itemClaim } = await supabase
        .from('claims')
        .select('id, user_id, report_id, item_id, status, ticket_code, pickup_location, pickup_at, reviewed_at, approved_at, created_at, updated_at, item:items!item_id(id, title, location, image_url, status)')
        .eq('item_id', itemRow.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (itemClaim) {
        const c = itemClaim as unknown as {
          id: string; user_id?: string; report_id: string | null; item_id: string;
          status: ClaimRow['status']; ticket_code: string; pickup_location: string | null; pickup_at: string | null;
          reviewed_at: string | null;
          approved_at: string | null;
          created_at: string; updated_at: string;
          item: ClaimRow['item'] | Array<{ id?: string; title: string; location: string; image_url: string | null; status: string }> | null;
        };
        claim = {
          id: c.id,
          user_id: c.user_id,
          report_id: c.report_id,
          item_id: c.item_id,
          status: c.status,
          ticket_code: c.ticket_code,
          pickup_location: c.pickup_location,
          pickup_at: c.pickup_at,
          reviewed_at: c.reviewed_at,
          approved_at: c.approved_at,
          created_at: c.created_at,
          updated_at: c.updated_at,
          item: Array.isArray(c.item) ? (c.item[0] as ClaimRow['item']) || null : (c.item as ClaimRow['item']) || null,
        };
        isClaimOwner = !claim.user_id || claim.user_id === user?.id;
      }
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from('report_events')
    .select('id, title, description, created_at')
    .eq('report_id', report.id)
    .order('created_at', { ascending: true });

  if (eventsError) throw eventsError;

  return { user, reports, claims, report, events: (events || []) as ReportEventRow[], claim: claim || null, claimItem: null as ClaimItemRow | null, isClaimOwner };
}


