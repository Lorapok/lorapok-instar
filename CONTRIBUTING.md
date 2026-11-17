# Contributing to Lorapok Instar

Thank you for your interest in contributing to Lorapok Instar! We welcome issues, bug reports, and pull requests from the open-source community.

## Development Workflow

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/lorapok-instar.git
   cd lorapok-instar
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/my-enhancement
   ```
4. Run the local quality gate before pushing:
   ```bash
   ./tools/local-ci.sh
   ```
5. Commit your changes and open a pull request against `main`.

## Standards

- Strict TypeScript (`"strict": true`, zero `any` types).
- Use `WebContentsView` for any view logic (avoid deprecated `<webview>` or `BrowserView`).
- Maintain zero cross-partition leakage between Cocoons.
- Never bypass audio-awareness (`isCurrentlyAudible()`) during hibernation.

For questions, reach out to the Lorapok Labs team at `contact@lorapok.tech`.
