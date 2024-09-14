import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getWeekPendingGoals } from '../../services/get-week-pending-goal';

export const getPendingGoalRoute: FastifyPluginAsyncZod = async (app) => {
    app.get('/pending-goals', async () => {
        const { pendingGoals } = await getWeekPendingGoals()
        return { pendingGoals }
      })
};