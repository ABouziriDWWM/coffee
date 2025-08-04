/**
 * Script pour la gestion du stock
 * Gère l'affichage, la création, la modification et la suppression des produits
 * ainsi que les mouvements de stock
 */

// Variables globales
let products = [];
let currentProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // S'assurer que la base de données est initialisée
        await db.init();
        
        // Charger la liste des produits
        await loadProducts();
        
        // Charger l'historique des mouvements de stock
        await loadStockHistory();
        
        // Initialiser les gestionnaires d'événements
        initEventListeners();
        
        console.log('Page de gestion du stock initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page de stock:', error);
        showAlert('Une erreur est survenue lors du chargement de la page. Veuillez réessayer.', 'danger');
    }
});

/**
 * Initialise les gestionnaires d'événements
 */
function initEventListeners() {
    // Bouton pour ajouter un produit
    const addProductBtn = document.getElementById('add-product-btn');
    addProductBtn.addEventListener('click', () => openProductModal());
    
    // Bouton pour filtrer les produits
    const filterBtn = document.getElementById('filter-btn');
    filterBtn.addEventListener('click', filterProducts);
    
    // Bouton pour réinitialiser les filtres
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    resetFilterBtn.addEventListener('click', resetFilters);
    
    // Champ de recherche
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', searchProducts);
    
    // Formulaire de produit
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', handleProductSubmit);
    
    // Bouton pour annuler le formulaire
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', closeProductModal);
    
    // Bouton pour fermer le modal
    const closeModal = document.querySelector('#product-modal .close-modal');
    closeModal.addEventListener('click', closeProductModal);
    
    // Bouton pour fermer le modal d'ajustement de stock
    const closeStockModal = document.querySelector('#stock-modal .close-modal');
    closeStockModal.addEventListener('click', closeAdjustStockModal);
    
    // Formulaire d'ajustement de stock
    const stockForm = document.getElementById('stock-form');
    stockForm.addEventListener('submit', handleStockAdjustment);
    
    // Bouton pour annuler l'ajustement de stock
    const cancelStockBtn = document.getElementById('cancel-stock-btn');
    cancelStockBtn.addEventListener('click', closeAdjustStockModal);
    
    // Boutons de confirmation de suppression
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.addEventListener('click', confirmDeleteProduct);
    
    // Fermer les modals si on clique en dehors
    window.addEventListener('click', (event) => {
        const productModal = document.getElementById('product-modal');
        const stockModal = document.getElementById('stock-modal');
        const deleteModal = document.getElementById('confirm-delete-modal');
        
        if (event.target === productModal) {
            closeProductModal();
        } else if (event.target === stockModal) {
            closeAdjustStockModal();
        } else if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

/**
 * Charge la liste des produits depuis la base de données
 */
async function loadProducts() {
    try {
        products = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        
        // Trier les produits par nom
        products.sort((a, b) => a.name.localeCompare(b.name));
        
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';
        
        if (products.length === 0) {
            // Afficher un message si aucun produit n'existe
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="7" class="text-center">Aucun produit trouvé</td>`;
            productsList.appendChild(emptyRow);
        } else {
            // Afficher les produits
            products.forEach(product => {
                const row = document.createElement('tr');
                
                // Définir la classe CSS en fonction du niveau de stock
                let stockClass = '';
                if (product.quantity <= CONFIG.THRESHOLDS.LOW_STOCK) {
                    stockClass = 'text-danger';
                } else if (product.quantity <= CONFIG.THRESHOLDS.MEDIUM_STOCK) {
                    stockClass = 'text-warning';
                } else {
                    stockClass = 'text-success';
                }
                
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td class="${stockClass}">${product.quantity}</td>
                    <td>${product.unit}</td>
                    <td class="table-actions">
                        <button class="action-btn adjust-btn" data-id="${product.id}" title="Ajuster le stock"><i class="fas fa-boxes"></i></button>
                        <button class="action-btn edit-btn" data-id="${product.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${product.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                productsList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showAlert('Impossible de charger les produits. Veuillez réessayer.', 'danger');
    }
}

/**
 * Charge l'historique des mouvements de stock
 */
async function loadStockHistory() {
    try {
        const stockMovements = await db.findAll(CONFIG.DB.COLLECTIONS.STOCK_MOVEMENTS);
        
        // Trier les mouvements par date (les plus récents d'abord)
        stockMovements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const historyList = document.getElementById('stock-history-list');
        historyList.innerHTML = '';
        
        if (stockMovements.length === 0) {
            // Afficher un message si aucun mouvement n'existe
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="text-center">Aucun mouvement de stock enregistré</td>`;
            historyList.appendChild(emptyRow);
        } else {
            // Afficher les mouvements de stock (limités aux 10 derniers)
            const recentMovements = stockMovements.slice(0, 10);
            
            recentMovements.forEach(movement => {
                const row = document.createElement('tr');
                
                // Formater la date
                const movementDate = new Date(movement.date);
                const formattedDate = movementDate.toLocaleDateString('fr-FR') + ' ' + 
                                     movementDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                
                // Définir la classe CSS en fonction du type de mouvement
                let quantityClass = movement.type === 'add' ? 'text-success' : 'text-danger';
                let quantityPrefix = movement.type === 'add' ? '+' : '-';
                
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${movement.productName}</td>
                    <td class="${quantityClass}">${quantityPrefix}${movement.quantity} ${movement.unit}</td>
                    <td>${movement.reason}</td>
                    <td>${movement.user || 'Système'}</td>
                `;
                
                historyList.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des mouvements de stock:', error);
        showAlert('Impossible de charger l\'historique des mouvements de stock.', 'danger');
    }
}

/**
 * Ajoute les gestionnaires d'événements pour les boutons d'action
 */
function addActionButtonsEventListeners() {
    // Boutons pour ajuster le stock
    const adjustButtons = document.querySelectorAll('.adjust-btn');
    adjustButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.getAttribute('data-id'));
            openAdjustStockModal(productId);
        });
    });
    
    // Boutons pour modifier un produit
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.getAttribute('data-id'));
            editProduct(productId);
        });
    });
    
    // Boutons pour supprimer un produit
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.getAttribute('data-id'));
            openDeleteModal(productId);
        });
    });
}

/**
 * Ouvre le modal pour ajouter ou modifier un produit
 * @param {Object} product - Produit à modifier (null pour un nouveau produit)
 */
function openProductModal(product = null) {
    // Réinitialiser le formulaire
    const productForm = document.getElementById('product-form');
    productForm.reset();
    
    // Définir l'ID du produit courant
    currentProductId = product ? product.id : null;
    document.getElementById('product-id').value = currentProductId || '';
    
    // Mettre à jour le titre du modal
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = product ? 'Modifier le Produit' : 'Ajouter un Produit';
    
    // Remplir le formulaire si on modifie un produit existant
    if (product) {
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-unit').value = product.unit;
        document.getElementById('product-description').value = product.description || '';
    }
    
    // Afficher le modal
    const productModal = document.getElementById('product-modal');
    productModal.style.display = 'block';
}

/**
 * Ferme le modal de produit
 */
function closeProductModal() {
    const productModal = document.getElementById('product-modal');
    productModal.style.display = 'none';
    currentProductId = null;
}

/**
 * Gère la soumission du formulaire de produit
 * @param {Event} event - Événement de soumission
 */
async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        // Récupérer les données du formulaire
        const productId = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const quantity = parseInt(document.getElementById('product-quantity').value);
        const unit = document.getElementById('product-unit').value;
        const description = document.getElementById('product-description').value.trim();
        
        // Valider les données
        if (!name) {
            showAlert('Le nom du produit est obligatoire.', 'warning');
            return;
        }
        
        if (isNaN(price) || price <= 0) {
            showAlert('Le prix doit être un nombre positif.', 'warning');
            return;
        }
        
        if (isNaN(quantity) || quantity < 0) {
            showAlert('La quantité doit être un nombre positif ou zéro.', 'warning');
            return;
        }
        
        // Créer l'objet produit
        const product = {
            name,
            category,
            price,
            quantity,
            unit,
            description
        };
        
        // Enregistrer le produit
        if (productId) {
            // Récupérer l'ancien produit pour comparer les quantités
            const oldProduct = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, parseInt(productId));
            
            // Mettre à jour le produit existant
            await db.updateOne(CONFIG.DB.COLLECTIONS.PRODUCTS, parseInt(productId), product);
            
            // Si la quantité a changé, enregistrer un mouvement de stock
            if (oldProduct && oldProduct.quantity !== quantity) {
                const difference = quantity - oldProduct.quantity;
                const type = difference > 0 ? 'add' : 'remove';
                
                const stockMovement = {
                    date: new Date().toISOString(),
                    productId: parseInt(productId),
                    productName: name,
                    type,
                    quantity: Math.abs(difference),
                    unit,
                    reason: 'Modification manuelle du produit',
                    user: 'Administrateur'
                };
                
                await db.insertOne(CONFIG.DB.COLLECTIONS.STOCK_MOVEMENTS, stockMovement);
            }
            
            showAlert('Produit mis à jour avec succès.', 'success');
        } else {
            // Créer un nouveau produit
            const newProduct = await db.insertOne(CONFIG.DB.COLLECTIONS.PRODUCTS, product);
            
            // Enregistrer un mouvement de stock si la quantité initiale est supérieure à 0
            if (quantity > 0) {
                const stockMovement = {
                    date: new Date().toISOString(),
                    productId: newProduct.id,
                    productName: name,
                    type: 'add',
                    quantity,
                    unit,
                    reason: 'Stock initial',
                    user: 'Administrateur'
                };
                
                await db.insertOne(CONFIG.DB.COLLECTIONS.STOCK_MOVEMENTS, stockMovement);
            }
            
            showAlert('Produit ajouté avec succès.', 'success');
        }
        
        // Fermer le modal et recharger les produits
        closeProductModal();
        await loadProducts();
        await loadStockHistory();
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du produit:', error);
        showAlert('Une erreur est survenue lors de l\'enregistrement du produit.', 'danger');
    }
}

/**
 * Ouvre le modal pour modifier un produit
 * @param {number} productId - ID du produit à modifier
 */
async function editProduct(productId) {
    try {
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        if (product) {
            openProductModal(product);
        } else {
            showAlert('Produit non trouvé.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        showAlert('Impossible de récupérer le produit.', 'danger');
    }
}

/**
 * Ouvre le modal pour ajuster le stock d'un produit
 * @param {number} productId - ID du produit à ajuster
 */
async function openAdjustStockModal(productId) {
    try {
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        
        if (product) {
            // Définir l'ID du produit courant
            currentProductId = product.id;
            
            // Remplir les champs du formulaire
            document.getElementById('stock-product-id').value = product.id;
            document.getElementById('stock-product-name').value = product.name;
            document.getElementById('stock-current-quantity').value = product.quantity;
            document.getElementById('stock-unit').textContent = product.unit;
            document.getElementById('stock-adjustment').value = '';
            document.getElementById('stock-reason').value = '';
            
            // Afficher le modal
            const stockModal = document.getElementById('stock-modal');
            stockModal.style.display = 'block';
        } else {
            showAlert('Produit non trouvé.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        showAlert('Impossible de récupérer le produit.', 'danger');
    }
}

/**
 * Ferme le modal d'ajustement de stock
 */
function closeAdjustStockModal() {
    const stockModal = document.getElementById('stock-modal');
    stockModal.style.display = 'none';
    currentProductId = null;
}

/**
 * Gère l'ajustement du stock d'un produit
 * @param {Event} event - Événement de soumission
 */
async function handleStockAdjustment(event) {
    event.preventDefault();
    
    try {
        // Récupérer les données du formulaire
        const productId = parseInt(document.getElementById('stock-product-id').value);
        const productName = document.getElementById('stock-product-name').value;
        const currentQuantity = parseInt(document.getElementById('stock-current-quantity').value);
        const adjustment = parseInt(document.getElementById('stock-adjustment').value);
        const adjustmentType = document.getElementById('stock-adjustment-type').value;
        const reason = document.getElementById('stock-reason').value.trim();
        
        // Valider les données
        if (isNaN(adjustment) || adjustment <= 0) {
            showAlert('L\'ajustement doit être un nombre positif.', 'warning');
            return;
        }
        
        if (!reason) {
            showAlert('La raison de l\'ajustement est obligatoire.', 'warning');
            return;
        }
        
        // Récupérer le produit
        const product = await db.findById(CONFIG.DB.COLLECTIONS.PRODUCTS, productId);
        
        if (!product) {
            showAlert('Produit non trouvé.', 'warning');
            return;
        }
        
        // Calculer la nouvelle quantité
        let newQuantity;
        if (adjustmentType === 'add') {
            newQuantity = currentQuantity + adjustment;
        } else {
            newQuantity = currentQuantity - adjustment;
            
            // Vérifier que la quantité ne devient pas négative
            if (newQuantity < 0) {
                showAlert('La quantité ne peut pas être négative.', 'warning');
                return;
            }
        }
        
        // Mettre à jour le produit
        product.quantity = newQuantity;
        await db.updateOne(CONFIG.DB.COLLECTIONS.PRODUCTS, productId, product);
        
        // Enregistrer le mouvement de stock
        const stockMovement = {
            date: new Date().toISOString(),
            productId,
            productName,
            type: adjustmentType,
            quantity: adjustment,
            unit: product.unit,
            reason,
            user: 'Administrateur'
        };
        
        await db.insertOne(CONFIG.DB.COLLECTIONS.STOCK_MOVEMENTS, stockMovement);
        
        showAlert('Stock ajusté avec succès.', 'success');
        
        // Fermer le modal et recharger les produits
        closeAdjustStockModal();
        await loadProducts();
        await loadStockHistory();
        
    } catch (error) {
        console.error('Erreur lors de l\'ajustement du stock:', error);
        showAlert('Une erreur est survenue lors de l\'ajustement du stock.', 'danger');
    }
}

/**
 * Ouvre le modal de confirmation de suppression
 * @param {number} productId - ID du produit à supprimer
 */
function openDeleteModal(productId) {
    currentProductId = productId;
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'block';
}

/**
 * Ferme le modal de confirmation de suppression
 */
function closeDeleteModal() {
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'none';
    currentProductId = null;
}

/**
 * Confirme la suppression d'un produit
 */
async function confirmDeleteProduct() {
    if (!currentProductId) return;
    
    try {
        // Vérifier si le produit est utilisé dans des commandes
        const orders = await db.findAll(CONFIG.DB.COLLECTIONS.ORDERS);
        const isProductUsed = orders.some(order => {
            return order.products.some(product => product.productId === currentProductId);
        });
        
        if (isProductUsed) {
            showAlert('Ce produit est utilisé dans des commandes et ne peut pas être supprimé.', 'warning');
            closeDeleteModal();
            return;
        }
        
        // Supprimer le produit
        await db.deleteOne(CONFIG.DB.COLLECTIONS.PRODUCTS, currentProductId);
        
        // Enregistrer un mouvement de stock pour la suppression
        const product = products.find(p => p.id === currentProductId);
        if (product && product.quantity > 0) {
            const stockMovement = {
                date: new Date().toISOString(),
                productId: currentProductId,
                productName: product.name,
                type: 'remove',
                quantity: product.quantity,
                unit: product.unit,
                reason: 'Suppression du produit',
                user: 'Administrateur'
            };
            
            await db.insertOne(CONFIG.DB.COLLECTIONS.STOCK_MOVEMENTS, stockMovement);
        }
        
        showAlert('Produit supprimé avec succès.', 'success');
        closeDeleteModal();
        await loadProducts();
        await loadStockHistory();
    } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
        showAlert('Impossible de supprimer le produit.', 'danger');
    }
}

/**
 * Filtre les produits selon les critères spécifiés
 */
async function filterProducts() {
    try {
        // Récupérer les critères de filtrage
        const category = document.getElementById('filter-category').value;
        const stockStatus = document.getElementById('filter-stock').value;
        
        // Récupérer tous les produits
        const allProducts = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        
        // Filtrer les produits
        const filteredProducts = allProducts.filter(product => {
            // Filtrer par catégorie
            if (category && product.category !== category) {
                return false;
            }
            
            // Filtrer par statut de stock
            if (stockStatus) {
                switch (stockStatus) {
                    case 'low':
                        if (product.quantity > CONFIG.THRESHOLDS.LOW_STOCK) {
                            return false;
                        }
                        break;
                    case 'medium':
                        if (product.quantity <= CONFIG.THRESHOLDS.LOW_STOCK || 
                            product.quantity > CONFIG.THRESHOLDS.MEDIUM_STOCK) {
                            return false;
                        }
                        break;
                    case 'high':
                        if (product.quantity <= CONFIG.THRESHOLDS.MEDIUM_STOCK) {
                            return false;
                        }
                        break;
                }
            }
            
            return true;
        });
        
        // Trier les produits par nom
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        
        // Mettre à jour la variable globale des produits
        products = filteredProducts;
        
        // Afficher les produits filtrés
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            // Afficher un message si aucun produit ne correspond aux critères
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="7" class="text-center">Aucun produit ne correspond aux critères de recherche</td>`;
            productsList.appendChild(emptyRow);
        } else {
            // Afficher les produits filtrés
            filteredProducts.forEach(product => {
                const row = document.createElement('tr');
                
                // Définir la classe CSS en fonction du niveau de stock
                let stockClass = '';
                if (product.quantity <= CONFIG.THRESHOLDS.LOW_STOCK) {
                    stockClass = 'text-danger';
                } else if (product.quantity <= CONFIG.THRESHOLDS.MEDIUM_STOCK) {
                    stockClass = 'text-warning';
                } else {
                    stockClass = 'text-success';
                }
                
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td class="${stockClass}">${product.quantity}</td>
                    <td>${product.unit}</td>
                    <td class="table-actions">
                        <button class="action-btn adjust-btn" data-id="${product.id}" title="Ajuster le stock"><i class="fas fa-boxes"></i></button>
                        <button class="action-btn edit-btn" data-id="${product.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${product.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                productsList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
        
        showAlert(`${filteredProducts.length} produits trouvés.`, 'success');
    } catch (error) {
        console.error('Erreur lors du filtrage des produits:', error);
        showAlert('Impossible de filtrer les produits.', 'danger');
    }
}

/**
 * Réinitialise les filtres et affiche tous les produits
 */
async function resetFilters() {
    // Réinitialiser les champs de filtrage
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-stock').value = '';
    document.getElementById('search-input').value = '';
    
    // Recharger tous les produits
    await loadProducts();
    
    showAlert('Filtres réinitialisés.', 'success');
}

/**
 * Recherche des produits par nom
 */
async function searchProducts() {
    try {
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        
        if (!searchTerm) {
            // Si le champ de recherche est vide, recharger tous les produits
            await loadProducts();
            return;
        }
        
        // Récupérer tous les produits
        const allProducts = await db.findAll(CONFIG.DB.COLLECTIONS.PRODUCTS);
        
        // Filtrer les produits par nom
        const filteredProducts = allProducts.filter(product => {
            return product.name.toLowerCase().includes(searchTerm) || 
                   product.description.toLowerCase().includes(searchTerm);
        });
        
        // Trier les produits par nom
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        
        // Mettre à jour la variable globale des produits
        products = filteredProducts;
        
        // Afficher les produits filtrés
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            // Afficher un message si aucun produit ne correspond à la recherche
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="7" class="text-center">Aucun produit ne correspond à la recherche "${searchTerm}"</td>`;
            productsList.appendChild(emptyRow);
        } else {
            // Afficher les produits filtrés
            filteredProducts.forEach(product => {
                const row = document.createElement('tr');
                
                // Définir la classe CSS en fonction du niveau de stock
                let stockClass = '';
                if (product.quantity <= CONFIG.THRESHOLDS.LOW_STOCK) {
                    stockClass = 'text-danger';
                } else if (product.quantity <= CONFIG.THRESHOLDS.MEDIUM_STOCK) {
                    stockClass = 'text-warning';
                } else {
                    stockClass = 'text-success';
                }
                
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td class="${stockClass}">${product.quantity}</td>
                    <td>${product.unit}</td>
                    <td class="table-actions">
                        <button class="action-btn adjust-btn" data-id="${product.id}" title="Ajuster le stock"><i class="fas fa-boxes"></i></button>
                        <button class="action-btn edit-btn" data-id="${product.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${product.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                productsList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
    } catch (error) {
        console.error('Erreur lors de la recherche des produits:', error);
        showAlert('Impossible de rechercher les produits.', 'danger');
    }
}

/**
 * Affiche une alerte
 * @param {string} message - Message à afficher
 * @param {string} type - Type d'alerte (success, warning, danger)
 */
function showAlert(message, type = 'success') {
    const alertElement = document.getElementById('success-alert');
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // Faire disparaître l'alerte après 3 secondes
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}

/**
 * Formate un nombre en devise
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté avec le symbole de devise
 */
function formatCurrency(amount) {
    return amount.toFixed(2) + ' ' + CONFIG.APP.CURRENCY;
}