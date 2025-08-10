import { defineCollection, z } from 'astro:content';

const deploymentCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    provider: z.string(),
    buildCommand: z.string(),
    outputDir: z.string(),
    envVars: z.array(z.string()).optional(),
  }),
});

export const collections = {
  deployment: deploymentCollection,
};