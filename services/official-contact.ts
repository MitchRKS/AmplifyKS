import type { Official } from '@/services/openstates';

/**
 * First phone number an official's list record carries (capitol office for
 * local legislators, whatever OpenStates provides for geo results). Shared
 * by every elected card so they can't disagree about which number shows.
 */
export function officialPhone(official: Official): string {
  return official.contactDetails?.find((detail) => detail.voice)?.voice ?? '';
}
