export type Env = {
  DB: D1Database;
  AI?: Ai;
  ASSETS?: Fetcher;
  MAIL_PROVIDER: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME: string;
  CHATBOT_ENGINE: string;
  ABONNEMENT_PRIX: string;
  PASSWORD_ITERATIONS?: string;
  BREVO_API_KEY?: string;
  RESEND_API_KEY?: string;
};

export type Row = Record<string, any>;

export type User = { id: number; email: string; type: 'candidat' | 'recruteur' | 'admin' };

export type Flash = { type: string; message: string };

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User | null;
    csrf: string;
    flashes: Flash[];
    flashOut: Flash[];
  };
};
