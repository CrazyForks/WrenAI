import { pickBy } from 'lodash';

export interface IConfig {
  // wren ui
  otherServiceUsingDocker: boolean;

  // database
  dbType: string;
  // pg
  pgUrl?: string;
  debug?: boolean;
  // sqlite
  sqliteFile?: string;

  persistCredentialDir?: string;

  // wren engine
  wrenEngineEndpoint: string;

  // wren agentic system
  wrenAgenticSystemEndpoint: string;
  generationModel?: string;

  // ibis server
  ibisServerEndpoint: string;

  // encryption
  encryptionPassword: string;
  encryptionSalt: string;

  // telemetry
  telemetryEnabled?: boolean;
  posthogApiKey?: string;
  posthogHost?: string;
  userUUID?: string;

  // versions
  wrenUIVersion?: string;
  wrenEngineVersion?: string;
  wrenAgenticSystemVersion?: string;
  wrenProductVersion?: string;
}

const defaultConfig = {
  // wren ui
  otherServiceUsingDocker: false,

  // database
  dbType: 'sqlite',

  // pg
  pgUrl: 'postgres://postgres:postgres@localhost:5432/admin_ui',
  debug: false,

  // sqlite
  sqliteFile: './db.sqlite3',

  persistCredentialDir: `${process.cwd()}/.tmp`,

  // wren engine
  wrenEngineEndpoint: 'http://localhost:8080',

  // wren agentic system
  wrenAgenticSystemEndpoint: 'http://localhost:5555',

  // ibis server
  ibisServerEndpoint: 'http://127.0.0.1:8000',

  // encryption
  encryptionPassword: 'sementic',
  encryptionSalt: 'layer',
};

const config = {
  // node
  otherServiceUsingDocker: process.env.OTHER_SERVICE_USING_DOCKER === 'true',

  // database
  dbType: process.env.DB_TYPE,
  // pg
  pgUrl: process.env.PG_URL,
  debug: process.env.DEBUG === 'true',
  // sqlite
  sqliteFile: process.env.SQLITE_FILE,

  persistCredentialDir: (() => {
    if (
      process.env.PERSIST_CREDENTIAL_DIR &&
      process.env.PERSIST_CREDENTIAL_DIR.length > 0
    ) {
      return process.env.PERSIST_CREDENTIAL_DIR;
    }
    return undefined;
  })(),

  // wren engine
  wrenEngineEndpoint: process.env.WREN_ENGINE_ENDPOINT,

  // wren agentic system
  wrenAgenticSystemEndpoint: process.env.WREN_AGENTIC_SYSTEM_ENDPOINT,
  generationModel: process.env.GENERATION_MODEL,

  // ibis server
  ibisServerEndpoint: process.env.IBIS_SERVER_ENDPOINT,

  // encryption
  encryptionPassword: process.env.ENCRYPTION_PASSWORD,
  encryptionSalt: process.env.ENCRYPTION_SALT,

  // telemetry
  telemetryEnabled:
    process.env.TELEMETRY_ENABLED &&
    process.env.TELEMETRY_ENABLED.toLocaleLowerCase() === 'true',
  posthogApiKey: process.env.POSTHOG_API_KEY,
  posthogHost: process.env.POSTHOG_HOST,
  userUUID: process.env.USER_UUID,

  // versions
  wrenUIVersion: process.env.WREN_UI_VERSION,
  wrenEngineVersion: process.env.WREN_ENGINE_VERSION,
  wrenAgenticSystemVersion: process.env.WREN_AGENTIC_SYSTEM_VERSION,
  wrenProductVersion: process.env.WREN_PRODUCT_VERSION,
};

export function getConfig(): IConfig {
  return { ...defaultConfig, ...pickBy(config) };
}
