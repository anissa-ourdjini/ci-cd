# Pipeline CI/CD - GLesCrocs

Cette pipeline GitHub Actions automatise les tests, la construction des images Docker
et leur publication dans GitHub Container Registry (GHCR).

## Déclencheurs

- `push` sur la branche `main`
- création d'un tag Git
- `pull request` vers `main` pour construire et tester les images sans les publier

## Exécution locale

```bash
npm --prefix frontend test
npm --prefix backend test
docker compose config
docker compose build
```

## Secrets GitHub

Dans **Settings > Secrets and variables > Actions**, ajouter une URL Google Chat sous
l'un de ces noms :

- `CHAT_WEBHOOK` : nom demandé pour ce projet
- `CHAT_WEBHOOK_URL` : nom alternatif pris en charge
- `chat_webhook` : ancien nom pris en charge

La variable n'est pas stockée dans le dépôt. Les branches peuvent contenir les noms
des secrets, mais jamais leur valeur.

## Images Docker

Sur `main`, les images sont publiées avec le tag `dev`.
Sur un tag Git, les images sont publiées avec le tag `production` et le numéro du tag.

- `ghcr.io/<proprietaire>/ci-cd-backend`
- `ghcr.io/<proprietaire>/ci-cd-frontend`
