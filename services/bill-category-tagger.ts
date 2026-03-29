import { collection, getDocs } from 'firebase/firestore';

import type { IssueCategory } from '@/constants/quiz-questions';
import { getFirestoreDb } from '@/services/firebase';

export interface BillTag {
  category: IssueCategory;
  isProgressiveIfYea: boolean;
}

const KEYWORD_RULES: [string[], IssueCategory, boolean][] = [
  [
    ['abortion', 'reproductive', 'planned parenthood', 'contraception',
     'fetal', 'fetus', 'termination of pregnancy', 'pro-life', 'pro-choice',
     'maternal health', 'pregnancy'],
    'Abortion & Reproductive Rights', true,
  ],
  [
    ['lgbtq', 'transgender', 'trans ', 'gender identity', 'sexual orientation',
     'same-sex', 'gay', 'lesbian', 'bisexual', 'queer', 'nonbinary',
     'conversion therapy', 'drag', 'pronoun'],
    'LGBTQ+ Rights', true,
  ],
  [
    ['religious freedom', 'religious exemption', 'religious liberty',
     'establishment clause', 'separation of church', 'prayer in school',
     'faith-based', 'religious institution', 'conscience clause'],
    'Religious Freedom', true,
  ],
  [
    ['medicaid', 'medicare', 'health insurance', 'health care', 'healthcare',
     'mental health', 'prescription', 'pharmaceutical', 'hospital', 'clinic',
     'public health', 'telehealth', 'insurance coverage', 'kancare'],
    'Healthcare', true,
  ],
  [
    ['school', 'education', 'student', 'tuition', 'university', 'college',
     'k-12', 'kindergarten', 'curriculum', 'teacher', 'classroom',
     'voucher', 'charter school', 'higher education', 'academic',
     'book ban', 'critical race', 'library'],
    'Education', true,
  ],
];

const normalizeBillNumber = (billNumber: string): string =>
  billNumber.toUpperCase().replace(/ /g, '');

const keywordTag = (title: string): BillTag | null => {
  const lower = title.toLowerCase();
  for (const [keywords, category, isProgressiveIfYea] of KEYWORD_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return { category, isProgressiveIfYea };
    }
  }
  return null;
};

let overrideCache: Record<string, BillTag> = {};
let hasFetchedOverrides = false;

export const fetchOverrides = async (): Promise<void> => {
  if (hasFetchedOverrides) return;
  hasFetchedOverrides = true;

  try {
    const db = getFirestoreDb();
    const snapshot = await getDocs(collection(db, 'billCategoryTags'));
    const cache: Record<string, BillTag> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const category = data.category as IssueCategory | undefined;
      const isProgressiveIfYea = data.isProgressiveIfYea as boolean | undefined;
      if (!category || isProgressiveIfYea == null) continue;
      cache[normalizeBillNumber(doc.id)] = { category, isProgressiveIfYea };
    }

    overrideCache = cache;
  } catch {
    // Fall back to keyword matching
  }
};

export const tagBill = (billNumber: string, billTitle: string): BillTag | null => {
  const normalized = normalizeBillNumber(billNumber);
  const override = overrideCache[normalized];
  if (override) return override;
  return keywordTag(billTitle);
};
