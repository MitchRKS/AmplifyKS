export type IssueCategory =
  | 'Education'
  | 'Healthcare'
  | 'Religious Freedom'
  | 'LGBTQ+ Rights'
  | 'Abortion & Reproductive Rights';

export interface QuizQuestion {
  id: string;
  text: string;
  category: IssueCategory;
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Education',
  'Healthcare',
  'Religious Freedom',
  'LGBTQ+ Rights',
  'Abortion & Reproductive Rights',
];

export const CATEGORY_ICONS: Record<IssueCategory, string> = {
  Education: 'school',
  Healthcare: 'local-hospital',
  'Religious Freedom': 'account-balance',
  'LGBTQ+ Rights': 'people',
  'Abortion & Reproductive Rights': 'favorite',
};

export const RESPONSE_LEVELS = [
  { value: 5, label: 'Strongly Agree' },
  { value: 4, label: 'Agree' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Disagree' },
  { value: 1, label: 'Strongly Disagree' },
  { value: 0, label: 'Not Sure' },
] as const;

export type ResponseValue = (typeof RESPONSE_LEVELS)[number]['value'];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'edu1',
    text: 'Public schools should be prioritized and fully funded over private school voucher programs.',
    category: 'Education',
  },
  {
    id: 'edu2',
    text: 'Teachers and schools should be free to teach accurate history and science without political interference.',
    category: 'Education',
  },
  {
    id: 'hc1',
    text: 'Every Kansan should have access to affordable healthcare regardless of their income.',
    category: 'Healthcare',
  },
  {
    id: 'hc2',
    text: 'Kansas should expand Medicaid to cover more low-income adults.',
    category: 'Healthcare',
  },
  {
    id: 'rf1',
    text: 'Government should remain separate from religion and not use public policy to impose religious beliefs.',
    category: 'Religious Freedom',
  },
  {
    id: 'rf2',
    text: 'Religious beliefs should not be used as legal justification to deny services or discriminate against others.',
    category: 'Religious Freedom',
  },
  {
    id: 'lgbtq1',
    text: 'LGBTQ+ Kansans deserve full legal protection from discrimination in housing, employment, and public accommodations.',
    category: 'LGBTQ+ Rights',
  },
  {
    id: 'lgbtq2',
    text: 'Transgender individuals should be respected and protected under Kansas law.',
    category: 'LGBTQ+ Rights',
  },
  {
    id: 'ab1',
    text: 'Abortion should remain a legal option for women in Kansas.',
    category: 'Abortion & Reproductive Rights',
  },
  {
    id: 'ab2',
    text: 'Access to contraception and reproductive healthcare should be protected by law.',
    category: 'Abortion & Reproductive Rights',
  },
];
