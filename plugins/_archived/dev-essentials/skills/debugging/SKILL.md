---
name: debugging
description: Structured debugging approach. Use when fixing errors.
---

# Debugging Skill

Structured approach to fixing errors fast.

## Debug Template

When you have an error, provide:

```
Error: [Full error message with stack trace]

File: [file path]
Line: [line number]

What I was doing: [one sentence]

Code:
[paste relevant code]

Already tried:
- [what you tried]
```

## Common React/Next.js Errors

### "Cannot read properties of undefined"

**Cause**: Accessing property on null/undefined

```tsx
// BAD
{user.name} // crashes if user is null

// FIX
{user?.name}

// BETTER: Handle loading state
if (!user) return <Skeleton />;
return <div>{user.name}</div>;
```

### "Hydration mismatch"

**Cause**: Server and client render different content

```tsx
// BAD: Different on server vs client
<p>{new Date().toLocaleString()}</p>

// FIX: Use client component or suppress
'use client';
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### "Invalid hook call"

**Causes**:
- Hook inside condition or loop
- Multiple React versions
- Hook not at top level

```tsx
// BAD
if (condition) {
  const [state] = useState();
}

// GOOD
const [state] = useState();
if (condition) {
  // use state here
}
```

### "Objects are not valid as React child"

**Cause**: Rendering object instead of string

```tsx
// BAD
<p>{user}</p>

// FIX
<p>{user.name}</p>
// or
<p>{JSON.stringify(user)}</p>
```

## Debug Checklist

1. [ ] Read the FULL error message
2. [ ] Check the stack trace for YOUR code
3. [ ] Add console.log before the error
4. [ ] Check for null/undefined
5. [ ] Check for typos in property names
6. [ ] Check imports are correct
7. [ ] Clear cache and restart dev server
