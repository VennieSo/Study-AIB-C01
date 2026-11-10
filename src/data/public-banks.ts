import domain1 from './questions/domain-1.json';
import domain2 from './questions/domain-2.json';
import domain3 from './questions/domain-3.json';
import domain4 from './questions/domain-4.json';
import type { DomainId } from '../lib/exam-scope';

export const publicBanks = {
  'domain-1': domain1,
  'domain-2': domain2,
  'domain-3': domain3,
  'domain-4': domain4,
} satisfies Record<DomainId, unknown>;
