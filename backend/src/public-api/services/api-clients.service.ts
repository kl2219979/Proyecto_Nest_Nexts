import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  ApiClientCreatedResponse,
  ApiClientView,
  AuthenticatedApiClient,
  OAuthTokenResponse,
} from '../dto/api-client-response';
import { CreateApiClientDto, UpdateApiClientDto } from '../dto/api-client.dto';
import { ApiClient } from '../entities/api-client.entity';
import {
  ALL_API_CLIENT_SCOPES,
  ApiClientScope,
} from '../enums/public-api.enums';

/** Claim de access token emitido a clientes externos. */
export type ApiClientJwtPayload = {
  sub: string;
  clientId: string;
  scopes: ApiClientScope[];
  tokenUse: 'api_client';
};

/** TTL del access token OAuth client_credentials (1 h). */
const CLIENT_TOKEN_TTL_SEC = 60 * 60;

/**
 * Gestión de consumidores externos + emisión OAuth (HU-029).
 *
 * @remarks
 * **Patrón:** Service (capa de aplicación Nest).
 * Problema que resuelve: centralizar credenciales, scopes y rate limits
 * sin acoplar controllers al almacenamiento de hashes.
 */
@Injectable()
export class ApiClientsService {
  /**
   * @param clientRepo - Tabla `api_clients`.
   * @param jwtService - Firma de tokens client_credentials.
   * @param config - `JWT_SECRET` reutilizado (claim `tokenUse` los distingue).
   */
  constructor(
    @InjectRepository(ApiClient)
    private readonly clientRepo: Repository<ApiClient>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Lista clientes (ADMIN).
   *
   * @returns Vistas sin secretos.
   */
  async list(): Promise<ApiClientView[]> {
    const rows = await this.clientRepo.find({
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toView(r));
  }

  /**
   * Detalle de un cliente.
   *
   * @param id - UUID.
   */
  async getById(id: string): Promise<ApiClientView> {
    const row = await this.requireClient(id);
    return this.toView(row);
  }

  /**
   * Alta: genera `clientId`, secreto y API Key (mostrados una vez).
   *
   * @param dto - Nombre, scopes, rate limit.
   */
  async create(dto: CreateApiClientDto): Promise<ApiClientCreatedResponse> {
    const clientId = `mcc_${randomBytes(12).toString('hex')}`;
    const clientSecret = `mcs_${randomBytes(24).toString('hex')}`;
    const apiKey = `mck_${randomBytes(24).toString('hex')}`;

    const entity = this.clientRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      clientId,
      clientSecretHash: this.hash(clientSecret),
      apiKeyPrefix: apiKey.slice(0, 12),
      apiKeyHash: this.hash(apiKey),
      scopes: dto.scopes,
      rateLimitPerMinute: dto.rateLimitPerMinute ?? 60,
      isActive: true,
    });

    const saved = await this.clientRepo.save(entity);
    return {
      ...this.toView(saved),
      clientSecret,
      apiKey,
      message:
        'Guarda clientSecret y apiKey ahora: no se volverán a mostrar en claro.',
    };
  }

  /**
   * Actualiza metadatos / scopes / rate limit / activo.
   *
   * @param id - UUID.
   * @param dto - Campos parciales.
   */
  async update(id: string, dto: UpdateApiClientDto): Promise<ApiClientView> {
    const row = await this.requireClient(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    if (dto.scopes !== undefined) row.scopes = dto.scopes;
    if (dto.rateLimitPerMinute !== undefined) {
      row.rateLimitPerMinute = dto.rateLimitPerMinute;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    const saved = await this.clientRepo.save(row);
    return this.toView(saved);
  }

  /**
   * Rota secreto + API Key (invalida los anteriores).
   *
   * @param id - UUID.
   */
  async rotateCredentials(id: string): Promise<ApiClientCreatedResponse> {
    const row = await this.requireClient(id);
    const clientSecret = `mcs_${randomBytes(24).toString('hex')}`;
    const apiKey = `mck_${randomBytes(24).toString('hex')}`;
    row.clientSecretHash = this.hash(clientSecret);
    row.apiKeyPrefix = apiKey.slice(0, 12);
    row.apiKeyHash = this.hash(apiKey);
    const saved = await this.clientRepo.save(row);
    return {
      ...this.toView(saved),
      clientSecret,
      apiKey,
      message: 'Credenciales rotadas. Actualiza el integrador.',
    };
  }

  /**
   * Baja lógica (desactiva). No borra auditoría histórica.
   *
   * @param id - UUID.
   */
  async deactivate(id: string): Promise<ApiClientView> {
    return this.update(id, { isActive: false });
  }

  /**
   * OAuth 2.0 Client Credentials → access token (RN-113).
   *
   * @param clientId - `client_id`.
   * @param clientSecret - Secreto en claro.
   * @param grantType - Debe ser `client_credentials`.
   */
  async issueClientCredentialsToken(
    clientId: string,
    clientSecret: string,
    grantType: string,
  ): Promise<OAuthTokenResponse> {
    if (grantType !== 'client_credentials') {
      throw new UnauthorizedException(
        'grant_type no soportado (solo client_credentials)',
      );
    }

    const client = await this.clientRepo.findOne({ where: { clientId } });
    if (
      !client ||
      !client.isActive ||
      client.clientSecretHash !== this.hash(clientSecret)
    ) {
      throw new UnauthorizedException('Credenciales de cliente inválidas');
    }

    await this.touchLastUsed(client);

    const payload: ApiClientJwtPayload = {
      sub: client.id,
      clientId: client.clientId,
      scopes: client.scopes,
      tokenUse: 'api_client',
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret(),
      expiresIn: CLIENT_TOKEN_TTL_SEC,
    });

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: CLIENT_TOKEN_TTL_SEC,
      scope: client.scopes.join(' '),
    };
  }

  /**
   * Resuelve el cliente desde API Key (`X-API-Key`).
   *
   * @param apiKey - Valor en claro del header.
   */
  async authenticateByApiKey(
    apiKey: string,
  ): Promise<AuthenticatedApiClient> {
    const prefix = apiKey.slice(0, 12);
    const candidates = await this.clientRepo.find({
      where: { apiKeyPrefix: prefix, isActive: true },
    });
    const hash = this.hash(apiKey);
    const client = candidates.find((c) => c.apiKeyHash === hash);
    if (!client) {
      throw new UnauthorizedException('API Key inválida');
    }
    await this.touchLastUsed(client);
    return this.toAuth(client, 'api_key');
  }

  /**
   * Resuelve el cliente desde Bearer OAuth client token.
   *
   * @param token - JWT firmado con `tokenUse: api_client`.
   */
  async authenticateByClientToken(
    token: string,
  ): Promise<AuthenticatedApiClient> {
    let payload: ApiClientJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<ApiClientJwtPayload>(token, {
        secret: this.jwtSecret(),
      });
    } catch {
      throw new UnauthorizedException('Token de cliente inválido o expirado');
    }

    if (payload.tokenUse !== 'api_client' || !payload.sub) {
      throw new UnauthorizedException('El Bearer no es un token de API client');
    }

    const client = await this.clientRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!client) {
      throw new UnauthorizedException('Cliente inactivo o inexistente');
    }

    await this.touchLastUsed(client);
    return this.toAuth(client, 'oauth_client');
  }

  /**
   * Verifica que el cliente tenga todos los scopes requeridos.
   *
   * @param client - Cliente autenticado.
   * @param required - Scopes del endpoint.
   */
  assertScopes(
    client: AuthenticatedApiClient,
    required: ApiClientScope[],
  ): void {
    const missing = required.filter((s) => !client.scopes.includes(s));
    if (missing.length > 0) {
      throw new UnauthorizedException(
        `Scope insuficiente. Requiere: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Seed idempotente: crea cliente demo si no existe `mcc_demo_kiosk`.
   *
   * @returns Credenciales demo (o null si ya existía).
   */
  async ensureDemoClient(): Promise<{
    clientId: string;
    clientSecret: string;
    apiKey: string;
  } | null> {
    const existing = await this.clientRepo.findOne({
      where: { clientId: 'mcc_demo_kiosk' },
    });
    if (existing) {
      return null;
    }

    const clientSecret = 'mcs_demo_secret_change_me';
    const apiKey = 'mck_demo_public_api_key_change_me';

    await this.clientRepo.save(
      this.clientRepo.create({
        name: 'Demo Kiosco / App externa',
        description:
          'Cliente seed HU-029. Solo desarrollo. Rota credenciales en producción.',
        clientId: 'mcc_demo_kiosk',
        clientSecretHash: this.hash(clientSecret),
        apiKeyPrefix: apiKey.slice(0, 12),
        apiKeyHash: this.hash(apiKey),
        scopes: ALL_API_CLIENT_SCOPES,
        rateLimitPerMinute: 120,
        isActive: true,
      }),
    );

    return { clientId: 'mcc_demo_kiosk', clientSecret, apiKey };
  }

  /**
   * Evita colisión de `clientId` (uso interno / tests).
   *
   * @param clientId - Identificador público.
   */
  async assertClientIdFree(clientId: string): Promise<void> {
    const exists = await this.clientRepo.exist({ where: { clientId } });
    if (exists) {
      throw new ConflictException(`clientId ya existe: ${clientId}`);
    }
  }

  private async requireClient(id: string): Promise<ApiClient> {
    const row = await this.clientRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Cliente API no encontrado');
    }
    return row;
  }

  private async touchLastUsed(client: ApiClient): Promise<void> {
    client.lastUsedAt = new Date();
    await this.clientRepo.save(client);
  }

  private toView(row: ApiClient): ApiClientView {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.clientId,
      scopes: row.scopes,
      rateLimitPerMinute: row.rateLimitPerMinute,
      isActive: row.isActive,
      hasApiKey: Boolean(row.apiKeyHash),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAuth(
    row: ApiClient,
    authMethod: 'api_key' | 'oauth_client',
  ): AuthenticatedApiClient {
    return {
      id: row.id,
      clientId: row.clientId,
      name: row.name,
      scopes: row.scopes,
      rateLimitPerMinute: row.rateLimitPerMinute,
      authMethod,
    };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private jwtSecret(): string {
    return this.config.get<string>(
      'JWT_SECRET',
      'dev-jwt-secret-change-me',
    );
  }
}
