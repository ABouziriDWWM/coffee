/**
 * Script principal pour la page d'accueil
 * Gère l'affichage des statistiques et des informations sur le tableau de bord
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // S'assurer que la base de données est initialisée
        await db.init();
        
        // Charger les statistiques pour le tableau de bord
        loadDashboardStats();
        
        console.log('Page d\'accueil initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page d\'accueil:', error);
        showError('Une erreur est survenue lors du chargement de la page. Veuillez réessayer.');
    }
});

/**
 * Charge les statistiques pour le tableau de bord
 */
async function loadDashboardStats() {
    try {
        // Récupérer les éléments du DOM
        const commandesJourElement = document.getElementById('commandes-jour');
        const produitsStockElement = document.getElementById('produits-stock');
        const chiffreAffairesElement = document.getElementById('chiffre-affaires');
        
        // Récupérer la date du jour au format ISO (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        
        // Compter les commandes du jour
        const commandes = await db.find(CONFIG.DB.COLLECTIONS.ORDERS, {
            date: today
        });
        commandesJourElement.textContent = commandes.length;
        
        // Compter les produits en stock
        const produits = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        const totalStock = produits.reduce((total, product) => total + product.stock, 0);
        produitsStockElement.textContent = totalStock;
        
        // Calculer le chiffre d'affaires (somme des factures payées)
        const factures = await db.find(CONFIG.DB.COLLECTIONS.INVOICES, {
            status: 'Payée'
        });
        const chiffreAffaires = factures.reduce((total, invoice) => total + invoice.total, 0);
        chiffreAffairesElement.textContent = formatCurrency(chiffreAffaires);
        
        // Vérifier les produits en rupture de stock ou stock bas
        checkLowStockProducts();
        
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        showError('Impossible de charger les statistiques. Veuillez réessayer.');
    }
}

/**
 * Vérifie les produits en rupture de stock ou stock bas
 * et affiche une alerte si nécessaire
 */
async function checkLowStockProducts() {
    try {
        // Récupérer tous les produits
        const produits = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        
        // Filtrer les produits en rupture de stock ou stock bas
        const lowStockProducts = produits.filter(product => 
            product.stock <= product.threshold
        );
        
        // Afficher une alerte si des produits sont en rupture de stock ou stock bas
        if (lowStockProducts.length > 0) {
            const mainElement = document.querySelector('main');
            const alertElement = document.createElement('div');
            alertElement.className = 'alert alert-warning';
            
            if (lowStockProducts.length === 1) {
                alertElement.textContent = `Attention: Le produit "${lowStockProducts[0].name}" est en stock bas (${lowStockProducts[0].stock} restants).`;
            } else {
                alertElement.textContent = `Attention: ${lowStockProducts.length} produits sont en stock bas. Veuillez vérifier la page de stock.`;
            }
            
            // Insérer l'alerte au début de la section principale
            mainElement.insertBefore(alertElement, mainElement.firstChild);
            
            // Faire disparaître l'alerte après 10 secondes
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 10000);
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des stocks:', error);
    }
}

/**
 * Formate un nombre en devise
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté avec le symbole de devise
 */
function formatCurrency(amount) {
    return amount.toFixed(2) + ' ' + CONFIG.APP.CURRENCY;
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function showError(message) {
    // Créer un élément d'alerte
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger';
    alertElement.textContent = message;
    
    // Insérer l'alerte au début de la section principale
    const mainElement = document.querySelector('main');
    mainElement.insertBefore(alertElement, mainElement.firstChild);
    
    // Faire disparaître l'alerte après 5 secondes
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}