# MeteFlix — Rotas de API

Documento de referência para implementação do backend em NestJS + Prisma + PostgreSQL.
Base: `schema.prisma` já definido (models `User`, `Couple`, `Movie`, `WishlistItem`, `WatchHistory`, `Rating`).

Convenções:
- Todas as rotas retornam JSON.
- Rotas marcadas com 🔒 exigem `JwtAuthGuard`.
- Rotas marcadas com 🔒🔗 exigem `JwtAuthGuard` **+** `CoupleGuard` (valida que o recurso pertence ao casal do usuário logado).
- Base path sugerido: `/api/v1`.

---

## 1. AuthModule

### `POST /auth/register`
Cria um novo usuário.

**Body**
```json
{ "name": "string", "email": "string", "password": "string (min 8)" }
```
**Response 201**
```json
{ "id": "uuid", "name": "string", "email": "string" }
```
**Erros**: `409` se email já existe.

---

### `POST /auth/login`
Autentica e retorna JWT.

**Body**
```json
{ "email": "string", "password": "string" }
```
**Response 200**
```json
{ "accessToken": "jwt", "user": { "id": "uuid", "name": "string" } }
```
**Erros**: `401` credenciais inválidas.

---

### `GET /auth/me` 🔒
Retorna o usuário logado e o status do pareamento.

**Response 200**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "couple": { "id": "uuid", "status": "PENDING | ACTIVE", "partnerName": "string | null" } | null
}
```

---

## 2. CouplesModule

### `POST /couples` 🔒
Cria o `Couple` do usuário logado com status `PENDING` e gera `inviteCode`.

**Response 201**
```json
{ "id": "uuid", "inviteCode": "string", "status": "PENDING" }
```
**Erros**: `409` se o usuário já tem um `Couple`.

---

### `POST /couples/join` 🔒
Vincula o usuário logado como `user2` de um `Couple` existente.

**Body**
```json
{ "inviteCode": "string" }
```
**Response 200**
```json
{ "id": "uuid", "status": "ACTIVE" }
```
**Erros**: `404` código inválido · `409` casal já está `ACTIVE` · `400` usuário tentando entrar no próprio convite.

---

### `GET /couples/me` 🔒🔗
Retorna o casal do usuário logado, com nomes dos dois.

**Response 200**
```json
{ "id": "uuid", "status": "ACTIVE", "user1": {"id":"uuid","name":"string"}, "user2": {"id":"uuid","name":"string"} | null }
```

---

## 3. FilmesModule

### `GET /movies/search?query=` 🔒
Proxy para busca na TMDb. **Não persiste nada** — só retorna os resultados.

**Query params**: `query` (obrigatório)

**Response 200**
```json
[
  { "tmdbId": 123, "title": "string", "posterPath": "string | null", "releaseYear": 2024 }
]
```

---

### `GET /wishlist` 🔒🔗
Lista os itens da wishlist do casal do usuário logado.

**Query params opcionais**: `watched=true|false` (filtro)

**Response 200**
```json
[
  {
    "id": "uuid",
    "movie": { "tmdbId": 123, "title": "string", "posterPath": "string | null" },
    "addedBy": { "id": "uuid", "name": "string" },
    "watched": false,
    "createdAt": "iso-date"
  }
]
```

---

### `POST /wishlist` 🔒🔗
Adiciona um filme à wishlist. Faz upsert em `Movie` (cache) antes de criar o `WishlistItem`.

**Body**
```json
{ "tmdbId": 123 }
```
**Response 201**: mesmo shape de um item de `GET /wishlist`.

**Erros**: `409` se o filme já está na wishlist do casal (`@@unique([coupleId, movieId])`).

---

### `DELETE /wishlist/:id` 🔒🔗
Remove um item da wishlist.

**Response 204**

---

### `POST /wishlist/draw` 🔒🔗
Sorteia aleatoriamente um item com `watched = false`.

**Response 200**
```json
{ "wishlistItemId": "uuid", "movie": { "tmdbId": 123, "title": "string", "posterPath": "string | null" } }
```
**Erros**: `404` se a wishlist não tem itens não assistidos.

---

### `PATCH /wishlist/:id/mark-watched` 🔒🔗
Marca o item como assistido **e** cria o `WatchHistory` correspondente. Executado em transação Prisma (`$transaction`).

**Response 200**
```json
{ "wishlistItemId": "uuid", "watchHistoryId": "uuid", "watchedAt": "iso-date" }
```

---

## 4. AvaliacoesModule

### `GET /watch-history` 🔒🔗
Lista sessões assistidas pelo casal, com notas e média.

**Response 200**
```json
[
  {
    "id": "uuid",
    "movie": { "title": "string", "posterPath": "string | null" },
    "watchedAt": "iso-date",
    "ratings": [
      { "userId": "uuid", "userName": "string", "nota": 8, "opiniao": "string | null" }
    ],
    "average": 8.5
  }
]
```

---

### `GET /watch-history/:id` 🔒🔗
Detalhe de uma sessão específica (mesmo shape de um item da lista acima).

**Erros**: `404` se não pertence ao casal do usuário.

---

### `POST /watch-history/:id/ratings` 🔒🔗
Cria ou atualiza (upsert) a nota do usuário logado para essa sessão.

**Body**
```json
{ "nota": 8, "opiniao": "string (opcional)" }
```
**Validação**: `nota` inteiro entre 1 e 10 (`@IsInt() @Min(1) @Max(10)` via `class-validator` — o Prisma não valida range).

**Response 200**
```json
{ "id": "uuid", "nota": 8, "opiniao": "string | null" }
```

---

## Resumo — todas as rotas

| Método | Rota | Auth | Módulo |
|---|---|---|---|
| POST | `/auth/register` | — | Auth |
| POST | `/auth/login` | — | Auth |
| GET | `/auth/me` | 🔒 | Auth |
| POST | `/couples` | 🔒 | Couples |
| POST | `/couples/join` | 🔒 | Couples |
| GET | `/couples/me` | 🔒🔗 | Couples |
| GET | `/movies/search` | 🔒 | Filmes |
| GET | `/wishlist` | 🔒🔗 | Filmes |
| POST | `/wishlist` | 🔒🔗 | Filmes |
| DELETE | `/wishlist/:id` | 🔒🔗 | Filmes |
| POST | `/wishlist/draw` | 🔒🔗 | Filmes |
| PATCH | `/wishlist/:id/mark-watched` | 🔒🔗 | Filmes |
| GET | `/watch-history` | 🔒🔗 | Avaliações |
| GET | `/watch-history/:id` | 🔒🔗 | Avaliações |
| POST | `/watch-history/:id/ratings` | 🔒🔗 | Avaliações |

---

## Notas de implementação

- **`CoupleGuard`**: guard customizado que extrai o `coupleId` do usuário logado (via `req.user`) e valida que o recurso acessado na rota pertence a esse casal. Sem isso, um usuário autenticado poderia adivinhar UUIDs de outro casal.
- **`mark-watched` é transacional**: as duas escritas (`WishlistItem.watched = true` + criação de `WatchHistory`) devem ocorrer dentro de `prisma.$transaction([...])` para não deixar estado inconsistente em caso de falha parcial.
- **`POST /watch-history/:id/ratings` é upsert**, não `create` puro — o `@@unique([watchHistoryId, userId])` do schema significa que reenviar a nota deve atualizar, não gerar erro de duplicidade. Use `prisma.rating.upsert(...)`.
- **`/movies/search` não grava nada** — só `POST /wishlist` persiste um filme na tabela `Movie`, evitando poluir o cache com buscas que não viraram wishlist.
- **DTOs sugeridos** (um por rota com body): `RegisterDto`, `LoginDto`, `JoinCoupleDto`, `AddWishlistItemDto`, `RateWatchHistoryDto` — todos com `class-validator`.
