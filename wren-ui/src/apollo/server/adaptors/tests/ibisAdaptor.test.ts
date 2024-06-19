import axios from 'axios';
import { IbisAdaptor, ValidationRules } from '../ibisAdaptor';
import { DataSourceName } from '../../types';
import { Manifest } from '../../mdl/type';
import {
  BIG_QUERY_CONNECTION_INFO,
  MYSQL_CONNECTION_INFO,
  POSTGRES_CONNECTION_INFO,
} from '../../repositories';
import { snakeCase } from 'lodash';
import { Encryptor } from '../../utils';

jest.mock('axios');
jest.mock('@server/utils/encryptor');
const mockedAxios = axios as jest.Mocked<typeof axios>;
// mock encryptor
const mockedEncryptor = Encryptor as jest.MockedClass<typeof Encryptor>;

describe('IbisAdaptor', () => {
  let ibisAdaptor: IbisAdaptor;
  const ibisServerEndpoint = 'http://localhost:8080';

  const mockMySQLConnectionInfo: MYSQL_CONNECTION_INFO = {
    host: 'localhost',
    port: 3306,
    database: 'my-database',
    user: 'my-user',
    password: 'my-password',
  };

  const mockPostgresConnectionInfo: POSTGRES_CONNECTION_INFO = {
    host: 'localhost',
    port: 5432,
    database: 'my-database',
    user: 'my-user',
    password: 'my-password',
    ssl: true,
  };
  const { host, port, database, user, password } = mockPostgresConnectionInfo;
  const postgresConnectionUrl = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;

  const mockBigQueryConnectionInfo: BIG_QUERY_CONNECTION_INFO = {
    projectId: 'my-bq-project-id',
    datasetId: 'my-bq-dataset-id',
    credentials: 'my-bq-credentials',
  };

  const mockManifest: Manifest = {
    catalog: 'wrenai', // eg: "test-catalog"
    schema: 'wrenai', // eg: "test-schema"
    models: [
      {
        name: 'test_table',
        tableReference: {
          catalog: 'wrenai',
          schema: 'wrenai',
          table: 'test_table',
        },
        properties: {
          description: 'test table',
        },
        columns: [
          {
            name: 'id',
            type: 'integer',
            properties: {},
            isCalculated: false,
          },
          {
            name: 'sumId',
            type: 'float',
            properties: {},
            isCalculated: true,
            expression: 'SUM(id)',
          },
        ],
        cached: false,
      },
    ],
    relationships: [],
    views: [],
  };

  beforeEach(() => {
    ibisAdaptor = new IbisAdaptor({
      ibisServerEndpoint: ibisServerEndpoint,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should get mysql constraints', async () => {
    const mockResponse = { data: [] };
    mockedAxios.post.mockResolvedValue(mockResponse);
    // mock decrypt method in Encryptor to return the same password
    mockedEncryptor.prototype.decrypt.mockReturnValue(
      JSON.stringify({ password: mockMySQLConnectionInfo.password }),
    );

    const result = await ibisAdaptor.getConstraints(
      DataSourceName.MYSQL,
      mockMySQLConnectionInfo,
    );
    const expectConnectionInfo = Object.entries(mockMySQLConnectionInfo).reduce(
      (acc, [key, value]) => ((acc[snakeCase(key)] = value), acc),
      {},
    );

    expect(result).toEqual([]);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${ibisServerEndpoint}/v2/ibis/mysql/metadata/constraints`,
      { connectionInfo: expectConnectionInfo },
    );
  });

  it('should get postgres constraints', async () => {
    const mockResponse = { data: [] };
    mockedAxios.post.mockResolvedValue(mockResponse);
    mockedEncryptor.prototype.decrypt.mockReturnValue(
      JSON.stringify({ password: mockPostgresConnectionInfo.password }),
    );

    const result = await ibisAdaptor.getConstraints(
      DataSourceName.POSTGRES,
      mockPostgresConnectionInfo,
    );

    expect(result).toEqual([]);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${ibisServerEndpoint}/v2/ibis/postgres/metadata/constraints`,
      {
        connectionInfo: {
          connectionUrl: postgresConnectionUrl,
        },
      },
    );
  });

  it('should get bigquery constraints', async () => {
    const mockResponse = { data: [] };
    mockedAxios.post.mockResolvedValue(mockResponse);
    mockedEncryptor.prototype.decrypt.mockReturnValue(
      mockBigQueryConnectionInfo.credentials,
    );
    const result = await ibisAdaptor.getConstraints(
      DataSourceName.BIG_QUERY,
      mockBigQueryConnectionInfo,
    );
    const expectConnectionInfo = Object.entries(
      mockBigQueryConnectionInfo,
    ).reduce((acc, [key, value]) => {
      if (key === 'credentials') {
        acc['credentials'] = Buffer.from(
          mockBigQueryConnectionInfo.credentials,
        ).toString('base64');
      } else {
        acc[snakeCase(key)] = value;
      }
      return acc;
    }, {});

    expect(result).toEqual([]);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${ibisServerEndpoint}/v2/ibis/bigquery/metadata/constraints`,
      { connectionInfo: expectConnectionInfo },
    );
  });

  it('should validate with rule COLUMN_IS_VALID', async () => {
    mockedAxios.post.mockResolvedValue(true);
    mockedEncryptor.prototype.decrypt.mockReturnValue(
      JSON.stringify({ password: mockPostgresConnectionInfo.password }),
    );

    const parameters = {
      modelName: 'test_table',
      columnName: 'sumId',
    };
    const result = await ibisAdaptor.validate(
      DataSourceName.POSTGRES,
      ValidationRules.COLUMN_IS_VALID,
      mockPostgresConnectionInfo,
      mockManifest,
      parameters,
    );

    expect(result).toEqual({ valid: true, message: null });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${ibisServerEndpoint}/v2/ibis/postgres/validate/column_is_valid`,
      {
        connectionInfo: { connectionUrl: postgresConnectionUrl },
        manifestStr: Buffer.from(JSON.stringify(mockManifest)).toString(
          'base64',
        ),
        parameters,
      },
    );
  });

  it('should handle error when validating', async () => {
    const mockError = { response: { data: 'Error' } };
    const parameters = {
      modelName: 'test_table',
      columnName: 'sumId',
    };
    mockedAxios.post.mockRejectedValue(mockError);
    mockedEncryptor.prototype.decrypt.mockReturnValue(
      JSON.stringify({ password: mockPostgresConnectionInfo.password }),
    );

    const result = await ibisAdaptor.validate(
      DataSourceName.POSTGRES,
      ValidationRules.COLUMN_IS_VALID,
      mockPostgresConnectionInfo,
      mockManifest,
      parameters,
    );

    expect(result).toEqual({ valid: false, message: 'Error' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${ibisServerEndpoint}/v2/ibis/postgres/validate/column_is_valid`,
      {
        connectionInfo: { connectionUrl: postgresConnectionUrl },
        manifestStr: Buffer.from(JSON.stringify(mockManifest)).toString(
          'base64',
        ),
        parameters,
      },
    );
  });
});
