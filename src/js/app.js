(function($) {
    'use strict';

    // --- CONFIG ---
    const SUPABASE_URL = 'https://gcqitocopjdilxgupril.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcWl0b2NvcGpkaWx4Z3VwcmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODM5MTEsImV4cCI6MjA3MTk1OTkxMX0.GTqh--djGKQfCgCnlpRNNx75KMEXNImSPcs8OQ7K5gc';

    // --- DOM Elements ---
    const loginView = $('#login-view');
    const appView = $('#app-view');
    const loginForm = $('#login-form');
    const emailInput = $('#email');
    const userNameDisplay = $('#user-name');
    const logoutBtn = $('#logout-btn');
    const dateSelector = $('#date-selector');
    const selectedDateDisplay = $('#selected-date-display');
    const deskGrid = $('#desk-grid');
    const alertContainer = $('#alert-container');

    // --- State ---
    let currentUser = null;
    let selectedDate = '';
    let desks = [];
    let reservations = [];
    let availableDates = [];

    // --- Supabase Client ---
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- INITIALIZATION ---
    function init() {
        const savedUser = localStorage.getItem('sicoob-user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showAppView();
        } else {
            showLoginView();
        }
        attachEventListeners();
    }

    function attachEventListeners() {
        loginForm.on('submit', handleLoginSubmit);
        logoutBtn.on('click', handleLogout);
        // Event listeners for date and desk buttons are attached after they are rendered
    }

    // --- VIEW MANAGEMENT ---
    function showLoginView() {
        loginView.show();
        appView.hide();
    }

    function showAppView() {
        loginView.hide();
        appView.show();
        userNameDisplay.text(currentUser.name);
        generateAvailableDates();
        loadDesks().then(loadReservations).then(renderPage);
    }

    // --- RENDER FUNCTIONS ---
    function renderPage() {
        renderDateSelector();
        renderDesks();
    }

    function renderDateSelector() {
        selectedDateDisplay.text(formatDate(selectedDate));
        const datesHtml = availableDates.map(date => `
            <button class="btn btn-secondary date-selector-btn ${selectedDate === date ? 'active' : ''}" data-date="${date}">
                ${formatDate(date)}
            </button>
        `).join('');
        dateSelector.html(datesHtml);
        $('.date-selector-btn').on('click', handleDateSelect);
    }

    function renderDesks() {
        deskGrid.html('<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Carregando...</span></div></div>');
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
                buttonHtml = '<button class="btn btn-sm btn-dark" disabled>Ocupada</button>';
            } else if (canBook) {
                buttonHtml = `<button class="btn btn-sm btn-primary make-reservation-btn" data-desk-number="${desk.number}">Reservar</button>`;
            } else {
                 cardClass = 'occupied';
                buttonHtml = '<button class="btn btn-sm btn-dark" disabled>Indisponível</button>';
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

        deskGrid.html(`<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 gap-row-4">${desksHtml}</div>`);
        $('.make-reservation-btn').on('click', handleMakeReservation);
        $('.cancel-reservation-btn').on('click', handleCancelReservation);
    }

    // --- EVENT HANDLERS ---
    function handleLoginSubmit(e) {
        e.preventDefault();
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
        showAppView();
    }

    function handleLogout() {
        currentUser = null;
        localStorage.removeItem('sicoob-user');
        showLoginView();
    }

    function handleDateSelect(e) {
        selectedDate = $(e.currentTarget).data('date');
        loadReservations().then(renderPage);
    }

    async function handleMakeReservation(e) {
        const deskNumber = $(e.currentTarget).data('desk-number');
        await makeReservation(deskNumber);
    }

    async function handleCancelReservation(e) {
        const reservationId = $(e.currentTarget).data('reservation-id');
        await cancelReservation(reservationId);
    }

    // --- API CALLS ---
    async function loadDesks() {
        try {
            const { data, error } = await supabase.from('desks').select('*').eq('is_active', true).order('number');
            if (error) throw error;
            desks = data || [];
        } catch (error) {
            console.error('Error loading desks:', error);
            showAlert('Não foi possível carregar as mesas.', 'danger');
        }
    }

    async function loadReservations() {
        try {
            const { data, error } = await supabase.from('reservations').select('*').eq('date', selectedDate).is('canceled_at', null);
            if (error) throw error;
            reservations = data || [];
        } catch (error) {
            console.error('Error loading reservations:', error);
            showAlert('Não foi possível carregar as reservas.', 'danger');
        }
    }

    async function makeReservation(deskNumber) {
        try {
            const { error } = await supabase.from('reservations').insert({ date: selectedDate, desk_number: deskNumber, user_id: currentUser.id, user_name: currentUser.name });
            if (error) {
                if (error.message.includes('reservations_date_user_id_key')) {
                    showAlert('Você já possui uma reserva para este dia.', 'warning');
                } else {
                     showAlert('Esta mesa já foi reservada. Por favor, atualize a página.', 'warning');
                }
                throw error;
            }
            showAlert(`Reserva confirmada na ${getDeskName(deskNumber)} para ${formatDate(selectedDate)}.`, 'success');
            await loadReservations();
            renderDesks();
        } catch (error) {
            console.error('Error making reservation:', error);
        }
    }

    async function cancelReservation(reservationId) {
        try {
            const { error } = await supabase.from('reservations').update({ canceled_at: new Date().toISOString(), canceled_by: currentUser.id }).eq('id', reservationId).eq('user_id', currentUser.id);
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
    function showAlert(message, type = 'info') {
        const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        alertContainer.html(alertHtml);
    }

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
        if (dates.length > 0 && !selectedDate) {
            selectedDate = dates[0];
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    function getDeskName(deskNumber) {
        if (deskNumber >= 1 && deskNumber <= 3) return `Mesa A${deskNumber}`;
        if (deskNumber >= 4 && deskNumber <= 7) return `Mesa B${deskNumber - 3}`;
        if (deskNumber >= 8 && deskNumber <= 12) return `Mesa C${deskNumber - 7}`;
        if (deskNumber >= 13 && deskNumber <= 18) return `Mesa D${deskNumber - 12}`;
        if (deskNumber >= 19 && deskNumber <= 22) return `Mesa E${deskNumber - 18}`;
        return `Mesa ${deskNumber}`;
    }

    // --- KICKOFF ---
    $(document).ready(init);

})(jQuery);
