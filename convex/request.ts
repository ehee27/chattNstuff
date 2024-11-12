// DB MUTATIONS/ACTIONS --- called in the useMutation hook
// creating/denying friend requests

import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { getUserByClerkId } from './_utils'

// structure similar to LAMBDA - args (params) and a handler
// ----------------- CREATE A FRIEND REQUEST --------------------------
export const create = mutation({
  // we need the email of the person
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // get identity from Clerk Auth
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Unauthorized')
    }
    // can't send to yourself
    if (args.email === identity?.email) {
      throw new ConvexError("Can't send a request to yourself")
    }
    // 'identity' is an object returned by Clerk, but ultimately we want to reference our Convex db. We already 'did a mapping' of our Clerk Ids to our Convex so we'll use helper function to call our convex

    // HELPER FUNCTION checks 'Convex' for currentUser by ClerkId
    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    })
    if (!currentUser) {
      throw new ConvexError('User not found')
    }
    // get receiver identity based off email param (arg)
    const receiver = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email))
      .unique()
    if (!receiver) {
      throw new ConvexError('User could not be found')
    }
    // check for existing request
    // SAME AS 'AlreadyReceived' below
    const requestAlreadySent = await ctx.db
      .query('requests')
      .withIndex('by_reciever_sender', q =>
        q.eq('receiver', receiver._id).eq('sender', currentUser._id)
      )
      .unique()
    if (requestAlreadySent) {
      throw new ConvexError('Request already sent')
    }

    // check for existing response
    // SAME AS 'AlreadySent' above
    const requestAlreadyReceived = await ctx.db
      .query('requests')
      .withIndex('by_reciever_sender', q =>
        q.eq('receiver', currentUser._id).eq('sender', receiver._id)
      )
      .unique()
    if (requestAlreadyReceived) {
      throw new ConvexError('This user has already sent you a request')
    }

    // check for existing friendship between the users
    const friends1 = await ctx.db
      .query('friends')
      .withIndex('by_user1', q => q.eq('user1', currentUser._id))
      .collect()
    const friends2 = await ctx.db
      .query('friends')
      .withIndex('by_user2', q => q.eq('user2', currentUser._id))
      .collect()

    if (
      friends1.some(friend => friend.user2 === receiver._id) ||
      friends2.some(friend => friend.user1 === receiver._id)
    ) {
      throw new ConvexError('You are already friends!')
    }

    // IF ALL HAS PASSED, RECORD THE REQUEST
    // if all pass, record the request
    const request = await ctx.db.insert('requests', {
      sender: currentUser._id,
      receiver: receiver._id,
    })

    return request
  },
})

// ----------------- DENY A FRIEND REQUEST --------------------------
export const deny = mutation({
  // we need the ID of the request
  args: {
    id: v.id('requests'),
  },
  // FIRST WE VALIDATE THE USER as above-------------
  handler: async (ctx, args) => {
    // we get 'getUserIdentity' from our Clerk/Convex config
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Unauthorized')
    }
    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    })
    if (!currentUser) {
      throw new ConvexError('User not found')
    }
    // If user exists - get the request
    const request = await ctx.db.get(args.id)
    // check that it's mine
    if (!request || request.receiver !== currentUser._id) {
      throw new ConvexError('There was an error denying this request.')
    }
    // delete
    await ctx.db.delete(request._id)
  },
})

// ----------------- CREATE A FRIEND REQUEST --------------------------
export const accept = mutation({
  args: {
    id: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new ConvexError('Unauthorized')
    }

    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    })
    if (!currentUser) {
      throw new ConvexError('User not found')
    }

    const request = await ctx.db.get(args.id)

    if (!request || request.receiver !== currentUser._id) {
      throw new ConvexError('There was an error accepting request')
    }

    const conversationId = await ctx.db.insert('conversations', {
      isGroup: false,
    })

    await ctx.db.insert('friends', {
      user1: currentUser._id,
      user2: request.sender,
      conversationId,
    })

    await ctx.db.insert('conversationMembers', {
      memberId: currentUser._id,
      conversationId,
    })
    await ctx.db.insert('conversationMembers', {
      memberId: request.sender,
      conversationId,
    })

    await ctx.db.delete(request._id)
  },
})
