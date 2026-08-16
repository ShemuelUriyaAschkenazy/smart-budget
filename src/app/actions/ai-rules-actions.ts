'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export interface AIRuleItem {
  id: string;
  ruleType: string;
  instructionText: string | null;
  validUntil: Date | null;
}

export async function getAIRules(): Promise<AIRuleItem[]> {
  return await prisma.aIRule.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAIRuleAction(instructionText: string) {
  if (!instructionText.trim()) {
    throw new Error('טקסט החוק אינו יכול להיות ריק');
  }

  await prisma.aIRule.create({
    data: {
      ruleType: 'prompt_instruction',
      instructionText: instructionText.trim(),
    },
  });

  revalidatePath('/rules');
  revalidatePath('/');
}

export async function deleteAIRuleAction(id: string) {
  await prisma.aIRule.delete({
    where: { id },
  });

  revalidatePath('/rules');
  revalidatePath('/');
}