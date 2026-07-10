export interface DashboardCasal {
    casalId: string;
    usuarioId: string;
}

export interface DetalheAvaliacao {
    casalId: string;
    usuarioId: string;
    tmdbId: number;
}

export interface CriarAvaliacao {
    casalId: string;
    usuarioId: string;
    tmdbId: number;
    nota: number;
    opiniao?: string | null;
}
