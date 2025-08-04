/**
 * Module de gestion du stock
 * Ce module fournit des fonctions pour gérer les produits et le stock
 */

// Variables globales
let currentProductId = null;
let products = [];
let stockHistory = [];

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialiser la base de données
        await db.init();
        
        // Charger les produits et l'historique du stock
        await loadProducts();
        await loadStockHistory();
        
        // Initialiser les écouteurs d'événements
        initEventListeners();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showAlert('Une erreur est survenue lors du chargement des données.', 'error');
    }
});

/**
 * Charge les produits depuis la base de données
 */
async function loadProducts() {
    try {
        products = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        displayProducts(products);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showAlert('Impossible de charger les produits.', 'error');
    }
}

/**
 * Charge l'historique des mouvements de stock
 */
async function loadStockHistory() {
    try {
        stockHistory = await db.findAll(CONFIG.DB.COLLECTIONS.STOCK_HISTORY);
        stockHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        displayStockHistory(stockHistory);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique du stock:', error);
        showAlert('Impossible de charger l\'historique du stock.', 'error');
    }
}

/**
 * Initialise les écouteurs d'événements
 */
function initEventListeners() {
    // Bouton pour ajouter un produit
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
    
    // Boutons d'exportation et d'importation
    document.getElementById('export-products-btn').addEventListener('click', exportProducts);
    document.getElementById('import-products-btn').addEventListener('click', importProducts);
    
    // Filtres
    document.getElementById('filter-btn').addEventListener('click', applyFilters);
    document.getElementById('filter-category').addEventListener('change', applyFilters);
    document.getElementById('filter-stock').addEventListener('change', applyFilters);
    document.getElementById('search-product').addEventListener('input', searchProducts);
    
    // Formulaire de produit
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', handleProductSubmit);
    document.getElementById('cancel-btn').addEventListener('click', closeProductModal);
    
    // Formulaire d'ajustement de stock
    const adjustStockForm = document.getElementById('adjust-stock-form');
    adjustStockForm.addEventListener('submit', handleStockAdjustment);
    document.getElementById('cancel-adjust-btn').addEventListener('click', closeAdjustStockModal);
    
    // Modal de confirmation de suppression
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteProduct);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
    
    // Fermeture des modals
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
}

/**
 * Affiche les produits dans le tableau
 * @param {Array} productsToDisplay - Liste des produits à afficher
 */
function displayProducts(productsToDisplay) {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="8" class="text-center">Aucun produit trouvé</td>';
        productsList.appendChild(emptyRow);
        return;
    }
    
    productsToDisplay.forEach(product => {
        const row = document.createElement('tr');
        
        // Déterminer la classe CSS en fonction du niveau de stock
        let stockClass = '';
        if (product.stock <= 0) {
            stockClass = 'stock-out';
        } else if (product.stock <= product.threshold) {
            stockClass = 'stock-low';
        } else if (product.stock <= product.threshold * 2) {
            stockClass = 'stock-medium';
        } else {
            stockClass = 'stock-high';
        }
        
        // Déterminer le statut du stock
        let stockStatus = '';
        if (product.stock <= 0) {
            stockStatus = 'Rupture';
        } else if (product.stock <= product.threshold) {
            stockStatus = 'Bas';
        } else if (product.stock <= product.threshold * 2) {
            stockStatus = 'Moyen';
        } else {
            stockStatus = 'Bon';
        }
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td class="${stockClass}">${product.stock}</td>
            <td>${product.threshold}</td>
            <td class="${stockClass}">${stockStatus}</td>
            <td>
                <button class="btn-icon adjust-stock" data-id="${product.id}" title="Ajuster le stock">
                    <i class="fas fa-boxes"></i>
                </button>
                <button class="btn-icon edit-product" data-id="${product.id}" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-product" data-id="${product.id}" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        productsList.appendChild(row);
    });
    
    // Ajouter les écouteurs d'événements aux boutons d'action
    addActionButtonListeners();
}

/**
 * Affiche l'historique des mouvements de stock
 * @param {Array} historyToDisplay - Liste des mouvements à afficher
 */
function displayStockHistory(historyToDisplay) {
    const historyList = document.getElementById('stock-history-list');
    historyList.innerHTML = '';
    
    if (historyToDisplay.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" class="text-center">Aucun mouvement de stock trouvé</td>';
        historyList.appendChild(emptyRow);
        return;
    }
    
    // Limiter l'affichage aux 20 derniers mouvements
    const recentHistory = historyToDisplay.slice(0, 20);
    
    recentHistory.forEach(async movement => {
        const row = document.createElement('tr');
        
        // Récupérer le nom du produit
        let productName = 'Produit inconnu';
        try {
            const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, movement.productId);
            if (product) {
                productName = product.name;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du produit:', error);
        }
        
        // Formater la date
        const date = new Date(movement.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${productName}</td>
            <td>${movement.type}</td>
            <td>${movement.quantity > 0 ? '+' + movement.quantity : movement.quantity}</td>
            <td>${movement.user || 'Système'}</td>
            <td>${movement.notes || '-'}</td>
        `;
        
        historyList.appendChild(row);
    });
}

/**
 * Ajoute les écouteurs d'événements aux boutons d'action
 */
function addActionButtonListeners() {
    // Boutons d'ajustement de stock
    const adjustButtons = document.querySelectorAll('.adjust-stock');
    adjustButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            openAdjustStockModal(productId);
        });
    });
    
    // Boutons de modification
    const editButtons = document.querySelectorAll('.edit-product');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            editProduct(productId);
        });
    });
    
    // Boutons de suppression
    const deleteButtons = document.querySelectorAll('.delete-product');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            openDeleteModal(productId);
        });
    });
}

/**
 * Ouvre la modal d'ajout/modification de produit
 */
function openProductModal() {
    // Réinitialiser le formulaire
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('modal-title').textContent = 'Ajouter un Produit';
    currentProductId = null;
    
    // Afficher la modal
    document.getElementById('product-modal').style.display = 'block';
}

/**
 * Ferme la modal d'ajout/modification de produit
 */
function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

/**
 * Gère la soumission du formulaire de produit
 * @param {Event} event - L'événement de soumission
 */
async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        // Récupérer les valeurs du formulaire
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value;
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const cost = parseFloat(document.getElementById('product-cost').value);
        const stock = parseInt(document.getElementById('product-stock').value);
        const threshold = parseInt(document.getElementById('product-threshold').value);
        const description = document.getElementById('product-description').value;
        
        // Valider les données
        if (!name || !category || isNaN(price) || isNaN(cost) || isNaN(stock) || isNaN(threshold)) {
            showAlert('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }
        
        if (price < 0 || cost < 0 || stock < 0 || threshold < 0) {
            showAlert('Les valeurs numériques doivent être positives.', 'error');
            return;
        }
        
        const productData = {
            name,
            category,
            price,
            cost,
            stock,
            threshold,
            description
        };
        
        if (productId) {
            // Mise à jour d'un produit existant
            const existingProduct = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, parseInt(productId));
            if (!existingProduct) {
                showAlert('Produit non trouvé.', 'error');
                return;
            }
            
            // Vérifier si le stock a changé
            if (existingProduct.stock !== stock) {
                // Enregistrer le mouvement de stock
                const stockChange = stock - existingProduct.stock;
                await recordStockMovement(parseInt(productId), stockChange, 'Ajustement', 'Modification du produit');
            }
            
            await db.updateOne(CONFIG.DB.COLLECTIONS.PRODUCTS, parseInt(productId), productData);
            showAlert('Produit mis à jour avec succès.', 'success');
        } else {
            // Ajout d'un nouveau produit
            const newProductId = await db.insertOne(CONFIG.DB.COLLECTIONS.PRODUCTS, productData);
            
            // Enregistrer le mouvement de stock initial
            if (stock > 0) {
                await recordStockMovement(newProductId, stock, 'Ajout', 'Stock initial');
            }
            
            showAlert('Produit ajouté avec succès.', 'success');
        }
        
        // Fermer la modal et recharger les produits
        closeProductModal();
        await loadProducts();
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du produit:', error);
        showAlert('Une erreur est survenue lors de la sauvegarde du produit.', 'error');
    }
}

/**
 * Ouvre la modal de modification d'un produit
 * @param {number} productId - ID du produit à modifier
 */
async function editProduct(productId) {
    try {
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        if (!product) {
            showAlert('Produit non trouvé.', 'error');
            return;
        }
        
        // Remplir le formulaire avec les données du produit
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-cost').value = product.cost;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-threshold').value = product.threshold;
        document.getElementById('product-description').value = product.description || '';
        
        // Mettre à jour le titre de la modal
        document.getElementById('modal-title').textContent = 'Modifier un Produit';
        currentProductId = productId;
        
        // Afficher la modal
        document.getElementById('product-modal').style.display = 'block';
    } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        showAlert('Une erreur est survenue lors de la récupération du produit.', 'error');
    }
}

/**
 * Ouvre la modal d'ajustement de stock
 * @param {number} productId - ID du produit à ajuster
 */
async function openAdjustStockModal(productId) {
    try {
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        if (!product) {
            showAlert('Produit non trouvé.', 'error');
            return;
        }
        
        // Remplir le formulaire avec les données du produit
        document.getElementById('adjust-product-id').value = product.id;
        document.getElementById('product-name-display').value = product.name;
        document.getElementById('current-stock-display').value = product.stock;
        document.getElementById('adjustment-quantity').value = '';
        document.getElementById('adjustment-notes').value = '';
        
        // Réinitialiser les sélecteurs
        document.getElementById('adjustment-type').value = 'add';
        document.getElementById('adjustment-reason').value = 'Réception';
        
        // Afficher la modal
        document.getElementById('adjust-stock-modal').style.display = 'block';
    } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        showAlert('Une erreur est survenue lors de la récupération du produit.', 'error');
    }
}

/**
 * Ferme la modal d'ajustement de stock
 */
function closeAdjustStockModal() {
    document.getElementById('adjust-stock-modal').style.display = 'none';
}

/**
 * Gère l'ajustement du stock
 * @param {Event} event - L'événement de soumission
 */
async function handleStockAdjustment(event) {
    event.preventDefault();
    
    try {
        // Récupérer les valeurs du formulaire
        const productId = parseInt(document.getElementById('adjust-product-id').value);
        const adjustmentType = document.getElementById('adjustment-type').value;
        const quantity = parseInt(document.getElementById('adjustment-quantity').value);
        const reason = document.getElementById('adjustment-reason').value;
        const notes = document.getElementById('adjustment-notes').value;
        
        // Valider les données
        if (isNaN(quantity) || quantity <= 0) {
            showAlert('Veuillez entrer une quantité valide.', 'error');
            return;
        }
        
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        if (!product) {
            showAlert('Produit non trouvé.', 'error');
            return;
        }
        
        let newStock = product.stock;
        let stockChange = 0;
        
        // Calculer le nouveau stock en fonction du type d'ajustement
        switch (adjustmentType) {
            case 'add':
                newStock += quantity;
                stockChange = quantity;
                break;
            case 'remove':
                if (product.stock < quantity) {
                    showAlert('Stock insuffisant pour cette opération.', 'error');
                    return;
                }
                newStock -= quantity;
                stockChange = -quantity;
                break;
            case 'set':
                stockChange = quantity - product.stock;
                newStock = quantity;
                break;
            default:
                showAlert('Type d\'ajustement non valide.', 'error');
                return;
        }
        
        // Mettre à jour le stock du produit
        await db.updateOne(CONFIG.DB.COLLECTIONS.PRODUCTS, productId, { stock: newStock });
        
        // Enregistrer le mouvement de stock
        await recordStockMovement(productId, stockChange, reason, notes);
        
        // Fermer la modal et recharger les produits
        closeAdjustStockModal();
        await loadProducts();
        await loadStockHistory();
        
        showAlert('Stock ajusté avec succès.', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'ajustement du stock:', error);
        showAlert('Une erreur est survenue lors de l\'ajustement du stock.', 'error');
    }
}

/**
 * Enregistre un mouvement de stock
 * @param {number} productId - ID du produit
 * @param {number} quantity - Quantité (positive pour ajout, négative pour retrait)
 * @param {string} type - Type de mouvement
 * @param {string} notes - Notes supplémentaires
 */
async function recordStockMovement(productId, quantity, type, notes) {
    try {
        const movement = {
            productId,
            date: new Date().toISOString(),
            quantity,
            type,
            notes,
            user: 'Admin' // Dans une vraie application, utiliser l'utilisateur connecté
        };
        
        await db.insertOne(CONFIG.DB.COLLECTIONS.STOCK_HISTORY, movement);
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du mouvement de stock:', error);
        throw error;
    }
}

/**
 * Ouvre la modal de confirmation de suppression
 * @param {number} productId - ID du produit à supprimer
 */
function openDeleteModal(productId) {
    currentProductId = productId;
    document.getElementById('confirm-delete-modal').style.display = 'block';
}

/**
 * Ferme la modal de confirmation de suppression
 */
function closeDeleteModal() {
    document.getElementById('confirm-delete-modal').style.display = 'none';
}

/**
 * Confirme la suppression d'un produit
 */
async function confirmDeleteProduct() {
    if (!currentProductId) {
        showAlert('Aucun produit sélectionné.', 'error');
        return;
    }
    
    try {
        // Vérifier si le produit est utilisé dans des commandes
        const orders = await db.findAll(CONFIG.DB.COLLECTIONS.ORDERS);
        const isUsedInOrders = orders.some(order => {
            return order.items && order.items.some(item => item.productId === currentProductId);
        });
        
        if (isUsedInOrders) {
            showAlert('Ce produit ne peut pas être supprimé car il est utilisé dans des commandes.', 'error');
            closeDeleteModal();
            return;
        }
        
        // Récupérer le produit pour enregistrer le mouvement de stock
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, currentProductId);
        if (product && product.stock > 0) {
            // Enregistrer le mouvement de stock (retrait du stock complet)
            await recordStockMovement(currentProductId, -product.stock, 'Suppression', 'Produit supprimé');
        }
        
        // Supprimer le produit
        await db.deleteOne(CONFIG.DB.COLLECTIONS.PRODUCTS, currentProductId);
        
        showAlert('Produit supprimé avec succès.', 'success');
        closeDeleteModal();
        await loadProducts();
        await loadStockHistory();
    } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
        showAlert('Une erreur est survenue lors de la suppression du produit.', 'error');
    }
}

/**
 * Applique les filtres sur la liste des produits
 */
function applyFilters() {
    const categoryFilter = document.getElementById('filter-category').value;
    const stockFilter = document.getElementById('filter-stock').value;
    const searchTerm = document.getElementById('search-product').value.toLowerCase();
    
    let filteredProducts = [...products];
    
    // Filtrer par catégorie
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(product => product.category === categoryFilter);
    }
    
    // Filtrer par niveau de stock
    if (stockFilter) {
        switch (stockFilter) {
            case 'low':
                filteredProducts = filteredProducts.filter(product => product.stock > 0 && product.stock <= product.threshold);
                break;
            case 'out':
                filteredProducts = filteredProducts.filter(product => product.stock <= 0);
                break;
        }
    }
    
    // Filtrer par terme de recherche
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => {
            return product.name.toLowerCase().includes(searchTerm) || 
                   (product.description && product.description.toLowerCase().includes(searchTerm));
        });
    }
    
    displayProducts(filteredProducts);
}

/**
 * Recherche des produits par nom ou description
 */
function searchProducts() {
    applyFilters();
}

/**
 * Exporte les produits au format CSV
 */
function exportProducts() {
    try {
        if (products.length === 0) {
            showAlert('Aucun produit à exporter.', 'error');
            return;
        }
        
        // Créer les en-têtes CSV
        const headers = ['ID', 'Nom', 'Catégorie', 'Prix', 'Coût', 'Stock', 'Seuil d\'alerte', 'Description'];
        
        // Créer les lignes de données
        const rows = products.map(product => [
            product.id,
            product.name,
            product.category,
            product.price,
            product.cost,
            product.stock,
            product.threshold,
            product.description || ''
        ]);
        
        // Combiner les en-têtes et les lignes
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Créer un blob et un lien de téléchargement
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `produits_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Produits exportés avec succès.', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'exportation des produits:', error);
        showAlert('Une erreur est survenue lors de l\'exportation des produits.', 'error');
    }
}

/**
 * Importe des produits depuis un fichier CSV
 */
function importProducts() {
    // Créer un élément input de type file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const lines = content.split('\n');
                    
                    // Vérifier si le fichier a des données
                    if (lines.length < 2) {
                        showAlert('Le fichier CSV est vide ou mal formaté.', 'error');
                        return;
                    }
                    
                    // Ignorer la première ligne (en-têtes)
                    const headers = lines[0].split(',');
                    const expectedHeaders = ['ID', 'Nom', 'Catégorie', 'Prix', 'Coût', 'Stock', 'Seuil d\'alerte', 'Description'];
                    
                    // Vérifier si les en-têtes correspondent
                    if (!expectedHeaders.every(header => headers.includes(header))) {
                        showAlert('Le format du fichier CSV est incorrect.', 'error');
                        return;
                    }
                    
                    let importedCount = 0;
                    let updatedCount = 0;
                    
                    // Traiter chaque ligne
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',');
                        if (values.length < 7) continue;
                        
                        const productData = {
                            name: values[1],
                            category: values[2],
                            price: parseFloat(values[3]),
                            cost: parseFloat(values[4]),
                            stock: parseInt(values[5]),
                            threshold: parseInt(values[6]),
                            description: values[7] || ''
                        };
                        
                        // Vérifier si le produit existe déjà (par nom)
                        const existingProducts = await db.find(CONFIG.DB.COLLECTIONS.PRODUCTS, { name: productData.name });
                        
                        if (existingProducts.length > 0) {
                            // Mettre à jour le produit existant
                            await db.updateOne(CONFIG.DB.COLLECTIONS.PRODUCTS, existingProducts[0].id, productData);
                            updatedCount++;
                        } else {
                            // Ajouter un nouveau produit
                            await db.insertOne(CONFIG.DB.COLLECTIONS.PRODUCTS, productData);
                            importedCount++;
                        }
                    }
                    
                    await loadProducts();
                    showAlert(`Importation terminée : ${importedCount} produits ajoutés, ${updatedCount} produits mis à jour.`, 'success');
                } catch (error) {
                    console.error('Erreur lors du traitement du fichier CSV:', error);
                    showAlert('Une erreur est survenue lors du traitement du fichier CSV.', 'error');
                }
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error('Erreur lors de l\'importation des produits:', error);
            showAlert('Une erreur est survenue lors de l\'importation des produits.', 'error');
        }
    };
    
    input.click();
}

/**
 * Affiche une alerte à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type d'alerte (success, error, warning, info)
 */
function showAlert(message, type = 'info') {
    const alertElement = document.getElementById('success-alert');
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // Masquer l'alerte après 3 secondes
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}

/**
 * Formate un montant en devise
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}