import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2 } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onLogin: (email: string, password: string) => void;
}

interface FormErrors {
  email?: string;
  password?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSignUp, setIsSignUp] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!email.endsWith('@sicoob.com.br')) {
      newErrors.email = 'Email deve terminar com @sicoob.com.br';
    }

    if (!password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length !== 4 || !/^\d{4}$/.test(password)) {
      newErrors.password = 'Senha deve ter exatamente 4 números';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onLogin(email.trim(), password.trim());
      setEmail('');
      setPassword('');
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Building2 className="h-5 w-5 text-primary" />
            {isSignUp ? 'Criar Conta' : 'Login'} - Sistema de Agendamento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@sicoob.com.br"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.email}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (4 números)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="1234"
              maxLength={4}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.password}</AlertDescription>
              </Alert>
            )}
          </div>

          <Button type="submit" className="w-full">
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </Button>
          
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar uma'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;