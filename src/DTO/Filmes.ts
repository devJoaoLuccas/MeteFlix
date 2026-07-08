export interface ListarWishlist {
    casalId: string,
    usuarioId: string,
    status: boolean
}

export interface AdicionarFilme {
    casalId: string;
    usuarioId: string;
    tmdbId: number;
}

export interface RemoverFilme { 
    casalId: string;
    usuarioId: string;
    tmdbId: number;
}