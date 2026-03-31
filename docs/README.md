# GitHub Pages Deployment

This folder contains the static site for GitHub Pages deployment.

## Structure

- All examples from `../examples/` copied here
- `dist/` and `src/` copied for ES module imports
- `screenshots/` copied for example previews
- All paths converted from `../` to `./` for root-level deployment

## Deployment

1. Push this folder to GitHub
2. Go to Settings → Pages
3. Select "Deploy from a branch"
4. Choose `main` branch and `/docs` folder
5. Site will be at `https://yourusername.github.io/hotwire-flow/`

## Local Testing

```bash
cd docs
npx http-server . -p 3000
# Open http://localhost:3000/
```
