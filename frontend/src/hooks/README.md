# React Hooks

Custom React hooks for the Legal RAG System frontend.

## Available Hooks

### useSummarizationStreaming

Real-time document summarization using Server-Sent Events (SSE).

**File:** `useSummarizationStreaming.ts`

**Usage:**
```tsx
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

function MyComponent() {
  const { content, status, startStreaming, stopStreaming } = useSummarizationStreaming();

  return (
    <div>
      <button onClick={() => startStreaming({ documentId: '123', level: 'standard' })}>
        Summarize
      </button>
      <div>{content}</div>
    </div>
  );
}
```

**Features:**
- SSE streaming support
- Automatic reconnection
- Cancellation support
- Error handling
- TypeScript support
- Clean cleanup on unmount

**See also:**
- [Full Documentation](./useSummarizationStreaming.md)
- [Example Component](../components/SummarizationStreamingExample.tsx)
- [Demo Page](../app/summarization-demo/page.tsx)
- [Type Definitions](../types/summarization.types.ts)

## Hook Patterns

All custom hooks in this directory follow these conventions:

1. **Naming**: Use `use` prefix (e.g., `useSummarizationStreaming`)
2. **TypeScript**: Full type definitions with exported interfaces
3. **Cleanup**: Proper cleanup in useEffect return functions
4. **Error Handling**: Comprehensive error states and messages
5. **Documentation**: JSDoc comments and separate .md files
6. **Testing**: Corresponding .test.ts files

## Creating New Hooks

When creating a new custom hook:

1. Create the hook file: `useMyHook.ts`
2. Export TypeScript interfaces
3. Add JSDoc documentation
4. Create test file: `useMyHook.test.ts`
5. Create documentation: `useMyHook.md`
6. Add example usage in comments
7. Update this README

## Testing

Run tests for all hooks:

```bash
npm test src/hooks
```

Run tests for specific hook:

```bash
npm test useSummarizationStreaming
```

## Best Practices

### 1. Use TypeScript

```typescript
interface UseMyHookReturn {
  data: string;
  isLoading: boolean;
  error: Error | null;
}

export function useMyHook(): UseMyHookReturn {
  // Implementation
}
```

### 2. Cleanup Resources

```typescript
export function useMyHook() {
  useEffect(() => {
    const subscription = subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
```

### 3. Memoize Callbacks

```typescript
export function useMyHook() {
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  return { handleClick };
}
```

### 4. Handle Errors

```typescript
export function useMyHook() {
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      // Fetch logic
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  return { error };
}
```

### 5. Provide Loading States

```typescript
export function useMyHook() {
  const [isLoading, setIsLoading] = useState(false);

  const performAction = async () => {
    setIsLoading(true);
    try {
      // Action logic
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading };
}
```

## Common Hooks to Add

Consider implementing these common hook patterns:

- `useDebounce` - Debounce value changes
- `useLocalStorage` - Persist state to localStorage
- `useMediaQuery` - Responsive breakpoint detection
- `useClickOutside` - Detect clicks outside element
- `useKeyPress` - Detect specific key presses
- `useIntersectionObserver` - Lazy loading and visibility
- `usePrevious` - Access previous prop/state value
- `useAsync` - Handle async operations
- `useForm` - Form state management
- `useAuth` - Authentication state

## Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Testing Library Hooks](https://react-hooks-testing-library.com/)
- [TypeScript React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks)
