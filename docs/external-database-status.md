# État de la base de production

Le 27 août 2026, une instance **TiDB Cloud Starter** nommée `dahira-manager-prod` a été créée dans la région AWS N. Virginia (`us-east-1`) pour l’application Dahira Manager. Son plafond de dépenses mensuel est réglé à **0 $**, afin de limiter l’usage au quota gratuit.

L’instance est active. La chaîne de connexion reste confidentielle : elle ne doit jamais être enregistrée dans ce dépôt, dans un fichier `.env` suivi par Git, ni dans une discussion. La prochaine étape consiste à créer le schéma de l’application, puis à enregistrer cette chaîne uniquement dans les variables d’environnement sécurisées de Netlify.

Le schéma MySQL `dahira_manager` a été créé avec succès dans cette instance. Il est isolé des schémas système TiDB et prêt à recevoir les migrations de l’application.

La création du schéma a été confirmée dans l’éditeur SQL TiDB Cloud. Les tables de l’application n’ont pas encore été appliquées à cette étape.

Le schéma `dahira_manager` est désormais sélectionné dans l’éditeur SQL. Les identifiants de connexion ont été générés dans la console TiDB Cloud et seront utilisés uniquement dans une variable d’environnement sécurisée, avec TLS obligatoire.

L’initialisation des tables est en cours. L’éditeur SQL limite la taille de certaines saisies automatisées ; les migrations sont donc appliquées dans un format compact et contrôlé, table par table, avec vérification après chaque exécution.

La table `memberAccounts`, qui porte les inscriptions, rôles et validations administrateur, a été créée avec succès.

La table `memberSessions`, qui stocke les sessions sécurisées de connexion, a également été créée avec succès.

La table `attendanceRecords`, utilisée par le pointage volontaire du jeudi, a été créée avec succès.

La table `contributions`, utilisée pour les cotisations mensuelles et leur statut, a été créée avec succès.

La table `goudiEvents`, qui gère la programmation et la rotation des Goudi Adjouma, a été créée avec succès.

La table `treasuryTransactions`, qui porte les entrées et sorties de caisse, a été créée avec succès.

Les champs de responsabilité, d’activité et d’ordre de rotation ont été ajoutés avec succès à `memberAccounts`.

La table `webPushSettings`, qui stocke les clés techniques des notifications web, a été créée avec succès.

La table `webPushSubscriptions`, qui relie les navigateurs des membres à leurs notifications web, a été créée avec succès. Les tables métier nécessaires aux inscriptions, cotisations, caisse, Goudi, pointage et notifications sont maintenant initialisées dans le schéma de production.

Une requête de contrôle `SHOW TABLES` a confirmé la présence de huit tables applicatives : `memberAccounts`, `memberSessions`, `contributions`, `treasuryTransactions`, `goudiEvents`, `attendanceRecords`, `webPushSettings` et `webPushSubscriptions`. La table historique `users`, prévue pour l’ancienne connexion Manus OAuth, n’est pas requise par la fonction Netlify autonome et n’a donc pas été créée.

L’accès au projet Netlify `dahira-manager` a été confirmé. La variable secrète de production `DATABASE_URL` est préparée dans les paramètres du projet ; elle sera enregistrée uniquement dans Netlify, avec la portée des fonctions, et jamais dans le dépôt GitHub.

La variable `DATABASE_URL` a été enregistrée avec succès comme secret Netlify, avec les portées **Builds**, **Functions** et **Runtime**, et une valeur réservée au contexte de production. Son contenu est masqué dans l’interface Netlify.

Après redéploiement, un test tRPC d’inscription a reçu une réponse HTTP 200 et a confirmé l’écriture dans TiDB Cloud. Le compte technique créé exclusivement pour ce contrôle est en cours de suppression afin de laisser la base vierge pour le premier administrateur réel du Dahira.

Le premier essai de suppression a été refusé par l’éditeur TiDB Cloud car le schéma n’était pas sélectionné après la reconnexion. Le compte technique n’a donc pas été supprimé à ce stade ; le nettoyage est repris avec une instruction qui sélectionne explicitement le schéma.

L’éditeur a conservé son état « No database selected » après l’instruction `USE`. La suppression est donc reprise avec le nom de table entièrement qualifié (`dahira_manager.memberAccounts`), ce qui ne dépend pas de la sélection visuelle d’un schéma.

La suppression qualifiée a réussi et a retiré exactement un compte technique. La base est de nouveau vierge de comptes membres : le premier compte réel créé dans l’application recevra donc bien le rôle administrateur.
