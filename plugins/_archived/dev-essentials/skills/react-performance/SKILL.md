---
name: react-performance
description: Performance rules for React/Next.js. Use when reviewing or writing code.
---

# React Performance Rules

Apply these rules when writing or reviewing React/Next.js code.

## CRITICAL: Fix These First

### 1. Parallelize Async Operations

```tsx
// BAD: Sequential (3s total)
const user = await getUser();
const posts = await getPosts();
const comments = await getComments();

// GOOD: Parallel (1s total)
const [user, posts, comments] = await Promise.all([
  getUser(),
  getPosts(),
  getComments()
]);
```

### 2. Avoid Barrel Imports

```tsx
// BAD: Imports entire library
import { Button, Input } from '@/components';
import { Search } from 'lucide-react';

// GOOD: Direct imports
import { Button } from '@/components/ui/button';
import Search from 'lucide-react/dist/esm/icons/search';
```

### 3. Dynamic Import Heavy Components

```tsx
// BAD: Always loaded
import { Chart } from 'recharts';

// GOOD: Loaded on demand
const Chart = dynamic(() => import('recharts').then(m => m.Chart), {
  loading: () => <Skeleton />,
  ssr: false
});
```

## HIGH: Should Fix

### 4. Minimize Data to Client Components

```tsx
// BAD: Passes entire object
<ClientComponent user={user} />

// GOOD: Pass only needed fields
<ClientComponent userName={user.name} userAvatar={user.avatar} />
```

### 5. Use Suspense Boundaries

```tsx
// GOOD: Independent loading
<Suspense fallback={<UserSkeleton />}>
  <UserProfile />
</Suspense>
<Suspense fallback={<PostsSkeleton />}>
  <Posts />
</Suspense>
```

### 6. Cache Repeated Fetches

```tsx
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

## MEDIUM: Nice to Have

### 7. Lazy State Initialization

```tsx
// BAD: Runs every render
const [data] = useState(expensiveComputation());

// GOOD: Runs once
const [data] = useState(() => expensiveComputation());
```

### 8. Use Transitions for Heavy Updates

```tsx
const [isPending, startTransition] = useTransition();

const handleFilter = (value: string) => {
  startTransition(() => {
    setFilter(value); // Won't block input
  });
};
```

### 9. Memoize Expensive Calculations

```tsx
const sortedItems = useMemo(
  () => items.toSorted((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

## Quick Checklist

- [ ] No sequential awaits that could be parallel
- [ ] No barrel imports from large libraries
- [ ] Heavy components use dynamic imports
- [ ] Client components receive minimal data
- [ ] Suspense boundaries for independent data
- [ ] useMemo for expensive computations
