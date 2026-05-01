# DocumentSelector Installation Guide

This guide will help you install all required dependencies for the DocumentSelector component.

## Required Dependencies

The DocumentSelector component requires the following packages:

```bash
npm install @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-icons cmdk
```

### Dependency Overview

1. **@radix-ui/react-popover** - Provides the dropdown/popover functionality
2. **@radix-ui/react-scroll-area** - Custom scrollbar for the document list
3. **@radix-ui/react-icons** - Icons used in the command palette
4. **cmdk** - Command palette component for search and selection

## Installation Steps

### Step 1: Install Dependencies

Run the following command in the frontend directory:

```bash
cd frontend
npm install @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-icons cmdk
```

### Step 2: Verify Installation

After installation, your `package.json` should include:

```json
{
  "dependencies": {
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-icons": "^1.3.0",
    "cmdk": "^0.2.0"
  }
}
```

### Step 3: Import the Component

Once installed, you can import and use the component:

```tsx
import { DocumentSelector } from '@/components/summarization';
```

## Existing Dependencies

The following dependencies are already installed in your project:

- **lucide-react** - For icons (Check, X, ChevronsUpDown)
- **class-variance-authority** - For badge styling
- **tailwind-merge** - For className merging
- **clsx** - For conditional classnames

## Troubleshooting

### Module not found errors

If you see errors like:

```
Module not found: Can't resolve '@radix-ui/react-popover'
```

Make sure you:
1. Ran `npm install` in the correct directory (frontend)
2. Restarted your development server after installation
3. Cleared your build cache: `rm -rf .next`

### TypeScript errors

If you encounter TypeScript errors, ensure you have the latest type definitions:

```bash
npm install --save-dev @types/react @types/react-dom
```

### Build errors

If the build fails, try:

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Version Compatibility

The component is compatible with:

- **React**: 18.x
- **Next.js**: 13.x, 14.x, 15.x
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.x

## Additional Setup

### Tailwind Configuration

Ensure your `tailwind.config.js` includes the components directory:

```js
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of config
}
```

### Path Aliases

The component uses the `@/` path alias. Ensure it's configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Complete Installation Script

For convenience, here's a complete installation script:

```bash
#!/bin/bash

# Navigate to frontend directory
cd frontend

# Install required dependencies
npm install @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-icons cmdk

# Clear build cache
rm -rf .next

# Verify installation
npm list @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-icons cmdk

echo "Installation complete! You can now use the DocumentSelector component."
```

Save this as `install-document-selector.sh` and run:

```bash
chmod +x install-document-selector.sh
./install-document-selector.sh
```

## Next Steps

After installation:

1. Import the component in your page/component
2. Set up state management for document selection
3. Optionally integrate with React Query for API data fetching
4. Customize styling as needed

See `DocumentSelector.md` for usage examples and API documentation.
