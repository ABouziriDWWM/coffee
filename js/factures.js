/**
 * Script pour la gestion des factures
 * Gère l'affichage, la création, la modification et la suppression des factures
 */

// Variables globales
let orders = [];
let currentInvoiceId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // S'assurer que la base de données est initialisée
        await db.init();
        
        // Charger les commandes pour le sélecteur
        await loadOrders();
        
        // Charger la liste des factures
        await loadInvoices();
        
        // Initialiser les gestionnaires d'événements
        initEventListeners();
        
        console.log('Page des factures initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page des factures:', error);
        showAlert('Une erreur est survenue lors du chargement de la page. Veuillez réessayer.', 'danger');
    }
});

/**
 * Initialise les gestionnaires d'événements
 */
function initEventListeners() {
    // Bouton pour générer une facture
    const generateInvoiceBtn = document.getElementById('generate-invoice-btn');
    generateInvoiceBtn.addEventListener('click', () => openInvoiceModal());
    
    // Bouton pour exporter les factures
    const exportInvoicesBtn = document.getElementById('export-invoices-btn');
    exportInvoicesBtn.addEventListener('click', exportInvoices);
    
    // Bouton pour filtrer les factures
    const filterBtn = document.getElementById('filter-btn');
    filterBtn.addEventListener('click', filterInvoices);
    
    // Sélecteur de commande
    const orderSelect = document.getElementById('order-select');
    orderSelect.addEventListener('change', loadOrderDetails);
    
    // Formulaire de facture
    const invoiceForm = document.getElementById('invoice-form');
    invoiceForm.addEventListener('submit', handleInvoiceSubmit);
    
    // Bouton pour annuler le formulaire
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', closeInvoiceModal);
    
    // Bouton pour fermer le modal
    const closeModal = document.querySelector('#invoice-modal .close-modal');
    closeModal.addEventListener('click', closeInvoiceModal);
    
    // Bouton pour fermer le modal de prévisualisation
    const closePreviewBtn = document.getElementById('close-preview-btn');
    closePreviewBtn.addEventListener('click', closePreviewModal);
    
    // Bouton pour imprimer la facture
    const printInvoiceBtn = document.getElementById('print-invoice-btn');
    printInvoiceBtn.addEventListener('click', printInvoice);
    
    // Bouton pour fermer le modal de prévisualisation
    const closePreviewModal2 = document.querySelector('#view-invoice-modal .close-modal');
    closePreviewModal2.addEventListener('click', closePreviewModal);
    
    // Boutons de confirmation de suppression
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.addEventListener('click', confirmDeleteInvoice);
    
    // Fermer les modals si on clique en dehors
    window.addEventListener('click', (event) => {
        const invoiceModal = document.getElementById('invoice-modal');
        const previewModal = document.getElementById('view-invoice-modal');
        const deleteModal = document.getElementById('confirm-delete-modal');
        
        if (event.target === invoiceModal) {
            closeInvoiceModal();
        } else if (event.target === previewModal) {
            closePreviewModal();
        } else if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

/**
 * Charge la liste des commandes depuis la base de données
 */
async function loadOrders() {
    try {
        orders = await db.findAll(CONFIG.DB.COLLECTIONS.ORDERS);
        
        // Filtrer les commandes terminées ou livrées
        const completedOrders = orders.filter(order => 
            order.status === 'Terminée' || order.status === 'Livrée'
        );
        
        // Trier les commandes par date (les plus récentes d'abord)
        completedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Remplir le sélecteur de commandes
        const orderSelect = document.getElementById('order-select');
        orderSelect.innerHTML = '<option value="">-- Choisir une commande --</option>';
        
        completedOrders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            
            // Formater la date
            const orderDate = new Date(order.date);
            const formattedDate = orderDate.toLocaleDateString('fr-FR');
            
            option.textContent = `Commande #${order.id} - ${formattedDate} - ${order.clientName} (${formatCurrency(order.total)})`;
            orderSelect.appendChild(option);
        });
        
        console.log(`${completedOrders.length} commandes chargées`);
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        showAlert('Impossible de charger les commandes. Veuillez réessayer.', 'danger');
    }
}

/**
 * Charge la liste des factures depuis la base de données
 */
async function loadInvoices() {
    try {
        const invoices = await db.findAll(CONFIG.DB.COLLECTIONS.INVOICES);
        
        // Trier les factures par date (les plus récentes d'abord)
        invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const invoicesList = document.getElementById('invoices-list');
        invoicesList.innerHTML = '';
        
        if (invoices.length === 0) {
            // Afficher un message si aucune facture n'existe
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="text-center">Aucune facture trouvée</td>`;
            invoicesList.appendChild(emptyRow);
        } else {
            // Afficher les factures
            invoices.forEach(invoice => {
                const row = document.createElement('tr');
                
                // Formater la date
                const invoiceDate = new Date(invoice.date);
                const formattedDate = invoiceDate.toLocaleDateString('fr-FR');
                
                // Définir la classe CSS en fonction du statut
                let statusClass = '';
                switch (invoice.status) {
                    case 'En attente':
                        statusClass = 'text-warning';
                        break;
                    case 'Payée':
                        statusClass = 'text-success';
                        break;
                    case 'Annulée':
                        statusClass = 'text-danger';
                        break;
                }
                
                row.innerHTML = `
                    <td>${invoice.id}</td>
                    <td>${formattedDate}</td>
                    <td>${invoice.clientName}</td>
                    <td>${formatCurrency(invoice.total)}</td>
                    <td><span class="${statusClass}">${invoice.status}</span></td>
                    <td class="table-actions">
                        <button class="action-btn view-btn" data-id="${invoice.id}" title="Voir"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-btn" data-id="${invoice.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${invoice.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                invoicesList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des factures:', error);
        showAlert('Impossible de charger les factures. Veuillez réessayer.', 'danger');
    }
}

/**
 * Ajoute les gestionnaires d'événements pour les boutons d'action
 */
function addActionButtonsEventListeners() {
    // Boutons pour voir une facture
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const invoiceId = parseInt(button.getAttribute('data-id'));
            viewInvoice(invoiceId);
        });
    });
    
    // Boutons pour modifier une facture
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const invoiceId = parseInt(button.getAttribute('data-id'));
            editInvoice(invoiceId);
        });
    });
    
    // Boutons pour supprimer une facture
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const invoiceId = parseInt(button.getAttribute('data-id'));
            openDeleteModal(invoiceId);
        });
    });
}

/**
 * Charge les détails d'une commande lorsqu'elle est sélectionnée
 */
async function loadOrderDetails() {
    const orderSelect = document.getElementById('order-select');
    const orderId = parseInt(orderSelect.value);
    const orderDetails = document.getElementById('order-details');
    
    if (!orderId) {
        orderDetails.style.display = 'none';
        return;
    }
    
    try {
        const order = await db.findById(CONFIG.DB.COLLECTIONS.ORDERS, orderId);
        
        if (order) {
            // Remplir les champs du formulaire
            document.getElementById('invoice-client').value = order.clientName;
            
            // Définir la date de facturation à aujourd'hui
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('invoice-date').value = today;
            
            // Remplir la table des produits
            const productsList = document.getElementById('invoice-products-list');
            productsList.innerHTML = '';
            
            order.products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.productName}</td>
                    <td>${product.quantity}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${formatCurrency(product.subtotal)}</td>
                `;
                productsList.appendChild(row);
            });
            
            // Afficher le total
            document.getElementById('invoice-total').textContent = formatCurrency(order.total);
            
            // Afficher les détails de la commande
            orderDetails.style.display = 'block';
        } else {
            showAlert('Commande non trouvée.', 'warning');
            orderDetails.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails de la commande:', error);
        showAlert('Impossible de charger les détails de la commande.', 'danger');
        orderDetails.style.display = 'none';
    }
}

/**
 * Ouvre le modal pour générer une facture
 * @param {Object} invoice - Facture à modifier (null pour une nouvelle facture)
 */
async function openInvoiceModal(invoice = null) {
    // Réinitialiser le formulaire
    const invoiceForm = document.getElementById('invoice-form');
    invoiceForm.reset();
    
    // Masquer les détails de la commande
    document.getElementById('order-details').style.display = 'none';
    
    // Définir l'ID de la facture courante
    currentInvoiceId = invoice ? invoice.id : null;
    document.getElementById('invoice-id').value = currentInvoiceId || '';
    
    // Mettre à jour le titre du modal
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = invoice ? 'Modifier la Facture' : 'Générer une Facture';
    
    // Remplir le formulaire si on modifie une facture existante
    if (invoice) {
        // Désactiver le sélecteur de commande
        const orderSelect = document.getElementById('order-select');
        orderSelect.value = invoice.orderId;
        orderSelect.disabled = true;
        
        // Charger les détails de la commande
        await loadOrderDetails();
        
        // Remplir les champs spécifiques à la facture
        document.getElementById('invoice-date').value = invoice.date;
        document.getElementById('invoice-notes').value = invoice.notes || '';
        document.getElementById('invoice-status').value = invoice.status;
    } else {
        // Activer le sélecteur de commande
        document.getElementById('order-select').disabled = false;
    }
    
    // Afficher le modal
    const invoiceModal = document.getElementById('invoice-modal');
    invoiceModal.style.display = 'block';
}

/**
 * Ferme le modal de facture
 */
function closeInvoiceModal() {
    const invoiceModal = document.getElementById('invoice-modal');
    invoiceModal.style.display = 'none';
    currentInvoiceId = null;
}

/**
 * Gère la soumission du formulaire de facture
 * @param {Event} event - Événement de soumission
 */
async function handleInvoiceSubmit(event) {
    event.preventDefault();
    
    try {
        // Récupérer les données du formulaire
        const invoiceId = document.getElementById('invoice-id').value;
        const orderId = parseInt(document.getElementById('order-select').value);
        const invoiceDate = document.getElementById('invoice-date').value;
        const invoiceNotes = document.getElementById('invoice-notes').value;
        const invoiceStatus = document.getElementById('invoice-status').value;
        
        // Vérifier qu'une commande est sélectionnée
        if (!orderId) {
            showAlert('Veuillez sélectionner une commande.', 'warning');
            return;
        }
        
        // Récupérer les détails de la commande
        const order = await db.findById(CONFIG.DB.COLLECTIONS.ORDERS, orderId);
        
        if (!order) {
            showAlert('Commande non trouvée.', 'warning');
            return;
        }
        
        // Créer l'objet facture
        const invoice = {
            orderId,
            clientName: order.clientName,
            date: invoiceDate,
            products: order.products,
            total: order.total,
            notes: invoiceNotes,
            status: invoiceStatus
        };
        
        // Enregistrer la facture
        if (invoiceId) {
            // Mettre à jour une facture existante
            await db.updateOne(CONFIG.DB.COLLECTIONS.INVOICES, parseInt(invoiceId), invoice);
            showAlert('Facture mise à jour avec succès.', 'success');
        } else {
            // Créer une nouvelle facture
            await db.insertOne(CONFIG.DB.COLLECTIONS.INVOICES, invoice);
            showAlert('Facture générée avec succès.', 'success');
        }
        
        // Fermer le modal et recharger les factures
        closeInvoiceModal();
        await loadInvoices();
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la facture:', error);
        showAlert('Une erreur est survenue lors de l\'enregistrement de la facture.', 'danger');
    }
}

/**
 * Affiche une facture dans le modal de prévisualisation
 * @param {number} invoiceId - ID de la facture à afficher
 */
async function viewInvoice(invoiceId) {
    try {
        const invoice = await db.findById(CONFIG.DB.COLLECTIONS.INVOICES, invoiceId);
        
        if (invoice) {
            // Remplir les champs de prévisualisation
            document.getElementById('preview-invoice-number').textContent = invoice.id;
            
            // Formater la date
            const invoiceDate = new Date(invoice.date);
            const formattedDate = invoiceDate.toLocaleDateString('fr-FR');
            document.getElementById('preview-invoice-date').textContent = formattedDate;
            
            document.getElementById('preview-invoice-status').textContent = invoice.status;
            document.getElementById('preview-client-name').textContent = invoice.clientName;
            document.getElementById('preview-notes').textContent = invoice.notes || 'Aucune note';
            
            // Remplir la table des produits
            const productsList = document.getElementById('preview-products-list');
            productsList.innerHTML = '';
            
            invoice.products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.productName}</td>
                    <td>${product.quantity}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${formatCurrency(product.subtotal)}</td>
                `;
                productsList.appendChild(row);
            });
            
            // Afficher le total
            document.getElementById('preview-total').textContent = formatCurrency(invoice.total);
            
            // Afficher le modal de prévisualisation
            const previewModal = document.getElementById('view-invoice-modal');
            previewModal.style.display = 'block';
        } else {
            showAlert('Facture non trouvée.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de l\'affichage de la facture:', error);
        showAlert('Impossible d\'afficher la facture.', 'danger');
    }
}

/**
 * Ferme le modal de prévisualisation
 */
function closePreviewModal() {
    const previewModal = document.getElementById('view-invoice-modal');
    previewModal.style.display = 'none';
}

/**
 * Imprime la facture
 */
function printInvoice() {
    const previewContent = document.getElementById('invoice-preview').innerHTML;
    
    // Créer une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Facture - Café Parisien</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                h2, h3, h4 {
                    color: #6F4E37;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .text-right {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .d-flex {
                    display: flex;
                    justify-content: space-between;
                }
                .mb-3 {
                    margin-bottom: 15px;
                }
                .mt-3 {
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            ${previewContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Imprimer après le chargement de la page
    printWindow.onload = function() {
        printWindow.print();
        printWindow.onafterprint = function() {
            printWindow.close();
        };
    };
}

/**
 * Ouvre le modal pour modifier une facture
 * @param {number} invoiceId - ID de la facture à modifier
 */
async function editInvoice(invoiceId) {
    try {
        const invoice = await db.findById(CONFIG.DB.COLLECTIONS.INVOICES, invoiceId);
        if (invoice) {
            openInvoiceModal(invoice);
        } else {
            showAlert('Facture non trouvée.', 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de la facture:', error);
        showAlert('Impossible de récupérer la facture.', 'danger');
    }
}

/**
 * Ouvre le modal de confirmation de suppression
 * @param {number} invoiceId - ID de la facture à supprimer
 */
function openDeleteModal(invoiceId) {
    currentInvoiceId = invoiceId;
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'block';
}

/**
 * Ferme le modal de confirmation de suppression
 */
function closeDeleteModal() {
    const deleteModal = document.getElementById('confirm-delete-modal');
    deleteModal.style.display = 'none';
    currentInvoiceId = null;
}

/**
 * Confirme la suppression d'une facture
 */
async function confirmDeleteInvoice() {
    if (!currentInvoiceId) return;
    
    try {
        await db.deleteOne(CONFIG.DB.COLLECTIONS.INVOICES, currentInvoiceId);
        showAlert('Facture supprimée avec succès.', 'success');
        closeDeleteModal();
        await loadInvoices();
    } catch (error) {
        console.error('Erreur lors de la suppression de la facture:', error);
        showAlert('Impossible de supprimer la facture.', 'danger');
    }
}

/**
 * Filtre les factures selon les critères spécifiés
 */
async function filterInvoices() {
    try {
        // Récupérer les critères de filtrage
        const startDate = document.getElementById('filter-date-start').value;
        const endDate = document.getElementById('filter-date-end').value;
        const clientName = document.getElementById('filter-client').value.toLowerCase();
        
        // Récupérer toutes les factures
        const allInvoices = await db.findAll(CONFIG.DB.COLLECTIONS.INVOICES);
        
        // Filtrer les factures
        const filteredInvoices = allInvoices.filter(invoice => {
            // Filtrer par date de début
            if (startDate && invoice.date < startDate) {
                return false;
            }
            
            // Filtrer par date de fin
            if (endDate && invoice.date > endDate) {
                return false;
            }
            
            // Filtrer par nom de client
            if (clientName && !invoice.clientName.toLowerCase().includes(clientName)) {
                return false;
            }
            
            return true;
        });
        
        // Trier les factures par date (les plus récentes d'abord)
        filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Afficher les factures filtrées
        const invoicesList = document.getElementById('invoices-list');
        invoicesList.innerHTML = '';
        
        if (filteredInvoices.length === 0) {
            // Afficher un message si aucune facture ne correspond aux critères
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="text-center">Aucune facture ne correspond aux critères de recherche</td>`;
            invoicesList.appendChild(emptyRow);
        } else {
            // Afficher les factures filtrées
            filteredInvoices.forEach(invoice => {
                const row = document.createElement('tr');
                
                // Formater la date
                const invoiceDate = new Date(invoice.date);
                const formattedDate = invoiceDate.toLocaleDateString('fr-FR');
                
                // Définir la classe CSS en fonction du statut
                let statusClass = '';
                switch (invoice.status) {
                    case 'En attente':
                        statusClass = 'text-warning';
                        break;
                    case 'Payée':
                        statusClass = 'text-success';
                        break;
                    case 'Annulée':
                        statusClass = 'text-danger';
                        break;
                }
                
                row.innerHTML = `
                    <td>${invoice.id}</td>
                    <td>${formattedDate}</td>
                    <td>${invoice.clientName}</td>
                    <td>${formatCurrency(invoice.total)}</td>
                    <td><span class="${statusClass}">${invoice.status}</span></td>
                    <td class="table-actions">
                        <button class="action-btn view-btn" data-id="${invoice.id}" title="Voir"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-btn" data-id="${invoice.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${invoice.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                
                invoicesList.appendChild(row);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons d'action
            addActionButtonsEventListeners();
        }
        
        showAlert(`${filteredInvoices.length} factures trouvées.`, 'success');
    } catch (error) {
        console.error('Erreur lors du filtrage des factures:', error);
        showAlert('Impossible de filtrer les factures.', 'danger');
    }
}

/**
 * Exporte les factures au format CSV
 */
function exportInvoices() {
    try {
        // Récupérer les factures filtrées ou toutes les factures
        const invoiceRows = document.querySelectorAll('#invoices-list tr');
        
        if (invoiceRows.length === 0) {
            showAlert('Aucune facture à exporter.', 'warning');
            return;
        }
        
        // Créer l'en-tête du CSV
        let csvContent = 'N° Facture,Date,Client,Montant,Statut\n';
        
        // Ajouter les données des factures
        invoiceRows.forEach(row => {
            const columns = row.querySelectorAll('td');
            
            // Vérifier si c'est une ligne de données ou un message "Aucune facture trouvée"
            if (columns.length === 6) {
                const invoiceId = columns[0].textContent;
                const date = columns[1].textContent;
                const client = columns[2].textContent;
                const amount = columns[3].textContent;
                const status = columns[4].textContent.trim();
                
                // Échapper les virgules dans les champs
                const escapedClient = client.includes(',') ? `"${client}"` : client;
                
                csvContent += `${invoiceId},${date},${escapedClient},${amount},${status}\n`;
            }
        });
        
        // Créer un objet Blob pour le téléchargement
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Créer un lien de téléchargement
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `factures_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        // Ajouter le lien au document, cliquer dessus, puis le supprimer
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Factures exportées avec succès.', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'exportation des factures:', error);
        showAlert('Impossible d\'exporter les factures.', 'danger');
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