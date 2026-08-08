# Sport Tracker

Sport Tracker est une application personnelle de suivi de musculation conçue pour un hébergement web classique comme un serveur mutualisé OVH.

L’application utilise JavaScript, PHP et MySQL/MariaDB. Elle ne nécessite ni Node.js ni processus permanent sur le serveur.

## Fonctionnalités

- bibliothèque d’exercices et groupes musculaires ;
- séances types avec séries, répétitions, charges et temps de repos ;
- programmes et planning hebdomadaire récurrent ;
- plusieurs variantes de séance pour une même journée ;
- saisie des séries avec charge, répétitions, RIR et RPE ;
- infobulles expliquant les termes techniques ;
- historique complet et records par exercice ;
- tracking Chart.js de la charge, du volume et du 1RM estimé ;
- mesures corporelles et récupération facultatives ;
- interface responsive avec thèmes clair et sombre.

## Gestion automatique du planning

Au chargement du tableau de bord ou de la semaine, les journées planifiées antérieures à aujourd’hui sont automatiquement marquées « Non réalisée » lorsqu’aucun autre statut n’existe.

Cette automatisation fonctionne pendant une requête normale : aucun cron OVH n’est nécessaire. Une séance passée ne peut être démarrée ni depuis l’interface ni directement depuis l’API.

## Séances imprévues

Le bouton « Séance imprévue », disponible sur le tableau de bord et la semaine, lance aujourd’hui une séance type qui n’était pas prévue.

Une séance imprévue :

- apparaît dans l’historique avec le badge « Imprévue » ;
- compte dans les statistiques hebdomadaires ;
- alimente les records et le tracking ;
- ne remplace pas et ne valide pas la séance initialement planifiée.

Le bouton « Lancer » de la page « Séances types » crée également une séance imprévue.

## Prérequis

- PHP 8.0 ou plus récent ;
- MySQL 8 ou MariaDB 10.3 ou plus récent ;
- Apache avec `mod_rewrite` ;
- extension PHP PDO MySQL ;
- HTTPS recommandé.

Chart.js est chargé depuis jsDelivr. Le navigateur doit pouvoir accéder à ce CDN.

## Nouvelle installation sur OVH

1. Créer une base MySQL depuis l’espace client OVH.
2. Importer `database/schema.sql` avec phpMyAdmin.
3. Copier `api/config.php.example` vers `api/config.php`.
4. Renseigner les identifiants MySQL fournis par OVH dans `api/config.php`.
5. Transférer tous les fichiers dans le répertoire web, généralement `www`.
6. Vérifier que `.htaccess` a bien été transféré.
7. Ouvrir le domaine ou sous-domaine associé.

Exemple de configuration :

```php
<?php
return [
    'db' => [
        'host' => 'serveur-mysql.mysql.db',
        'name' => 'nom_de_la_base',
        'user' => 'utilisateur',
        'pass' => 'mot_de_passe',
        'charset' => 'utf8mb4',
    ],
    'cors' => [
        'enabled' => false,
        'allow_origin' => '*',
    ],
];
```

Ne publie jamais le contenu réel de `api/config.php`. Ce fichier est ignoré par Git.

## Mise à jour d’une installation existante

Pour une base installée avant l’ajout des séances imprévues :

1. sauvegarder la base ;
2. importer `database/migrations/2026-08-08-unplanned-sessions.sql` avec phpMyAdmin ;
3. transférer les nouveaux fichiers.

Ne lance pas cette migration sur une base créée avec la version actuelle de `database/schema.sql` : la colonne est déjà présente.

## Structure

```text
api/                 API REST et connexion PDO
assets/css/          styles
assets/js/           pages, composants et services JavaScript
database/schema.sql  schéma complet d’une nouvelle installation
database/migrations/ migrations des installations existantes
index.html           point d’entrée
.htaccess            réécriture des routes API
```

## Données et sauvegardes

Les données sportives sont stockées dans MySQL. Effectue régulièrement une sauvegarde depuis phpMyAdmin ou l’espace client OVH, notamment avant une migration.

Modifier un programme ou une séance type ne supprime pas les performances existantes : les informations utiles sont copiées dans chaque séance lors de son démarrage.
