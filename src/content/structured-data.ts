import { domains } from '../lib/exam-scope';
import { faqAnswerText, faqItems } from './faq';
import { site } from './site';

const absolute = (path: string) => new URL(path, site.url).href;
const websiteId = `${site.url}/#website`;
const authorId = `${site.url}/#author`;

const website = {
  '@type': 'WebSite',
  '@id': websiteId,
  url: absolute('/'),
  name: site.name,
  description: `Free, unofficial practice exam for ${site.certificationName}.`,
  inLanguage: 'en',
  publisher: { '@id': authorId },
};

const author = {
  '@type': 'Person',
  '@id': authorId,
  name: site.author.name,
  url: site.author.url,
  sameAs: [site.author.url, site.author.github],
};

const certification = {
  '@type': 'Thing',
  name: site.certificationName,
  sameAs: site.certificationUrl,
};

export const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    website,
    author,
    {
      '@type': ['LearningResource', 'Quiz'],
      '@id': `${site.url}/#practice-exam`,
      url: absolute('/'),
      name: `${site.certificationName} practice exam`,
      description:
        '200+ original, AI-generated practice questions with explanations, by domain or as a timed practice test.',
      learningResourceType: 'Practice exam',
      educationalLevel: 'Professional certification',
      isAccessibleForFree: true,
      inLanguage: 'en',
      about: certification,
      teaches: domains.map((domain) => domain.name),
      author: { '@id': authorId },
      isPartOf: { '@id': websiteId },
    },
    {
      '@type': 'FAQPage',
      '@id': `${site.url}/#faq`,
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faqAnswerText(item.answer),
        },
      })),
    },
  ],
};

export function factsStructuredData(page: {
  headline: string;
  description: string;
  published: string;
  modified: string;
  citations: readonly string[];
}) {
  const url = absolute(site.factsPath);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      website,
      author,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: page.headline,
        description: page.description,
        url,
        datePublished: page.published,
        dateModified: page.modified,
        inLanguage: 'en',
        author: { '@id': authorId },
        publisher: { '@id': authorId },
        isPartOf: { '@id': websiteId },
        about: certification,
        citation: page.citations,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Practice exam',
            item: absolute('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'AIB-C01 exam facts',
            item: url,
          },
        ],
      },
    ],
  };
}
