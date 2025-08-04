/**
 * Module de gestion de la base de données MongoDB
 * Ce module fournit des fonctions pour interagir avec la base de données MongoDB
 * en utilisant l'API IndexedDB comme solution de stockage local
 */

// Base de données IndexedDB qui simule MongoDB pour le stockage côté client
class CafeDB {
    constructor() {
        this.dbName = CONFIG.DB.NAME;
        this.dbVersion = 1;
        this.db = null;
        this.collections = CONFIG.DB.COLLECTIONS;
        this.isInitialized = false;
    }

    /**
     * Initialise la connexion à la base de données
     * @returns {Promise} Une promesse qui se résout lorsque la base de données est prête
     */
    async init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Erreur lors de l\'ouverture de la base de données:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('Base de données ouverte avec succès');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Création des object stores (collections) si elles n'existent pas
                if (!db.objectStoreNames.contains(this.collections.PRODUCTS)) {
                    const productStore = db.createObjectStore(this.collections.PRODUCTS, { keyPath: 'id', autoIncrement: true });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('stock', 'stock', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.collections.ORDERS)) {
                    const orderStore = db.createObjectStore(this.collections.ORDERS, { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('date', 'date', { unique: false });
                    orderStore.createIndex('clientName', 'clientName', { unique: false });
                    orderStore.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.collections.INVOICES)) {
                    const invoiceStore = db.createObjectStore(this.collections.INVOICES, { keyPath: 'id', autoIncrement: true });
                    invoiceStore.createIndex('date', 'date', { unique: false });
                    invoiceStore.createIndex('clientName', 'clientName', { unique: false });
                    invoiceStore.createIndex('status', 'status', { unique: false });
                    invoiceStore.createIndex('orderId', 'orderId', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.collections.STOCK_HISTORY)) {
                    const stockHistoryStore = db.createObjectStore(this.collections.STOCK_HISTORY, { keyPath: 'id', autoIncrement: true });
                    stockHistoryStore.createIndex('date', 'date', { unique: false });
                    stockHistoryStore.createIndex('productId', 'productId', { unique: false });
                    stockHistoryStore.createIndex('type', 'type', { unique: false });
                }

                console.log('Base de données mise à jour avec succès');
            };
        });
    }

    /**
     * Insère un document dans une collection
     * @param {string} collectionName - Nom de la collection
     * @param {Object} document - Document à insérer
     * @returns {Promise} Une promesse qui se résout avec l'ID du document inséré
     */
    async insertOne(collectionName, document) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readwrite');
            const store = transaction.objectStore(collectionName);

            // Ajouter un timestamp de création
            document.createdAt = new Date().toISOString();
            document.updatedAt = new Date().toISOString();

            const request = store.add(document);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error('Erreur lors de l\'insertion du document:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Met à jour un document dans une collection
     * @param {string} collectionName - Nom de la collection
     * @param {number} id - ID du document à mettre à jour
     * @param {Object} updates - Champs à mettre à jour
     * @returns {Promise} Une promesse qui se résout lorsque la mise à jour est terminée
     */
    async updateOne(collectionName, id, updates) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readwrite');
            const store = transaction.objectStore(collectionName);

            const getRequest = store.get(id);

            getRequest.onsuccess = (event) => {
                const data = event.target.result;
                if (!data) {
                    reject(new Error(`Document avec l'ID ${id} non trouvé`));
                    return;
                }

                // Mettre à jour les champs
                const updatedData = { ...data, ...updates, updatedAt: new Date().toISOString() };

                const updateRequest = store.put(updatedData);

                updateRequest.onsuccess = () => {
                    resolve(updatedData);
                };

                updateRequest.onerror = (event) => {
                    console.error('Erreur lors de la mise à jour du document:', event.target.error);
                    reject(event.target.error);
                };
            };

            getRequest.onerror = (event) => {
                console.error('Erreur lors de la récupération du document:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Supprime un document d'une collection
     * @param {string} collectionName - Nom de la collection
     * @param {number} id - ID du document à supprimer
     * @returns {Promise} Une promesse qui se résout lorsque la suppression est terminée
     */
    async deleteOne(collectionName, id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readwrite');
            const store = transaction.objectStore(collectionName);

            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('Erreur lors de la suppression du document:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère un document par son ID
     * @param {string} collectionName - Nom de la collection
     * @param {number} id - ID du document à récupérer
     * @returns {Promise} Une promesse qui se résout avec le document trouvé
     */
    async findById(collectionName, id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readonly');
            const store = transaction.objectStore(collectionName);

            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };

            request.onerror = (event) => {
                console.error('Erreur lors de la récupération du document:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère tous les documents d'une collection
     * @param {string} collectionName - Nom de la collection
     * @returns {Promise} Une promesse qui se résout avec un tableau de documents
     */
    async findAll(collectionName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readonly');
            const store = transaction.objectStore(collectionName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error('Erreur lors de la récupération des documents:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Recherche des documents selon des critères
     * @param {string} collectionName - Nom de la collection
     * @param {Object} query - Critères de recherche
     * @returns {Promise} Une promesse qui se résout avec un tableau de documents correspondants
     */
    async find(collectionName, query = {}) {
        const allDocuments = await this.findAll(collectionName);

        // Filtrer les documents selon les critères de recherche
        return allDocuments.filter(doc => {
            for (const [key, value] of Object.entries(query)) {
                // Vérifier si la valeur est un objet avec des opérateurs
                if (typeof value === 'object' && value !== null) {
                    // Opérateurs de comparaison
                    if ('$gt' in value && !(doc[key] > value.$gt)) return false;
                    if ('$gte' in value && !(doc[key] >= value.$gte)) return false;
                    if ('$lt' in value && !(doc[key] < value.$lt)) return false;
                    if ('$lte' in value && !(doc[key] <= value.$lte)) return false;
                    if ('$ne' in value && doc[key] === value.$ne) return false;
                    if ('$in' in value && !value.$in.includes(doc[key])) return false;
                    if ('$nin' in value && value.$nin.includes(doc[key])) return false;
                } else {
                    // Égalité simple
                    if (doc[key] !== value) return false;
                }
            }
            return true;
        });
    }

    /**
     * Compte le nombre de documents dans une collection
     * @param {string} collectionName - Nom de la collection
     * @param {Object} query - Critères de recherche (optionnel)
     * @returns {Promise} Une promesse qui se résout avec le nombre de documents
     */
    async count(collectionName, query = {}) {
        const documents = await this.find(collectionName, query);
        return documents.length;
    }

    /**
     * Vérifie si un document existe
     * @param {string} collectionName - Nom de la collection
     * @param {Object} query - Critères de recherche
     * @returns {Promise} Une promesse qui se résout avec un booléen
     */
    async exists(collectionName, query) {
        const count = await this.count(collectionName, query);
        return count > 0;
    }

    /**
     * Supprime tous les documents d'une collection
     * @param {string} collectionName - Nom de la collection
     * @returns {Promise} Une promesse qui se résout lorsque la suppression est terminée
     */
    async deleteAll(collectionName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collectionName], 'readwrite');
            const store = transaction.objectStore(collectionName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('Erreur lors de la suppression de tous les documents:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Génère un ID unique pour un document
     * @returns {string} Un ID unique
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Ferme la connexion à la base de données
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isInitialized = false;
            console.log('Connexion à la base de données fermée');
        }
    }
}

// Créer une instance de la base de données
const db = new CafeDB();

// Initialiser la base de données au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    db.init().then(() => {
        console.log('Base de données initialisée');
        // Initialiser les données de démonstration si nécessaire
        initDemoData();
    }).catch(error => {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
    });
});

/**
 * Initialise des données de démonstration dans la base de données
 */
async function initDemoData() {
    try {
        // Vérifier si des produits existent déjà
        const productsCount = await db.count(CONFIG.DB.COLLECTIONS.PRODUCTS);
        
        if (productsCount === 0) {
            console.log('Initialisation des données de démonstration...');
            
            // Ajouter des produits de démonstration
            const demoProducts = [
                {
                    name: 'Café Expresso',
                    category: 'Boissons chaudes',
                    price: 2.50,
                    cost: 0.80,
                    stock: 100,
                    threshold: 20,
                    description: 'Café expresso intense et aromatique'
                },
                {
                    name: 'Café Latte',
                    category: 'Boissons chaudes',
                    price: 3.50,
                    cost: 1.20,
                    stock: 80,
                    threshold: 15,
                    description: 'Café au lait onctueux'
                },
                {
                    name: 'Thé Vert',
                    category: 'Boissons chaudes',
                    price: 3.00,
                    cost: 0.90,
                    stock: 50,
                    threshold: 10,
                    description: 'Thé vert bio aux notes délicates'
                },
                {
                    name: 'Chocolat Chaud',
                    category: 'Boissons chaudes',
                    price: 4.00,
                    cost: 1.50,
                    stock: 40,
                    threshold: 8,
                    description: 'Chocolat chaud crémeux'
                },
                {
                    name: 'Jus d\'Orange',
                    category: 'Boissons froides',
                    price: 3.50,
                    cost: 1.20,
                    stock: 30,
                    threshold: 5,
                    description: 'Jus d\'orange frais pressé'
                },
                {
                    name: 'Eau Minérale',
                    category: 'Boissons froides',
                    price: 2.00,
                    cost: 0.50,
                    stock: 100,
                    threshold: 20,
                    description: 'Eau minérale naturelle'
                },
                {
                    name: 'Croissant',
                    category: 'Pâtisseries',
                    price: 1.80,
                    cost: 0.60,
                    stock: 25,
                    threshold: 5,
                    description: 'Croissant pur beurre'
                },
                {
                    name: 'Pain au Chocolat',
                    category: 'Pâtisseries',
                    price: 2.00,
                    cost: 0.70,
                    stock: 20,
                    threshold: 5,
                    description: 'Pain au chocolat pur beurre'
                },
                {
                    name: 'Sandwich Jambon-Fromage',
                    category: 'Snacks',
                    price: 5.50,
                    cost: 2.00,
                    stock: 15,
                    threshold: 3,
                    description: 'Sandwich avec jambon et fromage'
                },
                {
                    name: 'Salade César',
                    category: 'Snacks',
                    price: 7.50,
                    cost: 3.00,
                    stock: 10,
                    threshold: 2,
                    description: 'Salade César avec poulet grillé'
                }
            ];
            
            for (const product of demoProducts) {
                await db.insertOne(CONFIG.DB.COLLECTIONS.PRODUCTS, product);
            }
            
            console.log('Données de démonstration initialisées avec succès');
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des données de démonstration:', error);
    }
}

// Exporter la base de données pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = db;
}