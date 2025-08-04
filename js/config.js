/**
 * Configuration de l'application Café Parisien
 * Ce fichier contient les paramètres de configuration pour l'application
 */

const CONFIG = {
    // Configuration de la base de données
    DB: {
        // Nom de la base de données dans MongoDB
        NAME: 'cafe_parisien_db',
        // URL de connexion à MongoDB
        URL: 'mongodb://localhost:27017',
        // Collections dans la base de données
        COLLECTIONS: {
            PRODUCTS: 'products',
            ORDERS: 'orders',
            INVOICES: 'invoices',
            STOCK_HISTORY: 'stock_history'
        }
    },
    
    // Configuration de l'application
    APP: {
        // Nom de l'application
        NAME: 'Café Parisien',
        // Version de l'application
        VERSION: '1.0.0',
        // Devise utilisée dans l'application
        CURRENCY: '€',
        // Format de date par défaut
        DATE_FORMAT: 'DD/MM/YYYY',
        // Nombre d'éléments par page pour la pagination
        ITEMS_PER_PAGE: 10
    },
    
    // Seuils et limites
    THRESHOLDS: {
        // Seuil par défaut pour les alertes de stock bas
        DEFAULT_STOCK_ALERT: 5,
        // Montant minimum pour une commande
        MIN_ORDER_AMOUNT: 1.0
    },
    
    // Catégories de produits
    PRODUCT_CATEGORIES: [
        'Boissons chaudes',
        'Boissons froides',
        'Pâtisseries',
        'Snacks',
        'Autres'
    ],
    
    // Statuts pour les commandes
    ORDER_STATUSES: [
        'En attente',
        'En préparation',
        'Terminée',
        'Livrée',
        'Annulée'
    ],
    
    // Statuts pour les factures
    INVOICE_STATUSES: [
        'En attente',
        'Payée',
        'Annulée'
    ]
};

// Exporter la configuration pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}