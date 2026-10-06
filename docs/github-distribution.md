# GitHub distribution

AtomicMotion is a design library. All demos are free; source access is free
for most components and purchased for the curated collection.

## Repository boundary

| Repository | Intended visibility | Contents |
| --- | --- | --- |
| `michellesijiama/atomicmotion-ui` | Private | Complete Next.js gallery, all component source, Stripe checkout and delivery routes, build tools |
| `michellesijiama/atomicmotion-free` | Public | Exported free source, dependency instructions, required runtime assets and their notices, a catalog with paid demo/purchase links |

The complete repository has been made private for the design-library release.
Public free releases are published separately with a new Git history.
Website locks cannot hide source committed to a public repository.

Free and paid classification comes from `src/lib/component-offers.ts`.
Do not maintain a second list of paid IDs in GitHub documentation or CI.
Component folders stay together in the complete repository so its live
demos, imports and source delivery continue to build without path changes.

## Prepare the public repository

From the complete repository root:

```bash
npm run export:free
node scripts/export-free-library.mjs --verify .artifacts/atomicmotion-free
```

The output is a fresh, ignored directory, `.artifacts/atomicmotion-free`.
The exporter refuses to overwrite non-empty output; use
`npm run export:free -- --out /absolute/path/to/a/new-empty-folder` for
another release. It uses an allowlist rather than copying the whole tree.

Included: each free component's TSX and entry point, a generated component
README with setup, usage and props, the integration guide, explicitly listed
runtime files, applicable license notices, root README, catalog and a checksum
manifest. The export also contains a pinned dependency verification environment
and its GitHub CI workflow. Preview images are linked from the
website so no full-app source or paid deliverable is needed in this repository.

Excluded: paid source, unregistered experiments, the Next.js application,
checkout code, source bundles, secrets, private tooling, build output and
Git history. The verifier rejects extra files and modified approved files.
Review `ASSETS.md`: the existing wall-shadow and traced lunar artwork notices
still have unresolved attribution/redistribution terms.

After reviewing the generated README and files, create the public repository
from this output with a **new Git history**. Do not fork, mirror, copy `.git`
or push the complete application's branches into it: old commits contain
the paid sources. Initialize Git only after the export verification passes.

## Migration order

1. Prepare and verify the public export locally.
2. Confirm the visibility change for the complete repository. GitHub reports
   that making it private removes stars/watchers and leaves existing public
   forks public. Record these consequences before applying the change.
3. Publish only the verified export to `michellesijiama/atomicmotion-free`
   with fresh history; verify the default branch contains only those files.
4. Free Copy link and Copy for AI URLs default to `atomicmotion-free`.
   Set `NEXT_PUBLIC_FREE_REPO_NAME` only if using another public repository,
   then rebuild the website.
5. Confirm free GitHub source links and paid checkout/source access in a
   PayPal or Stripe sandbox using the [commerce setup](commerce.md).

Do not expose the complete source through GitHub Pages, public CI artifacts,
source maps or a mirrored branch. The gallery needs a server host for Stripe
routes; the public component repository does not host that application.

## Licensing

The current code was released under [MIT](../LICENSE), including the three
components offered through paid delivery. Keep that license with existing
copies. Private visibility and a new public catalog do not revoke permissions
for old releases or remove existing forks. The current paid offer is
convenient delivery through the website, not exclusive ownership of those
already published versions.

For future exclusive paid originals, keep their source in the private
repository from the first commit and give them a separate explicit license
before selling. Do not extend the root MIT notice to those new files or
promise a no-resale restriction for an existing MIT version. Update source
packaging and the purchase license together when adding that release model.

References: [GitHub repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility),
[MIT license permissions](https://choosealicense.com/licenses/mit/).

## Verification

`npm run test:free-export` creates a temporary clean export and checks exact
free source, runtime assets, MIT notice and catalog prices. It also verifies
that extra paid code, paid code hidden in a free filename, environment files
and copied Git history fail publication checks. The complete repository's
CI runs this guard before building and in the verification suite.

`npm run test:free-dependencies` exports into an isolated temporary directory,
runs `npm ci`, and verifies source imports, public exports, README examples,
Tailwind CSS compilation and dependencies without gallery or Next.js packages.
The public repository runs the same checks on every push and pull request.

Public verification package versions are derived from the complete
application's tested lockfile and free component imports. After dependency or
import changes, run `npm run generate:free-lock`, then `npm run check`. Publish
the approved export as a normal commit in the existing public repository;
preserve its independent history. Do not independently copy package files or
push the complete application's history into it.
