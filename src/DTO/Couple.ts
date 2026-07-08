export interface AceitarConvite {
    inviteCode: string;
    usuarioId: string;
}

export interface Casal {
    id: string;
    user1Id: string;
    user2Id: string | null;
}
