# React Performance Skill

When writing or reviewing React/Next.js code, apply these 40+ optimization rules prioritized by impact.

> Adapted from [Vercel's react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)

## CRITICAL: Eliminating Waterfalls

Waterfalls are the #1 performance killer. Sequential awaits block unnecessarily.

### Rule 1: Defer Awaits Until Needed
```tsx
// BAD: Blocks immediately
async function Page() {
  const data = await fetchData(); // blocks here
  return <Component data={data} />;
}

// GOOD: Start fetch, await later
async function Page() {
  const dataPromise = fetchData(); // starts immediately
  return <Component dataPromise={dataPromise} />;
}
```

### Rule 2: Parallelize Independent Operations
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

### Rule 3: Strategic Suspense Boundaries
```tsx
// GOOD: Independent loading states
<Suspense fallback={<UserSkeleton />}>
  <UserProfile />
</Suspense>
<Suspense fallback={<PostsSkeleton />}>
  <UserPosts />
</Suspense>
```

## CRITICAL: Bundle Size Optimization

### Rule 4: Avoid Barrel File Imports
```tsx
// BAD: Imports entire library (200-800ms penalty)
import { Button, Input } from '@/components';
import { Search } from 'lucide-react';

// GOOD: Direct imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Search from 'lucide-react/dist/esm/icons/search';
```

### Rule 5: Configure optimizePackageImports
```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react']
  }
}
```

### Rule 6: Dynamic Imports for Heavy Components
```tsx
// BAD: Always loaded
import { Chart } from 'recharts';

// GOOD: Loaded on demand
const Chart = dynamic(() => import('recharts').then(m => m.Chart), {
  loading: () => <ChartSkeleton />,
  ssr: false
});
```

### Rule 7: Conditional Module Loading
```tsx
// GOOD: Only load when needed
const getAnalytics = () => import('heavy-analytics-lib');

function trackEvent(event: string) {
  if (process.env.NODE_ENV === 'production') {
    getAnalytics().then(m => m.track(event));
  }
}
```

### Rule 8: Preload on User Intent
```tsx
// GOOD: Preload on hover
<Link
  href="/dashboard"
  onMouseEnter={() => import('./DashboardPage')}
>
  Dashboard
</Link>
```

## HIGH: Server-Side Performance

### Rule 9: Use React.cache() for Deduplication
```tsx
// GOOD: Same request deduplicated across components
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

### Rule 10: LRU Caching for Expensive Operations
```tsx
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, Data>({ max: 100, ttl: 60000 });

export async function getData(key: string) {
  if (cache.has(key)) return cache.get(key)!;
  const data = await expensiveFetch(key);
  cache.set(key, data);
  return data;
}
```

### Rule 11: Minimize RSC Serialization
```tsx
// BAD: Passes entire object
<ClientComponent user={user} />

// GOOD: Pass only needed fields
<ClientComponent userName={user.name} userAvatar={user.avatar} />
```

### Rule 12: Use after() for Non-Blocking Operations
```tsx
import { after } from 'next/server';

export async function POST(request: Request) {
  const data = await saveData(request);

  // Runs after response is sent
  after(async () => {
    await sendNotification(data.id);
    await updateAnalytics();
  });

  return Response.json(data);
}
```

## MEDIUM-HIGH: Re-render Optimization

### Rule 13: Defer Non-Critical State Updates
```tsx
// GOOD: Low-priority update
import { useDeferredValue } from 'react';

function Search({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  return <Results query={deferredQuery} />;
}
```

### Rule 14: Functional setState for Previous Value
```tsx
// BAD: Stale closure risk
setCount(count + 1);

// GOOD: Always current
setCount(prev => prev + 1);
```

### Rule 15: Lazy State Initialization
```tsx
// BAD: Runs every render
const [data, setData] = useState(expensiveComputation());

// GOOD: Runs once
const [data, setData] = useState(() => expensiveComputation());
```

### Rule 16: Use Transitions for Non-Urgent Updates
```tsx
import { useTransition } from 'react';

function FilteredList() {
  const [isPending, startTransition] = useTransition();

  const handleFilter = (value: string) => {
    startTransition(() => {
      setFilter(value); // Won't block input
    });
  };
}
```

### Rule 17: Memoize Expensive Computations
```tsx
// GOOD: Only recalculates when deps change
const sortedItems = useMemo(
  () => items.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

## MEDIUM: Rendering Performance

### Rule 18: Wrap Animated SVGs
```tsx
// GOOD: Isolates repaints
function AnimatedIcon() {
  return (
    <div className="will-change-transform">
      <AnimatedSVG />
    </div>
  );
}
```

### Rule 19: Use content-visibility for Long Lists
```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### Rule 20: Hoist Static JSX
```tsx
// BAD: Recreated every render
function Component() {
  const header = <Header title="Static" />;
  return <div>{header}</div>;
}

// GOOD: Created once
const header = <Header title="Static" />;
function Component() {
  return <div>{header}</div>;
}
```

## MEDIUM: JavaScript Performance

### Rule 21: Batch DOM Operations
```tsx
// BAD: Multiple reflows
items.forEach(item => {
  const el = document.createElement('div');
  container.appendChild(el);
});

// GOOD: Single reflow
const fragment = document.createDocumentFragment();
items.forEach(item => {
  fragment.appendChild(document.createElement('div'));
});
container.appendChild(fragment);
```

### Rule 22: Use Map/Set for Lookups
```tsx
// BAD: O(n) lookup
const found = items.find(item => item.id === targetId);

// GOOD: O(1) lookup
const itemMap = new Map(items.map(item => [item.id, item]));
const found = itemMap.get(targetId);
```

### Rule 23: Immutable Sorting
```tsx
// BAD: Mutates original
items.sort((a, b) => a.name.localeCompare(b.name));

// GOOD: Creates new array
const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name));
// or
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
```

## LOW: Advanced Patterns

### Rule 24: Ref-Based Event Handlers
```tsx
// GOOD: Stable reference, always current value
function useEventCallback<T extends (...args: any[]) => any>(fn: T) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args: Parameters<T>) => ref.current(...args), []);
}
```

### Rule 25: useLatest Hook
```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// Usage: Access current value without re-renders
const latestCount = useLatest(count);
```

## Quick Checklist

When reviewing React code, check for:

- [ ] Sequential awaits that could be parallelized
- [ ] Barrel imports from large libraries
- [ ] Heavy components that should be dynamically imported
- [ ] Missing React.cache() for shared data fetching
- [ ] Large objects passed to client components
- [ ] Missing useMemo/useCallback for expensive operations
- [ ] State updates that could use transitions
- [ ] Missing Suspense boundaries for independent data

## Related Skills

- `component-writing.md` - Visual patterns and styling standards
- `mailerlite-templates.md` - Email component patterns
