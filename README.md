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

La partie interface peut être publiée avec la commande de build `pnpm build` et le répertoire de publication `dist/public`. Le fichier `netlify.toml` prépare cette configuration. Cependant, l’inscription, la validation administrative et les sessions utilisent le serveur Node et la base de données du projet : pour les conserver sur Netlify, il faudra porter ces procédures vers des Netlify Functions et relier une base de données compatible. En attendant, déployez cette application complète sur un hébergement Node compatible avec la base de données, ou publiez l’interface seule sur Netlify.

Pour le déploiement depuis GitHub, créez un dépôt, poussez ce code, puis créez un nouveau site dans Netlify en sélectionnant le dépôt. Pour une application avec données réelles, ne conservez jamais les codes secrets ou informations financières seulement dans le navigateur : activez une base de données et des règles d’accès côté serveur avant l’ouverture à tous les membres.

## Décisions produit

Le pointage est facultatif et n’est pas une sanction. Il est uniquement visible le jeudi de 21 h à 23 h 59 et sert à observer la régularité de manière bienveillante. Le Goudi Adjouma est suggéré automatiquement, mais l’administrateur peut toujours confirmer ou modifier le choix.
