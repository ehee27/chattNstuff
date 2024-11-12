// we can call any mutation and get a 'pending state' while the mutation resolves

import { useMutation } from 'convex/react'
import { useState } from 'react'

export const useMutationState = (mutationToRun: any) => {
  // pending state
  const [pending, setPending] = useState(false)

  // triggers the Convex mutation with our mutation arg
  const mutuationFn = useMutation(mutationToRun)

  // this will be the function we export
  const mutate = (payload: any) => {
    // 1. sets pending
    setPending(true)
    // 2. calls the func with our payload that CALLS the Convex mutation
    return (
      mutuationFn(payload)
        .then(res => {
          return res
        })
        .catch(error => {
          throw error
        })
        // 3. reset pending
        .finally(() => setPending(false))
    )
  }

  // exporting these
  return { mutate, pending }
}
