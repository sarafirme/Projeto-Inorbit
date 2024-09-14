import { and, count, eq, gte, lte, sql } from "drizzle-orm"
import { db } from "../db"
import { goalCompletions, goals } from "../db/schema"
import dayjs from "dayjs"
import { title } from "process"
import { number } from "zod"


export async function getWeekSummary() {
   const firstDayOFWeek = dayjs().startOf('week').toDate() //primeiro dia da semana
   const lastDayOfWeek = dayjs().endOf('week').toDate()

   const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
      db
        .select({
          id: goals.id,
          title: goals.title,
          desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
          createdAt: goals.createdAt,
        })
        .from(goals)
        .where(lte(goals.createdAt, lastDayOfWeek))
    )//metas criadas

    const goalsCompletedInWeek = db.$with('goals_completed_in_week').as(
      db
        .select({
          id: goalCompletions.id,
          title: goals.title,
         completedAt: goalCompletions.createdAt,
         completedAtDate: sql ` 
         DATE(${goalCompletions.createdAt})

         `.as('completedAtDate'),
        })
        .from(goalCompletions)
        .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
        .where(
          and(
            gte(goalCompletions.createdAt, firstDayOFWeek),
            lte(goalCompletions.createdAt, lastDayOfWeek)
          )
        )
    ) //metas completas

    const goalsCompleteByWeekDay = db.$with('goals_complete_by_week_day').as(
      db
      .select({
         completedAtDate: goalsCompletedInWeek.completedAtDate,
         completions: sql `
         JSON_AGG(
            JSON_BUILD_OBJECT(
               'id', ${goalsCompletedInWeek.id},
               'title', ${goalsCompletedInWeek.title},
               'completeAt', ${goalsCompletedInWeek.completedAt}
            )
         )
         `.as('completions'),
      }).from(goalsCompletedInWeek).groupBy(goalsCompletedInWeek.completedAtDate)
    );

    const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompleteByWeekDay)
    .select({
        completed: sql ` 
          (SELECT COUNT(*) FROM ${goalsCompletedInWeek})`
          .mapWith(Number),

        total: sql `(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(Number),
        goalsPerDay: sql `
        JSON_OBJECT_AGG(
          ${goalsCompleteByWeekDay.completedAtDate}, ${goalsCompleteByWeekDay.completions}
        )
        `,

 })
    .from(goalsCompleteByWeekDay)

 return {
    summary: result
 }
}
