# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-04-02

### Added
- Initial release with full React Flow parity
- 18 Stimulus controllers for complete graph editing
- 200+ passing tests (Vitest + Playwright)
- 14 comprehensive examples

### Features
- **Core**: Drag & drop nodes, pan & zoom, multi-select, keyboard shortcuts
- **Edges**: SVG paths (bezier, straight, step, smoothstep), animated edges, arrow markers
- **UI**: Minimap, toolbar, status bar, background patterns, context menu
- **Advanced**: Node resizer (8 handles), node toolbar, panels, auto-layout (DAG)
- **Data API**: Save/load to localStorage, export JSON, toObject/fromObject
- **Interactions**: Connection handles, drag-to-connect, copy/paste, undo/redo

### Fixed
- Arrowhead rendering — correct shape, size, and color matching edge stroke
- Edge visibility and z-index handling
- Node/edge registration lifecycle

## [Unreleased]

### Changed
- Cleaned up docs/ folder structure for GitHub Pages
- Added .playwright-mcp/ to .gitignore
