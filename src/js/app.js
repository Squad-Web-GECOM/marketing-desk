(function($) {
    'use strict';

    // --- CONFIG ---
    const SUPABASE_URL = 'https://gcqitocopjdilxgupril.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcWl0b2NvcGpkaWx4Z3VwcmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODM5MTEsImV4cCI6MjA3MTk1OTkxMX0.GTqh--djGKQfCgCnlpRNNx75KMEXNImSPcs8OQ7K5gc';

    // --- DOM Elements ---
    const app = $('#app');

    // --- State ---
    let currentUser = null;
    let selectedDate = '';
    let desks = [];
    let reservations = [];
    let availableDates = [];

    // --- Supabase Client ---
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- FUNCTIONS ---

    /**
     * Initializes the application
     */
    function init() {
        console.log('App initialized');
        // Check for user in localStorage
        const savedUser = localStorage.getItem('sicoob-user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            renderApp();
        } else {
            renderLogin();
        }
    }

    // --- RENDER FUNCTIONS ---

    /**
     * Renders the main application layout
     */
    function renderApp() {
        // Main app layout will be rendered here
        app.html('<h1>Loading...</h1>');
        generateAvailableDates();
        loadDesks().then(() => {
            renderFullApp();
        });
    }

    /**
     * Renders the login form
     */
    function renderLogin() {
        const loginHtml = `
            <div class="container vh-100 d-flex justify-content-center align-items-center">
                <div class="card shadow-sm" style="width: 22rem;">
                    <div class="card-body p-4">
                        <h5 class="card-title text-center mb-4">Login</h5>
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" placeholder="seuemail@sicoob.com.br" required>
                                <div class="invalid-feedback"></div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Entrar</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        app.html(loginHtml);
        // Add event listener for the form
        $('#login-form').on('submit', handleLoginSubmit);
    }

    /**
     * Renders the full application UI
     */
    function renderFullApp() {
        const appHtml = `
            <header class="header py-3">
                <div class="container d-flex justify-content-between align-items-center">
                    <h1 class="h4 mb-0">Ferramenta de agendamento de mesas da área de marketing</h1>
                    <div>
                        <span class="me-3">Olá, ${currentUser.name}</span>
                        <button id="logout-btn" class="btn btn-sm btn-outline-light">Sair</button>
                    </div>
                </div>
            </header>
            <main class="container py-4">
                <div id="alert-container"></div>
                <div class="card shadow-sm mb-4">
                    <div class="card-header">
                        <h5>Selecionar Data</h5>
                    </div>
                    <div class="card-body">
                        <div id="date-selector" class="d-flex flex-wrap gap-2">
                            ${availableDates.map(date => `
                                <button class="btn btn-outline-primary date-selector-btn ${selectedDate === date ? 'active' : ''}" data-date="${date}">
                                    ${formatDate(date)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="text-center mb-4">
                    <button class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#mapModal">
                        Verifique o Mapa das Mesas
                    </button>
                </div>
                <div class="card shadow-sm">
                    <div class="card-header">
                        <h5>Mesas Disponíveis - ${formatDate(selectedDate)}</h5>
                    </div>
                    <div id="desk-grid" class="card-body">
                        <div class="d-flex justify-content-center">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Carregando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <div class="modal fade map-modal" id="mapModal" tabindex="-1" aria-labelledby="mapModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="mapModalLabel">Mapa das Mesas - Marketing</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="https://squad-web-gecom.github.io/marketing-desk/mapa-mesas-marketing.jpg" class="img-fluid" alt="Mapa das mesas">
                        </div>
                    </div>
                </div>
            </div>
        `;
        app.html(appHtml);
        loadReservations().then(renderDesks);

        // Add event listeners
        $('#logout-btn').on('click', handleLogout);
        $('.date-selector-btn').on('click', handleDateSelect);
    }


    // --- EVENT HANDLERS ---

    /**
     * Handles the login form submission
     * @param {Event} e
     */
    function handleLoginSubmit(e) {
        e.preventDefault();
        const emailInput = $('#email');
        const email = emailInput.val().trim();
        const invalidFeedback = emailInput.next('.invalid-feedback');

        if (!email.endsWith('@sicoob.com.br')) {
            emailInput.addClass('is-invalid');
            invalidFeedback.text('Email deve terminar com @sicoob.com.br');
            return;
        }

        emailInput.removeClass('is-invalid');
        const name = email.split('@')[0];
        currentUser = { id: email, name: name, email: email };
        localStorage.setItem('sicoob-user', JSON.stringify(currentUser));
        renderApp();
    }


    // --- API CALLS ---

    /**
     * Loads desks from Supabase
     */
    async function loadDesks() {
        try {
            const { data, error } = await supabase
                .from('desks')
                .select('*')
                .eq('is_active', true)
                .order('number');
            if (error) throw error;
            desks = data || [];
        } catch (error) {
            console.error('Error loading desks:', error);
            // Render error message
        }
    }

    // --- HELPERS ---

    /**
     * Generates the available dates for booking
     */
    function generateAvailableDates() {
        const dates = [];
        const today = new Date();
        let daysAdded = 0;
        let i = 0;

        while (daysAdded < 6 && i < 14) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayOfWeek = date.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                const dateString = date.toISOString().split('T')[0];
                dates.push(dateString);
                daysAdded++;
            }
            i++;
        }
        availableDates = dates;
        if (dates.length > 0) {
            selectedDate = dates[0];
        }
    }


    /**
     * Renders the grid of desks
     */
    function renderDesks() {
        const deskGrid = $('#desk-grid');
        if (desks.length === 0) {
            deskGrid.html('<p class="text-center text-muted">Nenhuma mesa ativa encontrada.</p>');
            return;
        }

        const userReservation = reservations.find(r => r.user_id === currentUser.id);

        const desksHtml = desks.map(desk => {
            const reservation = reservations.find(r => r.desk_number === desk.number);
            const isOccupied = !!reservation;
            const isMyReservation = isOccupied && reservation.user_id === currentUser.id;
            const canBook = !isOccupied && !userReservation;

            let cardClass = 'available';
            let statusText = 'Livre';
            let buttonHtml = '';

            if (isMyReservation) {
                cardClass = 'my-reservation';
                statusText = 'Minha Reserva';
                buttonHtml = `<button class="btn btn-sm btn-danger cancel-reservation-btn" data-reservation-id="${reservation.id}">Cancelar</button>`;
            } else if (isOccupied) {
                cardClass = 'occupied';
                statusText = `Ocupada por ${reservation.user_name}`;
                buttonHtml = '<button class="btn btn-sm btn-secondary" disabled>Ocupada</button>';
            } else if (canBook) {
                buttonHtml = `<button class="btn btn-sm btn-primary make-reservation-btn" data-desk-number="${desk.number}">Reservar</button>`;
            } else {
                 cardClass = 'occupied';
                buttonHtml = '<button class="btn btn-sm btn-secondary" disabled>Indisponível</button>';
            }

            return `
                <div class="col">
                    <div class="card h-100 desk-card ${cardClass}">
                        <div class="card-body">
                            <h5 class="card-title">${getDeskName(desk.number)}</h5>
                            <p class="card-text">${statusText}</p>
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        deskGrid.html(`<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">${desksHtml}</div>`);

        // Add event listeners for the new buttons
        $('.make-reservation-btn').on('click', handleMakeReservation);
        $('.cancel-reservation-btn').on('click', handleCancelReservation);
    }

    // --- EVENT HANDLERS ---

    /**
     * Handles the logout button click
     */
    function handleLogout() {
        currentUser = null;
        localStorage.removeItem('sicoob-user');
        renderLogin();
    }

    /**
     * Handles the date selection
     * @param {Event} e
     */
    function handleDateSelect(e) {
        selectedDate = $(e.currentTarget).data('date');
        $('.date-selector-btn').removeClass('active');
        $(e.currentTarget).addClass('active');
        renderFullApp();
    }

    /**
     * Handles the make reservation button click
     * @param {Event} e
     */
    async function handleMakeReservation(e) {
        const deskNumber = $(e.currentTarget).data('desk-number');
        await makeReservation(deskNumber);
    }

    /**
     * Handles the cancel reservation button click
     * @param {Event} e
     */
    async function handleCancelReservation(e) {
        const reservationId = $(e.currentTarget).data('reservation-id');
        await cancelReservation(reservationId);
    }


    // --- API CALLS ---

    /**
     * Loads reservations from Supabase for the selected date
     */
    async function loadReservations() {
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .eq('date', selectedDate)
                .is('canceled_at', null);
            if (error) throw error;
            reservations = data || [];
        } catch (error) {
            console.error('Error loading reservations:', error);
            showAlert('Não foi possível carregar as reservas.', 'danger');
        }
    }

    /**
     * Creates a new reservation
     * @param {number} deskNumber
     */
    async function makeReservation(deskNumber) {
        try {
            const { error } = await supabase
                .from('reservations')
                .insert({
                    date: selectedDate,
                    desk_number: deskNumber,
                    user_id: currentUser.id,
                    user_name: currentUser.name
                });
            if (error) throw error;
            showAlert(`Reserva confirmada na ${getDeskName(deskNumber)} para ${formatDate(selectedDate)}.`, 'success');
            await loadReservations();
            renderDesks();
        } catch (error) {
            console.error('Error making reservation:', error);
            showAlert('Não foi possível completar a operação. Tente novamente.', 'danger');
        }
    }

    /**
     * Cancels a reservation
     * @param {number} reservationId
     */
    async function cancelReservation(reservationId) {
        try {
            const { error } = await supabase
                .from('reservations')
                .update({ canceled_at: new Date().toISOString(), canceled_by: currentUser.id })
                .eq('id', reservationId)
                .eq('user_id', currentUser.id);
            if (error) throw error;
            showAlert('Reserva cancelada com sucesso.', 'success');
            await loadReservations();
            renderDesks();
        } catch (error) {
            console.error('Error canceling reservation:', error);
            showAlert('Não foi possível cancelar a reserva.', 'danger');
        }
    }


    // --- HELPERS ---

    /**
     * Shows an alert message
     * @param {string} message
     * @param {string} type
     */
    function showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('#alert-container').html(alertHtml);
    }

    /**
     * Formats a date string to dd/mm/yyyy
     * @param {string} dateString
     * @returns {string}
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    /**
     * Gets the desk name from the desk number
     * @param {number} deskNumber
     * @returns {string}
     */
    function getDeskName(deskNumber) {
        if (deskNumber >= 1 && deskNumber <= 3) {
            return `Mesa A${deskNumber}`;
        } else if (deskNumber >= 4 && deskNumber <= 7) {
            return `Mesa B${deskNumber - 3}`;
        } else if (deskNumber >= 8 && deskNumber <= 12) {
            return `Mesa C${deskNumber - 7}`;
        } else if (deskNumber >= 13 && deskNumber <= 18) {
            return `Mesa D${deskNumber - 12}`;
        } else if (deskNumber >= 19 && deskNumber <= 22) {
            return `Mesa E${deskNumber - 18}`;
        }
        return `Mesa ${deskNumber}`;
    }


    // --- INITIALIZATION ---
    $(document).ready(init);

})(jQuery);
