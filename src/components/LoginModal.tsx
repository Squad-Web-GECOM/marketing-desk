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
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onLogin }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!email.endsWith('@sicoob.com.br')) {
      newErrors.email = 'Email deve terminar com @sicoob.com.br';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onLogin(email.trim(), '');
      setEmail('');
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Building2 className="h-5 w-5 text-primary" />
            Login - Sistema de Agendamento
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

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;