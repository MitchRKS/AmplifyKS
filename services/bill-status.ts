/**
 * Maps a LegiScan bill status label to its badge color.
 * Shared by the bills list (bills.tsx) and bill detail (bill-detail.tsx)
 * so the two screens never disagree about a status's color.
 * `fallback` is returned for unrecognized statuses (pass a theme muted color).
 */
export function getBillStatusColor(status: string, fallback: string): string {
  switch (status) {
    case 'Passed':
    case 'Chaptered':
      return '#adc323';
    case 'Introduced':
    case 'Engrossed':
      return '#a9cd34';
    case 'Enrolled':
      return '#0097b2';
    case 'Vetoed':
    case 'Failed':
      return '#fa3332';
    default:
      return fallback;
  }
}
