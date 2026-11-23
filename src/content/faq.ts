import { domains } from '../lib/exam-scope';
import { site } from './site';

// One source for the visible FAQ and its FAQPage structured data.
const examGuide = site.examGuideUrl;
const certification = site.certificationUrl;
const officialPractice =
  'https://skillbuilder.aws/learn/NN5MQE4G3M/official-practice-question-set-aws-certified-ai-business-strategist-aibc01--english/9TUSJ7NJ7N';
const facts = site.factsPath;

export interface FaqItem {
  question: string;
  /** Trusted static HTML: paragraphs, lists, and links only. */
  answer: string;
}

export const faqItems: readonly FaqItem[] = [
  {
    question: 'What is AWS Certified AI Business Strategist (AIB-C01)?',
    answer: `<p>AWS Certified AI Business Strategist is a certification for making business decisions about AI. AIB-C01 is the exam code. It tests how you prioritize AI investments, build a business case, manage risk, and scale successful pilots across an organization. <a href="${certification}">AWS certification overview</a></p>`,
  },
  {
    question: 'Who is the AWS Certified AI Business Strategist exam for?',
    answer: `<p>The exam is for professionals who evaluate, sponsor, or scale AI initiatives. Typical candidates include product and program managers, business analysts, consultants, and business leaders who work with technical teams. <a href="${examGuide}">AWS candidate profile</a></p>`,
  },
  {
    question:
      'Do I need coding, hands-on AWS experience, or another certification?',
    answer: `<p>AWS requires none of these. It recommends about six months working with or alongside teams adopting AI, plus familiarity with basic AI concepts and what AWS AI services offer at a business level. <a href="${certification}">AWS certification prerequisites</a></p>`,
  },
  {
    question: 'What topics are covered on the AIB-C01 exam?',
    answer: `<p>The exam covers four domains. These percentages show how AWS weights the scored content.</p><ul>${domains
      .map((domain) => `<li>${domain.name} (${domain.weight}%)</li>`)
      .join('')}</ul><p><a href="${examGuide}">Official exam guide</a></p>`,
  },
  {
    question:
      'How long is the AIB-C01 exam, and how many questions does it have?',
    answer: `<p>It depends on when you take it. The beta exam, available until 13 January 2027, has 85 questions and a 170-minute time limit. The standard exam has a 130-minute time limit; AWS has not yet published its question count, and 65 is expected. Both use single-answer multiple choice and multiple response questions. For multiple response questions, you must select every correct option to earn credit. <a href="${facts}#exam-format">AIB-C01 facts: exam format</a></p>`,
  },
  {
    question: 'How much does the AIB-C01 exam cost?',
    answer: `<p>The beta exam costs USD 50. The standard exam costs USD 100. You can take it at a Pearson VUE test centre or online with a proctor.</p>`,
  },
  {
    question: 'What is the passing score for AIB-C01?',
    answer: `<p>AWS reports scores on a scale of 100 to 1,000. You need an overall scaled score of 700 to pass. <a href="${examGuide}">AWS exam scoring</a></p>`,
  },
  {
    question: 'Is the beta exam different from the standard exam?',
    answer: `<p>Yes. The beta is longer (85 questions, 170 minutes), cheaper (USD 50), offered in English and Japanese, and can be taken only once. It is available until 13 January 2027, and passing it earns the full certification. <a href="${facts}#exam-format">Beta and standard compared</a></p>`,
  },
  {
    question: 'What is the difference between AIB-C01 and AIF-C01?',
    answer: `<p>AWS Certified AI Business Strategist (AIB-C01) tests business decisions about AI: strategy, business value, governance and adoption. AWS Certified AI Practitioner (AIF-C01) tests foundational knowledge of AI, machine learning, generative AI and AWS AI services. AWS describes them as built for different purposes, with no required order, and you can earn both. <a href="${facts}#aib-c01-vs-aif-c01">Which to take first</a></p>`,
  },
  {
    question: 'Where can I find free AIB-C01 practice questions?',
    answer: `<p><a href="#practice">Start a free practice session</a> on this site. You get 200+ original practice questions with an explanation after each answer, by domain or across all four, with no sign-up. For a practice test under time pressure, use the <a href="#exam">timed exam</a>. AWS Skill Builder also offers a free <a href="${officialPractice}">Official Practice Question Set</a> with 20 questions.</p>`,
  },
  {
    question: 'Are these real AIB-C01 exam questions?',
    answer: `<p>No. Every question here is original and AI-generated, written in a similar style to the official sample questions, grounded in AWS documentation, and mapped to the official exam guide. They are not copied from the exam and this is not a dump site. Use them to practise the reasoning the exam asks for, not to memorise answers.</p>`,
  },
  {
    question: 'How should I prepare for the AIB-C01 exam?',
    answer: `<p>Start with the <a href="${examGuide}">official exam guide</a>. Practice by domain to find gaps, then try a <a href="#exam">timed mock exam</a> across all four domains. Review why each correct answer fits the business scenario, especially when several options sound reasonable.</p>`,
  },
];

/** Plain text for structured data: list items become sentences, tags are dropped. */
export function faqAnswerText(answer: string) {
  return answer
    .replace(/<\/li>\s*<li>/g, '; ')
    .replace(/<\/(?:p|ul)>\s*<(?:p|ul)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
