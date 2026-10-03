# Copyable components

Each supported interaction follows the same structure:

```text
components/<category>/<id>/
├── <id>.tsx   # the complete component source
├── index.ts   # named component, preset and type exports
└── README.md  # installation, working example, props and required assets
```

Start with the folder README. Copy its `.tsx` file, install its listed
packages, and preserve any required assets and attribution. The files use
React 19, TypeScript and Tailwind CSS 4; they do not import gallery modules.
See [copy-paste integration](../docs/COPY-PASTE.md) for setup and troubleshooting.

| Category | Folder |
| --- | --- |
| 3D | [3d](3d/) |
| AI | [ai](ai/) |
| Control | [control](control/) |
| Cursor | [cursor](cursor/) |
| Data Visualization | [data-visualization](data-visualization/) |
| Gradient | [gradient](gradient/) |
| Navigation | [navigation](navigation/) |
| Tool | [tool](tool/) |
| Typography | [typography](typography/) |

The gallery shell lives separately in `src/components/website/`. Incomplete
older examples are kept in [archive](../archive/), outside this catalogue.

Folder READMEs and `index.ts` exports are generated from actual source and
registry metadata with `npm run generate:readmes`. CI detects stale output and
compiles each copied component and its README example without gallery aliases
or Next.js type declarations.
