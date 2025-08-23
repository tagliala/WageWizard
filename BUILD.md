# WageWizard Modern Build System

WageWizard has been migrated from the ancient Apache Ant build system to a modern **pnpm + Vite** setup.

## Prerequisites

- Node.js 18+ 
- pnpm 8+ (install with `npm install -g pnpm`)

## Installation

```bash
pnpm install
```

## Development

Start the development server:

```bash
pnpm run dev
```

This will start Vite dev server on http://localhost:3000 with:
- Hot Module Replacement (HMR)
- Fast rebuilds
- Modern ES modules

## Building for Production

```bash
pnpm run build
```

This creates optimized, minified assets in the `dist/` directory:
- `dist/js/main.min.js` - All JavaScript bundled and minified
- `dist/css/main.min.css` - All CSS bundled and minified
- Legacy browser support included automatically

## Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run clean` - Clean build artifacts

## Migration Notes

### What Changed
- **Removed**: Apache Ant, Java dependencies, YUI Compressor, Closure Compiler
- **Added**: Vite, modern JavaScript tooling, better development experience
- **Maintained**: Same output structure for PHP compatibility

### Legacy Build System
The old build system in the `/build/` directory is now deprecated. The new system:
- ✅ Uses existing compiled JS/CSS files 
- ✅ Provides modern development experience
- ✅ Creates optimized production builds
- ✅ Maintains compatibility with existing PHP application
- ✅ Supports legacy browsers with polyfills

### File Structure
- Source files: `src/main.js` (entry point)
- Compiled assets: `js/` and `css/` directories (unchanged)
- Build output: `dist/` directory
- Development: `dev.html` for testing

The PHP application (`index.php`) continues to work as before, but you can now:
1. Use the new build system for development (`pnpm run dev`)
2. Generate optimized assets for production (`pnpm run build`)
3. Integrate the optimized assets into the PHP application as needed