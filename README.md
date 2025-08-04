# Site Web de Gestion de Café - Projet Terminé

J'ai créé un site web complet en français pour la gestion d'un café, en utilisant uniquement HTML, CSS et JavaScript avec une simulation de MongoDB via IndexedDB pour le stockage côté client. Le site est entièrement fonctionnel et prêt à être utilisé.

## Fonctionnalités implémentées

### Page d'accueil

- Un tableau de bord affichant les statistiques clés (commandes du jour, stock total, revenus)
- Une section de présentation du café avec ses caractéristiques
- Des alertes pour les produits en rupture de stock

### Gestion des commandes

- Création, modification et suppression de commandes
- Sélection de produits avec calcul automatique des prix
- Suivi du statut des commandes (En attente, En cours, Terminée, Livrée, Annulée)

### Gestion des factures

- Génération de factures à partir des commandes
- Visualisation et impression des factures
- Suivi du statut des paiements (En attente, Payée, Annulée)
- Exportation des factures au format CSV

### Gestion du stock

- Ajout, modification et suppression de produits
- Ajustement des niveaux de stock avec historique des mouvements
- Alertes pour les produits en rupture ou faible quantité
- Filtrage et recherche de produits

## Structure du projet

### Fichiers HTML

- index.html - Page d'accueil avec tableau de bord
- pages/commandes.html - Gestion des commandes
- pages/factures.html - Gestion des factures
- pages/stock.html - Gestion du stock

### Fichiers CSS

- css/style.css - Styles globaux pour toutes les pages

### Fichiers JavaScript

- js/config.js - Configuration de l'application
- js/db.js - Simulation de MongoDB avec IndexedDB
- js/main.js - Fonctionnalités de la page d'accueil
- js/commandes.js - Gestion des commandes
- js/factures.js - Gestion des factures
- js/stock.js - Gestion du stock

## Caractéristiques techniques

- Interface utilisateur responsive et moderne
- Stockage local des données via IndexedDB
- Validation des formulaires côté client
- Modales interactives pour les actions CRUD
- Alertes et notifications pour les actions utilisateur
- Filtrage et recherche dynamiques
  Le site est prêt à être utilisé et peut être facilement étendu avec de nouvelles fonctionnalités si nécessaire. Toutes les pages sont interconnectées et partagent une base de données commune pour assurer la cohérence des données.
