import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '../../docs/agents/question-bank.schema.json';
import {
  getDomain,
  getSkill,
  type DomainId,
  type TaskId,
  type SkillId,
} from './exam-scope';

export interface Question {
  id: string;
  domainId: DomainId;
  taskId: TaskId;
  skillId: SkillId;
  type: 'single' | 'multiple';
  topic?: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation: string;
  references?: { title: string; url: string }[];
}

interface QuestionBank {
  schemaVersion: 2;
  questions: Question[];
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile<QuestionBank>(schema);

/** Reject the entire input on invalid content; never silently drop questions. */
export function loadQuestionBanks(
  banks: Partial<Record<DomainId, unknown>>,
): Question[] {
  const questions: Question[] = [];
  const ids = new Set<string>();
  for (const [domainId, bank] of Object.entries(banks)) {
    if (
      bank !== null &&
      typeof bank === 'object' &&
      'schemaVersion' in bank &&
      bank.schemaVersion === 1
    ) {
      throw new Error(
        `Unsupported question bank version 1 for ${domainId}: migrate to schemaVersion 2 and explicitly assign each question a primary official skillId; classifications are never inferred.`,
      );
    }
    if (!validate(bank)) {
      throw new Error(
        `Invalid question bank ${domainId}: ${ajv.errorsText(validate.errors)}`,
      );
    }
    for (const question of bank.questions) {
      if (
        question.domainId !== domainId ||
        !(question.taskId in getDomain(question.domainId).tasks)
      ) {
        throw new Error(`Invalid domain/task assignment for ${question.id}`);
      }
      const skill = getSkill(question.skillId);
      if (
        !skill ||
        skill.taskId !== question.taskId ||
        skill.domainId !== question.domainId
      )
        throw new Error(
          `Invalid skill/task/domain assignment for ${question.id}`,
        );
      if (ids.has(question.id))
        throw new Error(`Duplicate question ID: ${question.id}`);
      ids.add(question.id);
      const optionIds = new Set(question.options.map((option) => option.id));
      if (optionIds.size !== question.options.length)
        throw new Error(`Duplicate option ID: ${question.id}`);
      if (question.correctOptionIds.some((id) => !optionIds.has(id))) {
        throw new Error(`Unknown correct option: ${question.id}`);
      }
      const text = [
        question.id,
        question.text,
        question.explanation,
        ...question.options.flatMap((option) => [option.id, option.text]),
        ...(question.references?.map((reference) => reference.title) ?? []),
        ...(question.topic === undefined ? [] : [question.topic]),
      ];
      if (text.some((value) => !value.trim()))
        throw new Error(`Empty text: ${question.id}`);
      questions.push(structuredClone(question));
    }
  }
  return questions;
}

export function practiceQuestions(
  questions: readonly Question[],
  domainId: PracticeScope,
) {
  return questions.filter(
    (question) => domainId === 'all' || question.domainId === domainId,
  );
}

export function validateLaunchCounts(questions: readonly Question[]) {
  for (const id of ['domain-1', 'domain-2', 'domain-3', 'domain-4'] as const) {
    const count = questions.filter(
      (question) => question.domainId === id,
    ).length;
    if (count !== 25)
      throw new Error(`Launch requires 25 questions for ${id}; found ${count}`);
  }
}

export type PracticeScope = DomainId | 'all';

export function practiceSizes(scope: PracticeScope): readonly number[] {
  return scope === 'all' ? [20, 40, 60, 85] : [10, 15, 20, 25];
}

export function practiceAvailability(
  questions: readonly Question[],
  scope: PracticeScope,
) {
  const count = practiceQuestions(questions, scope).length;
  return {
    count,
    sizes: practiceSizes(scope).map((questionCount) => ({
      questionCount,
      available: count >= questionCount,
    })),
  };
}
