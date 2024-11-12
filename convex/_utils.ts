// querying Convex with the params ClerkId passed
// ctx is a mutation context object... object of accessible data
import { MutationCtx, QueryCtx } from './_generated/server'

export const getUserByClerkId = async ({
  // takes in context and clerkId
  ctx,
  clerkId,
}: {
  // ctx is Query or Mutation, Id is string
  ctx: QueryCtx | MutationCtx
  clerkId: string
}) => {
  // query the 'users' and match the clerkId
  return await ctx.db
    .query('users')
    .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
    .unique()
}
