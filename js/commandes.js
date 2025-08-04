/**
 * Script pour la gestion des commandes
 * Gère l'affichage, la création, la modification et la suppression des commandes
 */

// Variables globales
let products = [];
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // S'assurer que la base de données est initialisée
        await db.init();
        
        // Charger les produits pour les sélecteurs
        await loadProducts();
        
        // Charger la liste des commandes
        await loadOrders();
        
        // Initialiser les gestionnaires d'événements
        initEventListeners();
        
        console.log('Page des commandes initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page des commandes:', error);
        showAlert('Une erreur est survenue lors du chargement de la page. Veuillez réessayer.', 'danger');
    }
});

/**
 * Initialise les gestionnaires d'événements
 */
function initEventListeners() {
    // Bouton pour créer une nouvelle commande
    const newOrderBtn = document.getElementById('new-order-btn');
    newOrderBtn.addEventListener('click', () => openOrderModal());
    
    // Formulaire de commande
    const orderForm = document.getElementById('order-form');
    orderForm.addEventListener('submit', handleOrderSubmit);
    
    // Bouton pour ajouter un produit à la commande
    const addProductBtn = document.getElementById('add-product-btn');
    addProductBtn.addEventListener('click', addProductRow);
    
    // Bouton pour annuler le formulaire
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', closeOrderModal);
    
    // Bouton pour fermer le modal
    const closeModal = document.querySelector('.close-modal');
    closeModal.addEventListener('click', closeOrderModal);
    
    // Boutons de confirmation de suppression
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.addEventListener('click', confirmDeleteOrder);
    
    // Fermer les modals si on clique en dehors
    window.addEventListener('click', (event) => {
        const orderModal = document.getElementById('order-modal');
        const deleteModal = document.getElementById('confirm-delete-modal');
        
        if (event.target === orderModal) {
            closeOrderModal();
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
        console.log(`${products.length} produits chargés`);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        showAlert('Impossible de charger les produits. Veuillez réessayer.', 'danger');
    }
}

/**
 * Charge la liste des commandes depuis la base de données
 */
async function loadOrders() {
    try {
        const orders = await db.findAll(CONFIG.DB.COLLECTIONS.ORDERS);
        
        // Trier les commandes par date (les plus récentes d'abord)
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';
        
        if (orders.length === 0) {
            // Afficher un message si aucune commande n'existe
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="text-center">Aucune commande trouvée</td>`;
            ordersList.appendChild(emptyRow);
        } else {
            // Afficher les commandes
            orders.forEach(order => {
                const row = document.createElement('tr');
                
                // Formater la date
                const orderDate = new Date(order.date);
                const formattedDate = orderDate.toLocaleDateString('fr-FR');
                
                // Définir la classe CSS en fonction du statut
                let statusClass = '';
                switch (order.status) {
                    case 'En attente':
                        statusClass = 'text-warning';
                        break;
                    case 'En préparation':
                        statusClass = 'text-primary';
                        break;
                    case 'Terminée':
                        statusClass = 'text-success';
                        break;
                    case 'Livrée':
                        statusClass = 'text-success';
                        break;
                    case 'Annulée':
                        statusClass = 'text-danger';
                        break;
                }
                
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${formattedDate}</td>
                    <td>${order.clientName}</td>
                    <td>${formatCurrency(order.total)}</td>
                    <td><span class="${statusClass}">${order.status}</span></td>
                    <td class="table-actions">
                        <button class="action-btn view-btn" data-id="${order.id}" title="Voir"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-btn" data-id="${order.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${order.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                ordersList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        showAlert('Impossible de charger les commandes. Veuillez réessayer.', 'danger');
    }
}

/**
 * Ajoute les gestionnaires d'événements pour les boutons d'action
 */
function addActionButtonsEventListeners() {
    // Boutons pour voir une commande
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const orderId = parseInt(button.getAttribute('data-id'));
            viewOrder(orderId);
        });
    });
    
    // Boutons pour modifier une commande
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const orderId = parseInt(button.getAttribute('data-id'));
            editOrder(orderId);
        });
    });
    
    // Boutons pour supprimer une commande
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const orderId = parseInt(button.getAttribute('data-id'));
            openDeleteModal(orderId);
        });
    });
}

/**
 * Ouvre le modal pour créer ou modifier une commande
 * @param {Object} order - Commande à modifier (null pour une nouvelle commande)
 */
async function openOrderModal(order = null) {
    // Réinitialiser le formulaire
    const orderForm = document.getElementById('order-form');
    orderForm.reset();
    
    // Réinitialiser les produits
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = '';
    
    // Définir l'ID de la commande courante
    currentOrderId = order ? order.id : null;
    document.getElementById('order-id').value = currentOrderId || '';
    
    // Mettre à jour le titre du modal
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = order ? 'Modifier la Commande' : 'Nouvelle Commande';
    
    // Remplir le formulaire si on modifie une commande existante
    if (order) {
        document.getElementById('client-name').value = order.clientName;
        document.getElementById('order-date').value = order.date;
        document.getElementById('order-status').value = order.status;
        document.getElementById('order-notes').value = order.notes || '';
        document.getElementById('order-total').value = formatCurrency(order.total);
        
        // Ajouter les produits de la commande
        order.products.forEach(product => {
            addProductRow(null, product);
        });
    } else {
        // Pour une nouvelle commande, définir la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('order-date').value = today;
        
        // Ajouter une ligne de produit vide
        addProductRow();
    }
    
    // Afficher le modal
    const orderModal = document.getElementById('order-modal');
    orderModal.style.display = 'block';
}

/**
 * Ferme le modal de commande
 */
function closeOrderModal() {
    const orderModal = document.getElementById('order-modal');
    orderModal.style.display = 'none';
    currentOrderId = null;
}

/**
 * Ajoute une ligne de produit au formulaire de commande
 * @param {Event} event - Événement de clic (peut être null)
 * @param {Object} productData - Données du produit à ajouter (pour le mode édition)
 */
function addProductRow(event = null, productData = null) {
    if (event) event.preventDefault();
    
    // Récupérer le template et le conteneur
    const template = document.getElementById('product-row-template');
    const container = document.getElementById('products-container');
    
    // Cloner le template
    const clone = document.importNode(template.content, true);
    
    // Récupérer les éléments de la ligne
    const productSelect = clone.querySelector('.product-select');
    const quantityInput = clone.querySelector('.product-quantity');
    const priceInput = clone.querySelector('.product-price');
    const subtotalInput = clone.querySelector('.product-subtotal');
    const removeButton = clone.querySelector('.remove-product-btn');
    
    // Remplir le sélecteur de produits
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${formatCurrency(product.price)})`;
        option.dataset.price = product.price;
        productSelect.appendChild(option);
    });
    
    // Si on a des données de produit (mode édition), sélectionner le produit
    if (productData) {
        productSelect.value = productData.productId;
        quantityInput.value = productData.quantity;
        priceInput.value = productData.price;
        subtotalInput.value = productData.subtotal;
    }
    
    // Ajouter les gestionnaires d'événements
    productSelect.addEventListener('change', updateProductPrice);
    quantityInput.addEventListener('input', updateSubtotal);
    removeButton.addEventListener('click', removeProductRow);
    
    // Ajouter la ligne au conteneur
    container.appendChild(clone);
    
    // Mettre à jour le prix si un produit est sélectionné
    if (productSelect.value) {
        updateProductPrice({ target: productSelect });
    }
    
    // Mettre à jour le total de la commande
    updateOrderTotal();
}

/**
 * Met à jour le prix unitaire lorsqu'un produit est sélectionné
 * @param {Event} event - Événement de changement
 */
function updateProductPrice(event) {
    const productSelect = event.target;
    const productRow = productSelect.closest('.product-row');
    const priceInput = productRow.querySelector('.product-price');
    const quantityInput = productRow.querySelector('.product-quantity');
    
    // Récupérer le prix du produit sélectionné
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const price = selectedOption ? parseFloat(selectedOption.dataset.price) : 0;
    
    // Mettre à jour le prix unitaire
    priceInput.value = price.toFixed(2);
    
    // Mettre à jour le sous-total
    updateSubtotal({ target: quantityInput });
}

/**
 * Met à jour le sous-total lorsque la quantité change
 * @param {Event} event - Événement de saisie
 */
function updateSubtotal(event) {
    const quantityInput = event.target;
    const productRow = quantityInput.closest('.product-row');
    const priceInput = productRow.querySelector('.product-price');
    const subtotalInput = productRow.querySelector('.product-subtotal');
    
    // Calculer le sous-total
    const quantity = parseInt(quantityInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const subtotal = quantity * price;
    
    // Mettre à jour le sous-total
    subtotalInput.value = subtotal.toFixed(2);
    
    // Mettre à jour le total de la commande
    updateOrderTotal();
}

/**
 * Supprime une ligne de produit
 * @param {Event} event - Événement de clic
 */
function removeProductRow(event) {
    const button = event.target;
    const productRow = button.closest('.product-row');
    
    // Supprimer la ligne
    productRow.remove();
    
    // Mettre à jour le total de la commande
    updateOrderTotal();
    
    // S'assurer qu'il reste au moins une ligne de produit
    const productsContainer = document.getElementById('products-container');
    if (productsContainer.children.length === 0) {
        addProductRow();
    }
}

/**
 * Met à jour le total de la commande
 */
function updateOrderTotal() {
    const subtotalInputs = document.querySelectorAll('.product-subtotal');
    let total = 0;
    
    // Calculer le total
    subtotalInputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    // Mettre à jour le total
    const orderTotalInput = document.getElementById('order-total');
    orderTotalInput.value = formatCurrency(total);
}

/**
 * Gère la soumission du formulaire de commande
 * @param {Event} event - Événement de soumission
 */
async function handleOrderSubmit(event) {
    event.preventDefault();
    
    try {
        // Récupérer les données du formulaire
        const orderId = document.getElementById('order-id').value;
        const clientName = document.getElementById('client-name').value;
        const orderDate = document.getElementById('order-date').value;
        const orderStatus = document.getElementById('order-status').value;
        const orderNotes = document.getElementById('order-notes').value;
        
        // Récupérer les produits
        const productRows = document.querySelectorAll('.product-row');
        const products = [];
        let total = 0;
        
        productRows.forEach(row => {
            const productSelect = row.querySelector('.product-select');
            const quantityInput = row.querySelector('.product-quantity');
            const priceInput = row.querySelector('.product-price');
            const subtotalInput = row.querySelector('.product-subtotal');
            
            const productId = parseInt(productSelect.value);
            const quantity = parseInt(quantityInput.value);
            const price = parseFloat(priceInput.value);
            const subtotal = parseFloat(subtotalInput.value);
            
            // Vérifier que les données sont valides
            if (productId && quantity > 0) {
                const selectedOption = productSelect.options[productSelect.selectedIndex];
                const productName = selectedOption.textContent.split(' (')[0];
                
                products.push({
                    productId,
                    productName,
                    quantity,
                    price,
                    subtotal
                });
                
                total += subtotal;
            }
        });
        
        // Vérifier qu'il y a au moins un produit
        if (products.length === 0) {
            showAlert('Veuillez ajouter au moins un produit à la commande.', 'warning');
            return;
        }
        
        // Créer l'objet commande
        const order = {
            clientName,
            date: orderDate,
            status: orderStatus,
            notes: orderNotes,
            products,
            total
        };
        
        // Enregistrer la commande
        if (orderId) {
            // Mettre à jour une commande existante
            await db.updateOne(CONFIG.DB.COLLECTIONS.ORDERS, parseInt(orderId), order);
            showAlert('Commande mise à jour avec succès.', 'success');
        } else {
            // Créer une nouvelle commande
            await db.insertOne(CONFIG.DB.COLLECTIONS.ORDERS, order);
            showAlert('Commande créée avec succès.', 'success');
        }
        
        // Fermer le modal et recharger les commandes
        closeOrderModal();
        await loadOrders();
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la commande:', error);
        showAlert('Une erreur est survenue lors de l\'enregistrement de la commande.', 'danger');
    }
}

/**
 * Affiche les détails d'une commande
 * @param {number} orderId - ID de la commande à afficher
 */
async function viewOrder(orderId) {
    try {
        const order = await db.findById(CONFIG.DB.COLLECTIONS.ORDERS, orderId);
        if (order) {
            // Ouvrir le modal en mode lecture seule
            openOrderModal(order);
            
            // Désactiver les champs
            const inputs = document.querySelectorAll('#order-form input, #order-form select, #order-form textarea');
            inputs.forEach(input => {
                input.disabled = true;
            });
            
            // Masquer les boutons d'ajout/suppression de produits
            document.getElementById('add-product-btn').style.display = 'none';
            document.querySelectorAll('.remove-product-btn').forEach(btn => {
                btn.style.display = 'none';
            });
            
            // Changer le texte du bouton d'enregistrement
            const submitButton = document.querySelector('#order-form button[type="submit"]');
            submitButton.textContent = 'Fermer';
            submitButton.classList.remove('btn');
            submitButton.classList.add('btn-secondary');
            
            // Modifier le comportement du bouton d'enregistrement
            const orderForm = document.getElementById('order-form');
            orderForm.onsubmit = (event) => {
                event.preventDefault();
                closeOrderModal();
            };
        } else {
            showAlert('Commande non trouvée.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de l\'affichage de la commande:', error);
        showAlert('Impossible d\'afficher la commande.', 'danger');
    }
}

/**
 * Ouvre le modal pour modifier une commande
 * @param {number} orderId - ID de la commande à modifier
 */
async function editOrder(orderId) {
    try {
        const order = await db.findById(CONFIG.DB.COLLECTIONS.ORDERS, orderId);
        if (order) {
            openOrderModal(order);
        } else {
            showAlert('Commande non trouvée.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error);
        showAlert('Impossible de récupérer la commande.', 'danger');
    }
}

/**
 * Ouvre le modal de confirmation de suppression
 * @param {number} orderId - ID de la commande à supprimer
 */
function openDeleteModal(orderId) {
    currentOrderId = orderId;
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'block';
}

/**
 * Ferme le modal de confirmation de suppression
 */
function closeDeleteModal() {
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'none';
    currentOrderId = null;
}

/**
 * Confirme la suppression d'une commande
 */
async function confirmDeleteOrder() {
    if (!currentOrderId) return;
    
    try {
        await db.deleteOne(CONFIG.DB.COLLECTIONS.ORDERS, currentOrderId);
        showAlert('Commande supprimée avec succès.', 'success');
        closeDeleteModal();
        await loadOrders();
    } catch (error) {
        console.error('Erreur lors de la suppression de la commande:', error);
        showAlert('Impossible de supprimer la commande.', 'danger');
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