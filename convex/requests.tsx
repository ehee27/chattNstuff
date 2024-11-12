// backend fetching friend requests and their sender, when logged in

import { ConvexError } from 'convex/values'
import { query } from './_generated/server'
import { getUserByClerkId } from './_utils'

export const get = query({
  args: {},
  // handler gets user's identity by checking auth
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Unauthorized')
    }
    // if user found, currentUser defined by getting the clerkID
    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    })

    if (!currentUser) {
      throw new ConvexError('User not found.')
    }

    // now query the requests table with current user id
    const requests = await ctx.db
      .query('requests')
      .withIndex('by_receiver', q => q.eq('receiver', currentUser._id))
      .collect()

    // map through the requests we just got and return the individual sender's info
    const requestsWithSender = await Promise.all(
      requests.map(async request => {
        const sender = await ctx.db.get(request.sender)

        if (!sender) {
          throw new ConvexError('Request sender could not be found')
        }
        return { sender, request }
      })
    )

    return requestsWithSender
  },
})

export const count = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }
    // if user found, currentUser defined by getting the clerkID
    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    })

    if (!currentUser) {
      throw new ConvexError('User not found.')
    }

    const requests = await ctx.db
      .query('requests')
      .withIndex('by_receiver', q => q.eq('receiver', currentUser._id))
      .collect()

    return requests.length
  },
})
