// Official labels: https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html
export const domains = [
  {
    id: 'domain-1',
    number: 1,
    name: 'AI Fundamentals and Literacy',
    weight: 24,
    description:
      'Build a foundation in AI concepts, solution types, and generative AI.',
    tasks: {
      '1.1': 'Describe core AI concepts and define terminology.',
      '1.2': 'Identify and select appropriate AI solution types.',
      '1.3': 'Apply GenAI concepts and techniques.',
    },
  },
  {
    id: 'domain-2',
    number: 2,
    name: 'AI Strategy and Business Value Creation',
    weight: 28,
    description:
      'Connect AI opportunities to business objectives and measurable value.',
    tasks: {
      '2.1': 'Develop AI strategies that align with business objectives.',
      '2.2': 'Measure and demonstrate AI business value.',
      '2.3': 'Position AI for competitive advantage.',
    },
  },
  {
    id: 'domain-3',
    number: 3,
    name: 'AI Governance and Responsible AI Leadership',
    weight: 24,
    description:
      'Explore responsible decisions, governance, and enterprise AI risk.',
    tasks: {
      '3.1': 'Apply responsible AI principles to business decisions.',
      '3.2':
        'Establish AI governance structures and ensure regulatory compliance.',
      '3.3': 'Identify enterprise AI risks and direct mitigation strategies.',
    },
  },
  {
    id: 'domain-4',
    number: 4,
    name: 'Business Readiness, Leadership, and AI Transformation',
    weight: 24,
    description:
      'Prepare people, data, and organizations for adoption at scale.',
    tasks: {
      '4.1': 'Assess AI business readiness and maturity.',
      '4.2': 'Establish data and infrastructure foundations for AI.',
      '4.3':
        'Lead enterprise-wide change and build AI-ready workforce capabilities.',
      '4.4': 'Scale AI from pilots to enterprise-wide deployments.',
    },
  },
] as const;

export type DomainId = (typeof domains)[number]['id'];
export type TaskId = {
  [D in (typeof domains)[number] as D['id']]: keyof D['tasks'];
}[DomainId];

export function getDomain(id: DomainId) {
  return domains.find((domain) => domain.id === id)!;
}
