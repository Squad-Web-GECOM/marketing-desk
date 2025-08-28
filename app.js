// Desk Booking Application
$(document).ready(function() {
  // Global variables
  let currentUser = null;
  let selectedDate = '';
  let availableDates = [];
  let desks = [];
  let reservations = [];
  let loading = false;
  let supabase = null;

  // Initialize Supabase
  const SUPABASE_URL = 'https://gcqitocopjdilxgupril.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcWl0b2NvcGpkaWx4Z3VwcmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODM5MTEsImV4cCI6MjA3MTk1OTkxMX0.GTqh--djGKQfCgCnlpRNNx75KMEXNImSPcs8OQ7K5gc';
  
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Initialize application
  function init() {
    // Check for Liferay user
    if (window.LIFERAY_USER?.id && window.LIFERAY_USER?.name) {
      currentUser = window.LIFERAY_USER;
      $('#userName').text(currentUser.name);
      
      // Generate available dates
      generateAvailableDates();
      
      // Load desks
      loadDesks();
      
      // Show main content
      $('body > .container').show();
      $('#authError').hide();
    } else {
      // Show authentication error
      $('body > .container').hide();
      $('#authError').show();
      return;
    }
  }

  // Generate available dates (today + 7 days, weekdays only)
  function generateAvailableDates() {
    availableDates = [];
    const today = new Date();
    
    for (let i = 0; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Check if it's a weekday (Monday = 1, Friday = 5)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        availableDates.push(date.toISOString().split('T')[0]);
      }
    }
    
    selectedDate = availableDates[0] || '';
    renderDateButtons();
    if (selectedDate) {
      loadReservations();
    }
  }

  // Render date selection buttons
  function renderDateButtons() {
    const container = $('#dateButtons');
    container.empty();
    
    availableDates.forEach(function(date) {
      const dateObj = new Date(date);
      const dayName = getDayName(date);
      const formattedDate = formatDate(date);
      const todayBadge = isToday(date) ? '<span class="badge badge-today ml-1">Hoje</span>' : '';
      
      const button = $(`
        <button type="button" class="btn btn-outline-primary btn-sm mr-2 mb-2 date-button ${selectedDate === date ? 'active' : ''}" data-date="${date}">
          <div class="d-flex flex-column align-items-center">
            <span class="font-weight-bold">${dayName}</span>
            <span class="small">${formattedDate}</span>
            ${todayBadge}
          </div>
        </button>
      `);
      
      container.append(button);
    });
    
    updateSelectedDateDisplay();
  }

  // Update selected date display
  function updateSelectedDateDisplay() {
    if (selectedDate) {
      $('#selectedDateInfo').show();
      $('#selectedDateText').text(formatDate(selectedDate));
      $('#deskGrid').show();
      $('#deskGridDate').text(formatDate(selectedDate));
    } else {
      $('#selectedDateInfo').hide();
      $('#deskGrid').hide();
    }
  }

  // Load desks from database
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
      showMessage('error', 'Não foi possível carregar as mesas. Tente novamente.');
    }
  }

  // Load reservations for selected date
  async function loadReservations() {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', selectedDate)
        .is('canceled_at', null);

      if (error) throw error;
      reservations = data || [];
      renderDeskGrid();
    } catch (error) {
      console.error('Error loading reservations:', error);
      showMessage('error', 'Não foi possível carregar as reservas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Render desk grid
  function renderDeskGrid() {
    const container = $('#desksContainer');
    container.empty();
    
    if (desks.length === 0) {
      $('#noDesksMessage').show();
      return;
    }
    
    $('#noDesksMessage').hide();
    
    desks.forEach(function(desk) {
      const reservation = getDeskReservation(desk.number);
      const isOccupied = !!reservation;
      const isMyReservation = reservation?.user_id === currentUser.id;
      const canBook = !isOccupied && canUserBookMore();
      
      let cardClass = 'desk-card ';
      let badgeClass = '';
      let badgeText = '';
      let buttonHtml = '';
      
      if (isMyReservation) {
        cardClass += 'my-reservation';
        badgeClass = 'badge-my-reservation';
        badgeText = 'Minha Reserva';
        buttonHtml = `
          <button type="button" class="btn btn-danger btn-sm btn-block" onclick="cancelReservation(${reservation.id}, ${desk.number})" ${loading ? 'disabled' : ''}>
            ${loading ? 'Cancelando...' : 'Cancelar'}
          </button>
        `;
      } else if (isOccupied) {
        cardClass += 'occupied';
        badgeClass = 'badge-occupied';
        badgeText = 'Ocupada';
        buttonHtml = `
          <button type="button" class="btn btn-outline-secondary btn-sm btn-block" disabled>
            Ocupada
          </button>
        `;
      } else if (canBook) {
        cardClass += 'available';
        badgeClass = 'badge-available';
        badgeText = 'Livre';
        buttonHtml = `
          <button type="button" class="btn btn-primary btn-sm btn-block" onclick="makeReservation(${desk.number})" ${loading ? 'disabled' : ''}>
            ${loading ? 'Reservando...' : 'Reservar'}
          </button>
        `;
      } else {
        cardClass += 'unavailable';
        badgeClass = 'badge-occupied';
        badgeText = 'Não disponível';
        buttonHtml = `
          <button type="button" class="btn btn-outline-secondary btn-sm btn-block" disabled>
            Não disponível
          </button>
        `;
      }
      
      const occupantInfo = isOccupied ? `
        <p class="text-sm text-muted mb-3">
          <svg class="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          ${reservation.user_name}
        </p>
      ` : '';
      
      const card = $(`
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div class="card ${cardClass}">
            <div class="card-header">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="card-title mb-0">Mesa ${desk.number}</h6>
                <span class="badge ${badgeClass}">${badgeText}</span>
              </div>
            </div>
            <div class="card-body">
              ${occupantInfo}
              <div class="mt-auto">
                ${buttonHtml}
              </div>
            </div>
          </div>
        </div>
      `);
      
      container.append(card);
    });
  }

  // Make a reservation
  window.makeReservation = async function(deskNumber) {
    if (!currentUser || !selectedDate) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('reservations')
        .insert({
          date: selectedDate,
          desk_number: deskNumber,
          user_id: currentUser.id,
          user_name: currentUser.name
        });

      if (error) {
        if (error.message.includes('reservations_date_user_id_key')) {
          showMessage('warning', 'Você já possui reserva neste dia.');
        } else if (error.message.includes('reservations_date_desk_number_key')) {
          showMessage('warning', 'Mesa já ocupada por outra pessoa.');
        } else {
          throw error;
        }
        return;
      }

      showMessage('success', `Reserva confirmada na mesa ${deskNumber} para ${formatDate(selectedDate)}.`);
      await loadReservations();
    } catch (error) {
      console.error('Error making reservation:', error);
      showMessage('error', 'Não foi possível completar a operação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel a reservation
  window.cancelReservation = async function(reservationId, deskNumber) {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('reservations')
        .update({
          canceled_at: new Date().toISOString(),
          canceled_by: currentUser.id
        })
        .eq('id', reservationId)
        .eq('user_id', currentUser.id); // Security: only allow canceling own reservations

      if (error) throw error;

      showMessage('success', `Reserva cancelada na mesa ${deskNumber}.`);
      await loadReservations();
    } catch (error) {
      console.error('Error canceling reservation:', error);
      showMessage('error', 'Não foi possível completar a operação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  function getDayName(dateString) {
    const date = new Date(dateString);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  }

  function isToday(dateString) {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  }

  function getUserReservationForDate() {
    return reservations.find(r => r.user_id === currentUser?.id);
  }

  function getDeskReservation(deskNumber) {
    return reservations.find(r => r.desk_number === deskNumber);
  }

  function canUserBookMore() {
    return !getUserReservationForDate();
  }

  function setLoading(isLoading) {
    loading = isLoading;
    if (isLoading) {
      $('#loadingSpinner').show();
      $('#desksContainer').hide();
    } else {
      $('#loadingSpinner').hide();
      $('#desksContainer').show();
    }
  }

  function showMessage(type, text) {
    const alert = $('#messageAlert');
    const icon = $('#messageIcon');
    const messageText = $('#messageText');
    
    // Clear existing classes
    alert.removeClass('alert-success alert-danger alert-warning');
    
    // Set appropriate classes and icon based on type
    switch (type) {
      case 'success':
        alert.addClass('alert-success');
        icon.html('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>');
        break;
      case 'error':
        alert.addClass('alert-danger');
        icon.html('<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>');
        break;
      case 'warning':
        alert.addClass('alert-warning');
        icon.html('<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>');
        break;
    }
    
    messageText.text(text);
    alert.show();
    
    // Auto-hide after 5 seconds
    setTimeout(function() {
      alert.fadeOut();
    }, 5000);
  }

  // Event handlers
  $(document).on('click', '.date-button', function() {
    const date = $(this).data('date');
    selectedDate = date;
    
    // Update button states
    $('.date-button').removeClass('active');
    $(this).addClass('active');
    
    updateSelectedDateDisplay();
    loadReservations();
  });

  $('#todayBtn').click(function() {
    if (availableDates.length > 0) {
      selectedDate = availableDates[0];
      renderDateButtons();
      loadReservations();
    }
  });

  $('#nextWeekBtn').click(function() {
    if (availableDates.length > 0) {
      selectedDate = availableDates[availableDates.length - 1];
      renderDateButtons();
      loadReservations();
    }
  });

  // Initialize the application
  init();
});