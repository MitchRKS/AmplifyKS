// LegiScan API Service
// API Documentation: https://legiscan.com/gaits/documentation/legiscan

const LEGISCAN_API_KEY = '18cf0e63a5cb8e7b5cd0e5102f664e2a';
const LEGISCAN_BASE_URL = 'https://api.legiscan.com';

interface LegiscanResponse {
  status: string;
  [key: string]: any;
}

interface SessionListResponse extends LegiscanResponse {
  sessions: Array<{
    session_id: number;
    state_id: number;
    year_start: number;
    year_end: number;
    session_name: string;
    special: number;
  }>;
}

interface BillSummary {
  bill_id: number;
  number: string;
  title: string;
  description: string;
  status: number;
  status_date: string;
  last_action_date: string;
  last_action: string;
  url: string;
  state_link: string;
  change_hash: string;
}

interface MasterListResponse extends LegiscanResponse {
  masterlist: {
    [key: string]: BillSummary;
  };
}

interface BillDetailResponse extends LegiscanResponse {
  bill: {
    bill_id: number;
    bill_number: string;
    title: string;
    description: string;
    state: string;
    session: {
      session_id: number;
      session_name: string;
      year_start: number;
      year_end: number;
    };
    status: number;
    status_date: string;
    url: string;
    state_link: string;
    sponsors: Array<{
      people_id: number;
      person_hash: string;
      party_id: number;
      party: string;
      role_id: number;
      role: string;
      name: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      suffix: string;
      nickname: string;
      district: string;
      sponsor_type_id: number;
      sponsor_order: number;
    }>;
    history: Array<{
      date: string;
      action: string;
      chamber: string;
      chamber_id: number;
      importance: number;
    }>;
    committee?: {
      committee_id: number;
      chamber: string;
      chamber_id: number;
      name: string;
    };
    texts: Array<{
      doc_id: number;
      date: string;
      type: string;
      type_id: number;
      mime: string;
      mime_id: number;
      url: string;
      state_link: string;
    }>;
    votes: Array<any>;
    amendments: Array<any>;
    supplements: Array<any>;
    calendar: Array<any>;
  };
}

/**
 * Make a request to the LegiScan API
 */
async function makeApiRequest(operation: string, params: Record<string, string | number> = {}): Promise<any> {
  const queryParams = new URLSearchParams({
    key: LEGISCAN_API_KEY,
    op: operation,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const url = `${LEGISCAN_BASE_URL}/?${queryParams.toString()}`;

  console.log('LegiScan API Request:', operation, params);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LegiscanResponse = await response.json();
    console.log('LegiScan API Response:', operation, data);

    if (data.status !== 'OK') {
      console.error('API Error Status:', data);
      throw new Error(data.status || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('LegiScan API Error:', error);
    throw error;
  }
}

/**
 * Get list of sessions for a state
 * @param state - Two letter state abbreviation (e.g., 'KS' for Kansas)
 */
export async function getSessionList(state: string = 'KS'): Promise<SessionListResponse['sessions']> {
  const data: SessionListResponse = await makeApiRequest('getSessionList', { state });
  return data.sessions || [];
}

/**
 * Get the most recent session for Kansas
 */
export async function getCurrentSession(): Promise<number> {
  const sessions = await getSessionList('KS');
  
  console.log('Available sessions:', sessions);
  
  if (!sessions || sessions.length === 0) {
    throw new Error('No sessions found for Kansas');
  }

  // The API returns sessions in order with most recent first, so just take the first one
  const currentSession = sessions[0];
  console.log('Current session selected:', currentSession);
  return currentSession.session_id;
}

/**
 * Get master list of bills for a session
 * @param sessionId - Session ID from getSessionList
 */
export async function getMasterList(sessionId: number): Promise<BillSummary[]> {
  const data: MasterListResponse = await makeApiRequest('getMasterList', { id: sessionId });
  
  console.log('Master list data:', data);
  
  if (!data.masterlist) {
    console.log('No masterlist in response');
    return [];
  }

  // Convert object to array
  const bills = Object.values(data.masterlist);
  console.log(`Fetched ${bills.length} bills`);
  return bills;
}

/**
 * Get bills for the current Kansas session
 */
export async function getKansasBills(): Promise<BillSummary[]> {
  const sessionId = await getCurrentSession();
  return getMasterList(sessionId);
}

/**
 * Get detailed information about a specific bill
 * @param billId - Bill ID from master list
 */
export async function getBillDetail(billId: number): Promise<BillDetailResponse['bill']> {
  const data: BillDetailResponse = await makeApiRequest('getBill', { id: billId });
  return data.bill;
}

/**
 * Get bill text document
 * @param docId - Document ID from bill texts array
 */
export async function getBillText(docId: number): Promise<any> {
  const data = await makeApiRequest('getBillText', { id: docId });
  return data.text;
}

/**
 * Search bills by query
 * @param query - Search query string
 * @param state - State abbreviation (default: KS)
 * @param year - Year to search (default: current year)
 */
export async function searchBills(query: string, state: string = 'KS', year?: number): Promise<any> {
  const params: Record<string, string | number> = {
    state,
    query,
  };

  if (year) {
    params.year = year;
  }

  const data = await makeApiRequest('search', params);
  return data.searchresult || [];
}

/**
 * Map LegiScan status codes to readable status strings
 */
export function getStatusLabel(statusCode: number): string {
  // Common status codes (these may vary by state)
  const statusMap: Record<number, string> = {
    1: 'Introduced',
    2: 'Engrossed',
    3: 'Enrolled',
    4: 'Passed',
    5: 'Vetoed',
    6: 'Failed',
    7: 'Override',
    8: 'Chaptered',
  };

  return statusMap[statusCode] || 'In Progress';
}

/**
 * Get chamber from bill number
 */
export function getChamber(billNumber?: string): 'House' | 'Senate' | 'Unknown' {
  if (!billNumber || typeof billNumber !== 'string') {
    console.warn('Invalid bill number:', billNumber);
    return 'Unknown';
  }
  
  const prefix = billNumber.toUpperCase().substring(0, 2);
  
  if (prefix === 'HB' || prefix === 'HR' || prefix === 'HJ' || prefix === 'HC') {
    return 'House';
  } else if (prefix === 'SB' || prefix === 'SR' || prefix === 'SJ' || prefix === 'SC') {
    return 'Senate';
  }
  
  return 'Unknown';
}
