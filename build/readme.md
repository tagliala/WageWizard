# ⚠️ DEPRECATED - The h5bp ant build script

**This build system has been replaced with a modern pnpm + Vite setup.**

**Please use the new build system instead:**
- Install: `pnpm install`
- Development: `pnpm run dev`  
- Production: `pnpm run build`

See [BUILD.md](../BUILD.md) for complete migration guide.

---

## Original README (deprecated)

# The h5bp ant build script

The build script is a tool that optimizes your code for production use on the web.

## Why use it?

Faster page load times and happy end users :)

## What it does

* Combines and minifies javascript (via yui compressor)
* Inlines stylesheets specified using `@import` in your CSS
* Combines and minifies CSS
* Optimizes JPGs and PNGs (with jpegtran & optipng)
* Removes development only code (any remaining console.log files, profiling, test suite)
* Basic to aggressive html minification (via htmlcompressor)
* Autogenerates a cache manifest file (and links from the `html` tag) when you enable a property in the project config file.
* Revises the file names of your assets so that you can use heavy caching (1 year expires).
* Upgrades the .htaccess to use heavier caching
* Updates your HTML to reference these new hyper-optimized CSS + JS files
* Updates your HTML to use the minified jQuery instead of the development version
* Remove unneeded references from HTML (like a root folder favicon)
* Runs your JavaScript through a code quality tool (optional)
* Optionally precompile LESS formatted CSS
* Optionally output JSDOC3 documentation

<img src="http://html5boilerplate.com/img/chart.png">

## Requirements

Out of the box, the build script requires Java 1.6.

Ant itself requires the Java JDK, version 1.4 or later. 1.5 or later is strongly recommended.

Closure Compiler, our tool for script minification, requires Java 1.6.

This means that OS X versions prior to 10.6 are no longer supported out of the box.
[SoyLatte][soylatte] provides 10.4 and 10.5 builds of OpenJDK 7 for Intel OS X machines. However, only OS X 10.5 builds of OpenJDK 7 are available for PowerPC based Macs due to a bug in the 10.4 Compiler.
( Be sure to read the Download link as the archives are password protected "to provide a click though agreement" of the JDK licensing. )

[soylatte]: http://landonf.bikemonkey.org/static/soylatte/

Alternatively, YUI Compressor, which requires Java > 1.4, could be swapped out for Closure Compiler.
