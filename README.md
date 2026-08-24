# Dahira Manager

Dahira Manager est une application web **mobile-first** destinée à simplifier la gestion d’un Dahira : membres, cotisations, caisse, Goudi Adjouma et présence volontaire.

## Fonctions disponibles dans ce prototype

L’interface comprend un tableau de bord responsive, une navigation adaptée au téléphone, des écrans de membres, cotisations, caisse, Goudi Adjouma et présences. Elle inclut une suggestion d’organisateur suivant une rotation, un créneau de pointage volontaire le jeudi de 21 h à 23 h 59 et un parcours d’inscription par numéro et code secret, soumis à validation administrative.

Les comptes membres sont stockés dans la base de données. Le premier compte créé devient administrateur et est approuvé automatiquement. Les comptes suivants restent en attente jusqu’à validation. Les codes secrets sont hachés côté serveur et les sessions membres sont distinctes de l’authentification Manus intégrée au gabarit.

Les notifications web demandent explicitement l’accord du navigateur. Le manifeste et le service worker permettent d’ajouter l’application à l’écran d’accueil sur les navigateurs compatibles.

## Lancer le projet

```bash
pnpm install
pnpm dev
```

Les contrôles de qualité sont disponibles avec :

```bash
pnpm test
pnpm check
pnpm build
```

## Déploiement Netlify

Le projet contient maintenant une fonction Netlify Express dans `netlify/functions/api.ts`. Le fichier `netlify.toml` publie `dist/public`, construit cette fonction et redirige les appels `/api/*` vers elle. Les inscriptions, comptes approuvés, données financières, Goudi, présences et abonnements Push peuvent ainsi être traités côté serveur sur Netlify.

Avant de déployer, créez une base MySQL ou TiDB accessible depuis Netlify et définissez les variables suivantes dans **Site configuration → Environment variables** :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion MySQL/TiDB utilisée par les comptes et les données du Dahira. |
| `NODE_VERSION` | Définie à `22` dans `netlify.toml`. |

La base doit recevoir les migrations SQL présentes dans `drizzle/` avant la première utilisation. Ne stockez jamais `DATABASE_URL` dans le dépôt GitHub.

Pour le déploiement depuis GitHub, créez un dépôt, poussez ce code, puis créez un nouveau site dans Netlify en sélectionnant le dépôt. Netlify détectera `netlify.toml` et utilisera automatiquement la commande `pnpm build`. Pour une application avec données réelles, ne conservez jamais les codes secrets ou informations financières seulement dans le navigateur : ils sont hachés et les sessions sont placées dans un cookie HttpOnly.

## Décisions produit

Le pointage est facultatif et n’est pas une sanction. Il est uniquement visible le jeudi de 21 h à 23 h 59 et sert à observer la régularité de manière bienveillante. Le Goudi Adjouma est suggéré automatiquement, mais l’administrateur peut toujours confirmer ou modifier le choix.
