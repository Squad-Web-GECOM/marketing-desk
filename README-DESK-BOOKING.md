# Ferramenta de Agendamento de Mesas - Marketing

Sistema de reserva de mesas de trabalho para a equipe de Marketing, desenvolvido com React, TypeScript, Bootstrap 4.2 e Supabase.

## 🚀 Características

- **Reserva por dia inteiro**: Sistema simples de agendamento de mesas
- **Janela de 7 dias**: Agendamento de hoje até 7 dias à frente
- **Apenas dias úteis**: Sábados e domingos são automaticamente desabilitados
- **Uma reserva por usuário por dia**: Controle de limite automático
- **Cancelamento próprio**: Usuários podem cancelar suas próprias reservas
- **Interface responsiva**: Otimizada para desktop e mobile
- **Timezone Brasil**: Todos os cálculos baseados em America/Sao_Paulo

## 🎨 Design System

### Paleta de Cores
- **Primary**: #00AE9D (Turquesa vibrante)
- **Dark**: #003641 (Azul escuro)
- **Light**: #FFF (Branco)

### Tecnologias
- React 18 + TypeScript
- Bootstrap 4.2
- Supabase (Database + Auth)
- Tailwind CSS (Design System)
- Lucide React (Ícones)

## 📋 Pré-requisitos

1. **Projeto Supabase configurado**
2. **Node.js 18+** 
3. **Usuário Liferay** (ou mock para desenvolvimento)

## ⚙️ Configuração

### 1. Configuração do Supabase

O sistema já criou automaticamente as tabelas necessárias:

#### Tabela `desks`
- `id`: Serial primary key
- `number`: Número da mesa (único)
- `is_active`: Mesa ativa (boolean)
- `specs`: Especificações futuras (JSONB)

#### Tabela `reservations`
- `id`: Bigserial primary key
- `date`: Data da reserva
- `desk_number`: Número da mesa
- `user_id`: ID do usuário (Liferay)
- `user_name`: Nome do usuário
- `created_at`: Data de criação
- `canceled_at`: Data de cancelamento (opcional)
- `canceled_by`: Quem cancelou (opcional)

### 2. Variáveis de Ambiente

As variáveis já estão configuradas no projeto:
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase

### 3. Integração com Liferay

#### Em Produção
O Liferay deve injetar o objeto global antes do carregamento da aplicação:

```javascript
window.LIFERAY_USER = {
  id: "user_unique_id",
  name: "Nome do Usuário"
};
```

#### Em Desenvolvimento
O arquivo `public/liferay-user-mock.js` fornece um usuário simulado para testes.

## 🏃‍♂️ Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📱 Como Usar

### 1. Acessar o Sistema
- Usuário deve estar autenticado no Liferay
- Sistema verificará `window.LIFERAY_USER`

### 2. Selecionar Data
- Use os botões "Hoje" ou "Próxima semana"
- Ou clique em uma data específica
- Apenas dias úteis são mostrados

### 3. Reservar Mesa
- Visualize mesas livres (cards verdes)
- Clique em "Reservar" na mesa desejada
- Confirme a operação

### 4. Cancelar Reserva
- Encontre sua reserva (card com borda verde)
- Clique em "Cancelar"
- Confirme o cancelamento

## 🔒 Regras de Negócio

### Restrições de Agendamento
- ✅ Apenas dias úteis (Segunda a Sexta)
- ✅ Janela de hoje até 7 dias à frente
- ✅ Uma reserva por usuário por dia
- ✅ Uma reserva por mesa por dia
- ✅ Cancelamento apenas pelo próprio usuário

### Validações do Sistema
- ✅ Verificação de usuário Liferay válido
- ✅ Validação de datas no backend
- ✅ Controle de concorrência nas reservas
- ✅ Índices únicos no banco de dados

## 🗄️ Estrutura do Banco

### Mesas Iniciais
O sistema criou automaticamente 22 mesas ativas (numeradas de 1 a 22).

### Adicionando Novas Mesas
```sql
INSERT INTO public.desks (number, is_active) VALUES (23, true);
```

### Desativando Mesas
```sql
UPDATE public.desks SET is_active = false WHERE number = 15;
```

## 🔧 Personalização

### Adicionando Especificações de Mesa
O campo `specs` (JSONB) está preparado para futuras funcionalidades:

```sql
UPDATE public.desks 
SET specs = '{"monitor": true, "area": "window", "equipment": "dual_screen"}'
WHERE number = 1;
```

### Modificando a Janela de Agendamento
Para alterar de 7 para 14 dias, modifique a função `is_valid_booking_date` no Supabase.

## 📊 Monitoramento

### Logs de Acesso
- Console do navegador mostra operações
- Supabase Dashboard > Logs para backend

### Relatórios de Uso
```sql
-- Reservas por usuário (último mês)
SELECT user_name, COUNT(*) as total_reservas
FROM public.reservations 
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND canceled_at IS NULL
GROUP BY user_name
ORDER BY total_reservas DESC;

-- Mesas mais populares
SELECT desk_number, COUNT(*) as total_reservas
FROM public.reservations 
WHERE canceled_at IS NULL
GROUP BY desk_number
ORDER BY total_reservas DESC;
```

## 🚨 Troubleshooting

### Usuário não identificado
- Verificar se `window.LIFERAY_USER` existe
- Verificar se tem `id` e `name`
- Em desenvolvimento, verificar se `liferay-user-mock.js` está carregando

### Erro ao reservar mesa
- Verificar se mesa ainda está disponível
- Verificar se usuário já tem reserva no dia
- Verificar se data está na janela válida

### Mesas não aparecendo
- Verificar se mesas estão ativas no banco
- Verificar conexão com Supabase
- Verificar permissões RLS (se ativadas)

## 🔄 Próximos Passos (Roadmap)

1. **Migração para Edge Functions** (recomendado para produção)
2. **RLS Policies** mais restritivas
3. **Especificações de mesa** na interface
4. **Notificações** de reserva/cancelamento
5. **Relatórios administrativos**
6. **Integração com calendário** corporativo

## 📞 Suporte

Para suporte técnico ou dúvidas sobre implementação:
- Verificar logs do Supabase Dashboard
- Consultar documentação do Liferay
- Revisar este README

---

**Versão**: 1.0.0 (MVP)  
**Última atualização**: Janeiro 2025