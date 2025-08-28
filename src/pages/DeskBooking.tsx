import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Calendar, User, MapPin, LogOut, Building2 } from 'lucide-react';
import LoginModal from '@/components/LoginModal';

// Types
interface Desk {
  id: number;
  number: number;
  is_active: boolean;
  specs?: any;
}

interface Reservation {
  id: number;
  date: string;
  desk_number: number;
  user_id: string;
  user_name: string;
  created_at: string;
  canceled_at?: string;
  canceled_by?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const DeskBooking: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Initialize user and dates
  useEffect(() => {
    // Check for logged user in localStorage
    const savedUser = localStorage.getItem('sicoob-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('sicoob-user');
        setShowLoginModal(true);
      }
    } else {
      setShowLoginModal(true);
    }

    // Generate available dates (today + 7 days, weekdays only)
    generateAvailableDates();
    
    // Load desks
    loadDesks();
  }, []);

  // Load reservations when date changes
  useEffect(() => {
    if (selectedDate && currentUser) {
      loadReservations();
    }
  }, [selectedDate, currentUser]);

  const generateAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();
    let daysAdded = 0;
    let i = 0;
    
    while (daysAdded < 6) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Check if it's a weekday (Monday = 1, Friday = 5)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(date.toISOString().split('T')[0]);
        daysAdded++;
      }
      i++;
    }
    
    setAvailableDates(dates);
    setSelectedDate(dates[0] || '');
  };

  const loadDesks = async () => {
    try {
      const { data, error } = await supabase
        .from('desks')
        .select('*')
        .eq('is_active', true)
        .order('number');

      if (error) throw error;
      setDesks(data || []);
    } catch (error) {
      console.error('Error loading desks:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível carregar as mesas. Tente novamente.'
      });
    }
  };

  const loadReservations = async () => {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', selectedDate)
        .is('canceled_at', null);

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível carregar as reservas. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const makeReservation = async (deskNumber: number) => {
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
          setMessage({
            type: 'warning',
            text: 'Você já possui reserva neste dia.'
          });
        } else if (error.message.includes('reservations_date_desk_number_key')) {
          setMessage({
            type: 'warning',
            text: 'Mesa já ocupada por outra pessoa.'
          });
        } else {
          throw error;
        }
        return;
      }

      setMessage({
        type: 'success',
        text: `Reserva confirmada na mesa ${deskNumber} para ${formatDate(selectedDate)}.`
      });
      
      await loadReservations();
    } catch (error) {
      console.error('Error making reservation:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível completar a operação. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (reservationId: number, deskNumber: number) => {
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

      setMessage({
        type: 'success',
        text: `Reserva cancelada na mesa ${deskNumber}.`
      });
      
      await loadReservations();
    } catch (error) {
      console.error('Error canceling reservation:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível completar a operação. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getDayName = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  const isToday = (dateString: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const getUserReservationForDate = (): Reservation | undefined => {
    return reservations.find(r => r.user_id === currentUser?.id);
  };

  const getDeskReservation = (deskNumber: number): Reservation | undefined => {
    return reservations.find(r => r.desk_number === deskNumber);
  };

  const canUserBookMore = (): boolean => {
    return !getUserReservationForDate();
  };

  const handleLogin = (email: string) => {
    // Extract name from email (before @sicoob.com.br)
    const name = email.split('@')[0];
    
    const user: User = {
      id: email, // Use email as ID
      name,
      email
    };
    
    setCurrentUser(user);
    localStorage.setItem('sicoob-user', JSON.stringify(user));
    setShowLoginModal(false);
    setMessage({
      type: 'success',
      text: `Bem-vindo(a), ${name}!`
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sicoob-user');
    setShowLoginModal(true);
    setReservations([]);
    setMessage(null);
  };

  if (!currentUser) {
    return (
      <>
        <LoginModal open={showLoginModal} onLogin={handleLogin} />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Sistema de Agendamento de Mesas
            </h1>
            <p className="text-muted-foreground">
              Faça login para acessar o sistema
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LoginModal open={showLoginModal} onLogin={handleLogin} />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-brand-dark text-brand-light py-4 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="h4 mb-0 font-weight-bold">
                Ferramenta de agendamento de mesas da área de marketing
              </h1>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center">
                  <User className="mr-2" size={20} />
                  <span className="font-weight-medium">{currentUser.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-brand-light hover:bg-brand-light/10"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </div>
        </header>

      <div className="container mx-auto px-4 py-6">
        {/* Message Alert */}
        {message && (
          <Alert 
            variant={message.type === 'error' ? 'destructive' : 'default'}
            className="mb-4"
          >
            {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
            {message.type === 'warning' && <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Date Selector */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="bg-secondary/20 rounded-t-lg">
            <CardTitle className="d-flex align-items-center text-lg">
              <Calendar className="mr-2" size={20} />
              Selecionar Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="row">
              <div className="col-12 mb-3">
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(availableDates[0] || '')}
                    className="mr-2 mb-2"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(availableDates[availableDates.length - 1] || '')}
                    className="mb-2"
                  >
                    Próxima semana
                  </Button>
                </div>
              </div>
              <div className="col-12">
                <div className="d-flex flex-wrap gap-2">
                  {availableDates.map((date) => (
                    <Button
                      key={date}
                      variant={selectedDate === date ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDate(date)}
                      className="mb-2 h-full flex flex-col items-center px-2 py-3 min-w-[80px] text-center"
                    >
                      <span className="font-medium text-xs">{getDayName(date)}</span>
                      <span className="text-xs mt-1">{formatDate(date).split('/').slice(0,2).join('/')}</span>
                      {isToday(date) && (
                        <Badge variant="secondary" className="mt-1 px-1 py-0 text-xs">
                          Hoje
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            {selectedDate && (
              <div className="mt-3 p-3 bg-primary/5 rounded border-l-4 border-primary">
                <p className="mb-0 font-weight-medium text-primary">
                  Data selecionada: {formatDate(selectedDate)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desk Grid */}
        {selectedDate && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-secondary/20 rounded-t-lg">
              <CardTitle className="d-flex align-items-center text-lg">
                <MapPin className="mr-2" size={20} />
                Mesas Disponíveis - {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Carregando...</span>
                  </div>
                  <p className="mt-2 text-muted">Carregando mesas...</p>
                </div>
              ) : (
                <div className="row">
                  {desks.map((desk) => {
                    const reservation = getDeskReservation(desk.number);
                    const isOccupied = !!reservation;
                    const isMyReservation = reservation?.user_id === currentUser.id;
                    const canBook = !isOccupied && canUserBookMore();

                    return (
                      <div key={desk.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <Card className={`h-100 position-relative ${
                          isMyReservation 
                            ? 'border-success bg-success/5' 
                            : isOccupied 
                            ? 'border-muted bg-muted/5' 
                            : canBook 
                            ? 'border-primary bg-primary/5 hover:shadow-md transition-shadow' 
                            : 'border-muted bg-muted/5'
                        }`}>
                          <CardHeader className="pb-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <CardTitle className="h5 mb-0">
                                Mesa {desk.number}
                              </CardTitle>
                              <Badge 
                                variant={
                                  isMyReservation 
                                    ? 'default' 
                                    : isOccupied 
                                    ? 'secondary' 
                                    : 'outline'
                                }
                                className={
                                  isMyReservation 
                                    ? 'bg-success text-success-foreground' 
                                    : isOccupied 
                                    ? 'bg-muted text-muted-foreground' 
                                    : 'border-primary text-primary'
                                }
                              >
                                {isMyReservation ? 'Minha Reserva' : isOccupied ? 'Ocupada' : 'Livre'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {isOccupied && (
                              <p className="text-sm text-muted-foreground mb-3">
                                <User size={14} className="mr-1" />
                                {reservation.user_name}
                              </p>
                            )}
                            
                            <div className="mt-auto">
                              {isMyReservation ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelReservation(reservation.id, desk.number)}
                                  disabled={loading}
                                  className="w-100"
                                >
                                  {loading ? 'Cancelando...' : 'Cancelar'}
                                </Button>
                              ) : canBook ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => makeReservation(desk.number)}
                                  disabled={loading}
                                  className="w-100"
                                >
                                  {loading ? 'Reservando...' : 'Reservar'}
                                </Button>
                              ) : isOccupied ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="w-100"
                                >
                                  Ocupada
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="w-100"
                                >
                                  Não disponível
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && desks.length === 0 && (
                <div className="text-center py-5">
                  <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
                  <p className="text-muted">Nenhuma mesa ativa encontrada.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
};

export default DeskBooking;