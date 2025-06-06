from pydantic import Field, SecretStr

from src.config import Settings


class EvalSettings(Settings):
    langfuse_project_id: str = ""
    batch_size: int = 4
    batch_interval: int = 1
    datasource: str = "bigquery"
    config_path: str = "eval/config.yaml"
    openai_api_key: SecretStr = Field(alias="OPENAI_API_KEY")
    allow_sql_samples: bool = True
    allow_instructions: bool = True
    allow_sql_functions: bool = True
    db_path_for_duckdb: str = ""

    # BigQuery
    bigquery_project_id: str = Field(default="")
    bigquery_dataset_id: str = Field(default="")
    bigquery_credentials: SecretStr = Field(default="")

    @property
    def langfuse_url(self) -> str:
        if not self.langfuse_project_id:
            return ""
        return f"{self.langfuse_host.rstrip('/')}/project/{self.langfuse_project_id}"

    def get_openai_api_key(self) -> str:
        return self.openai_api_key.get_secret_value()

    @property
    def bigquery_info(self) -> dict:
        return {
            "project_id": self.bigquery_project_id,
            "dataset_id": self.bigquery_dataset_id,
            "credentials": self.bigquery_credentials.get_secret_value(),
        }
