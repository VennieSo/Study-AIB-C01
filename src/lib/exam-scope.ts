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

/** Official AWS AIB-C01 skills, in guide order; verified 2026-11-12. */
export const skills = [
  {
    id: '1.1.1',
    description:
      'Recognize and explain fundamental AI concepts in business contexts (for example, algorithms, models, training, inference, predictions).',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.1.2',
    description:
      'Distinguish between AI, machine learning (ML), and generative AI (GenAI).',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.1.3',
    description:
      'Distinguish between structured and unstructured data and explain the relevance of data types for AI.',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.1.4',
    description: 'Describe why data quality matters for AI outcomes.',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.1.5',
    description:
      'Explain concepts related to training an AI model by using historical data.',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.1.6',
    description:
      'Ensure awareness of global frameworks and unified AI vocabulary (for example, ISO/IEC 23053, ISO/IEC 42001).',
    taskId: '1.1',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.2.1',
    description:
      'Determine when to use rule-based automation and when to use AI solutions.',
    taskId: '1.2',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.2.2',
    description:
      'Distinguish AI agents from other AI solutions and identify the core capabilities of AI agents (for example, autonomy, tool use, agent-to-agent communication, and orchestration strategies).',
    taskId: '1.2',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.2.3',
    description:
      'Describe why AI solutions require ongoing monitoring and updates to detect and remediate model drift and performance changes.',
    taskId: '1.2',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.2.4',
    description:
      'Establish transparent classification of AI tools (for example, approved, blocked, under evaluation) to mitigate shadow AI risks.',
    taskId: '1.2',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.3.1',
    description:
      'Apply basic prompt engineering principles to achieve desired AI outputs.',
    taskId: '1.3',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.3.2',
    description:
      'Identify when token limits or context window constraints affect GenAI system performance.',
    taskId: '1.3',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '1.3.3',
    description:
      'Recognize how model adaptation techniques (for example, Retrieval Augmented Generation [RAG], fine-tuning) improve AI responses for specific business needs.',
    taskId: '1.3',
    domainId: 'domain-1',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain1.html',
  },
  {
    id: '2.1.1',
    description:
      'Identify high-impact AI use cases across business functions (for example, customer operations, sales and marketing, research and development, software development) and map AI capabilities to specific business outcomes.',
    taskId: '2.1',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.1.2',
    description:
      'Evaluate build-buy-partner decisions for AI implementations (by considering factors including budget, timelines, capabilities, vendor proposals, and regulatory compliance requirements).',
    taskId: '2.1',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.1.3',
    description:
      'Prioritize AI initiatives based on business value, feasibility, sustainability, and strategic alignment (by deciding to scale, pause, or terminate initiatives).',
    taskId: '2.1',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.1.4',
    description:
      'Determine when AI is not the appropriate solution for a business problem.',
    taskId: '2.1',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.1.5',
    description:
      'Evaluate key considerations when preparing to transition business processes to AI-based solutions or between AI platforms (for example, business continuity, cost implications, data readiness, performance impact).',
    taskId: '2.1',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.2.1',
    description:
      'Define key performance indicators (KPIs) for AI initiatives, including tangible benefits (for example, cost reduction, revenue growth) and intangible benefits (for example, customer satisfaction, employee productivity).',
    taskId: '2.2',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.2.2',
    description:
      'Establish baseline metrics before implementing AI solutions to accurately measure AI adoption effects.',
    taskId: '2.2',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.2.3',
    description:
      'Calculate AI return on investment (ROI) by using comprehensive frameworks (for example, time savings, cost reduction, revenue growth, productivity gains).',
    taskId: '2.2',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.2.4',
    description: 'Identify leading indicators that predict AI project success.',
    taskId: '2.2',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.2.5',
    description:
      'Implement basic cost factor controls for AI implementations, including cost planning and optimization strategies.',
    taskId: '2.2',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.3.1',
    description:
      'Assess competitive landscapes and identify advantages to adopting AI.',
    taskId: '2.3',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.3.2',
    description:
      'Identify opportunities to transform business models by using AI solutions.',
    taskId: '2.3',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.3.3',
    description:
      'Describe how AI creates sustainable competitive advantages and operational improvements.',
    taskId: '2.3',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '2.3.4',
    description:
      'Determine appropriate AI investment levels based on industry maturity and competitive dynamics.',
    taskId: '2.3',
    domainId: 'domain-2',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain2.html',
  },
  {
    id: '3.1.1',
    description:
      'Apply responsible AI principles and dimensions (for example, fairness, explainability, privacy, safety, transparency, robustness) to business scenarios.',
    taskId: '3.1',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.1.2',
    description:
      'Navigate tradeoffs when business objectives conflict with responsible AI principles.',
    taskId: '3.1',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.1.3',
    description:
      'Identify when responsible AI practices should be integrated into AI project planning to ensure governance by design.',
    taskId: '3.1',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.1.4',
    description:
      'Recognize circumstances when AI systems require human oversight and identify appropriate safeguards (for example, hallucination detection, guardrails, escalation criteria).',
    taskId: '3.1',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.2.1',
    description:
      'Establish AI governance structures that have appropriate cross-functional representation and clear accountability.',
    taskId: '3.2',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.2.2',
    description:
      'Identify and address regulatory compliance risks for business processes that use AI.',
    taskId: '3.2',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.2.3',
    description:
      'Identify appropriate access controls and data security measures for AI systems.',
    taskId: '3.2',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.2.4',
    description:
      'Apply AI risk classification frameworks to prioritize governance and compliance decisions across the AI lifecycle.',
    taskId: '3.2',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.3.1',
    description:
      'Identify the need for risk controls and monitoring mechanisms for AI systems in production.',
    taskId: '3.3',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.3.2',
    description:
      'Recognize that bias can occur at multiple stages of the AI lifecycle and explain the importance of ongoing monitoring for bias drift.',
    taskId: '3.3',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.3.3',
    description:
      'Manage harmful content risks and intellectual property (IP) concerns for AI systems.',
    taskId: '3.3',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '3.3.4',
    description:
      'Identify and mitigate risks related to AI system reliability (for example, hallucinations, data quality degradation, model drift).',
    taskId: '3.3',
    domainId: 'domain-3',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain3.html',
  },
  {
    id: '4.1.1',
    description:
      'Assess business readiness to adopt AI across critical dimensions (for example, leadership alignment, data quality, cultural preparedness, technical infrastructure, governance frameworks).',
    taskId: '4.1',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.1.2',
    description:
      'Apply AI maturity models to evaluate where an enterprise is in its AI journey (for example, experimentation, enterprise-scale deployment).',
    taskId: '4.1',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.1.3',
    description:
      'Identify specific capability gaps across people, process, technology, and governance that prevent successful AI transformations.',
    taskId: '4.1',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.1.4',
    description:
      'Prioritize development investments and create progression pathways based on strategic objectives and the current business maturity level.',
    taskId: '4.1',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.2.1',
    description:
      'Evaluate data readiness, including data quality, accessibility, and the effects of data silos on AI initiatives.',
    taskId: '4.2',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.2.2',
    description:
      'Describe the importance of data strategies, data ownership, and data sharing frameworks that provide the foundation for AI.',
    taskId: '4.2',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.2.3',
    description:
      'Assess foundational technology and infrastructure requirements to support AI initiatives.',
    taskId: '4.2',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.1',
    description:
      'Establish executive sponsorship and leadership alignment to identify and empower AI champions to sustain momentum across an enterprise.',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.2',
    description:
      'Build cross-functional teams that represent diverse areas of expertise (for example, business leads, technical experts, legal, compliance) and assign clear accountability standards for AI initiatives.',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.3',
    description:
      'Create transparent communication strategies that address workforce concerns about AI (for example, implementation timelines, outcome expectations, effects on workforce roles).',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.4',
    description:
      'Recognize cultural barriers to AI adoption (for example, risk aversion, resistance to change, fear of failure) and identify leadership interventions to address these concerns.',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.5',
    description:
      'Determine appropriate workforce development approaches to accelerate enterprise-wide AI literacy (for example, proof of concept [POC] programs, hackathons, training programs, responsible AI training).',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.3.6',
    description:
      'Identify opportunities to transition human roles from manual operations to human oversight and collaboration with AI systems, and make strategic decisions that balance human strengths (for example, critical thinking, empathy, creativity) with AI capabilities.',
    taskId: '4.3',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.1',
    description:
      'Apply iterative transformation approaches that progress through phases (for example, envision, experiment, launch, scale).',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.2',
    description:
      'Implement scaling methodologies that start with short-term wins and build toward enterprise-wide deployments.',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.3',
    description:
      'Establish AI centers of excellence (COEs) and cross-functional collaboration mechanisms to support scaling.',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.4',
    description:
      'Establish continuous feedback mechanisms and success metrics to track AI initiative progress and long-term value.',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.5',
    description:
      'Address the transition of AI initiatives from experimental to production-grade, including governance and operational requirements.',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
  {
    id: '4.4.6',
    description:
      'Evaluate multiple factors throughout AI scaling initiatives across an enterprise to ensure business continuity and performance.',
    taskId: '4.4',
    domainId: 'domain-4',
    sourceUrl:
      'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01-domain4.html',
  },
] as const;

export type SkillId = (typeof skills)[number]['id'];

export function getSkill(id: string) {
  return skills.find((skill) => skill.id === id);
}
