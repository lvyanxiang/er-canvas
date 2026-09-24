use std::time::Instant;

use native_tls::TlsConnector;
use postgres_native_tls::MakeTlsConnector;
use serde::{Deserialize, Serialize};
use tokio_postgres::{config::SslMode as PgSslMode, error::SqlState, Client, Config};

use crate::errors::AppError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDraft {
    host: String,
    port: u16,
    database: String,
    username: String,
    password: String,
    ssl_mode: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    server_version: String,
    latency_ms: u128,
    ssl_active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSnapshot {
    database_name: String,
    captured_at: String,
    schemas: Vec<DatabaseSchema>,
    foreign_keys: Vec<DatabaseForeignKey>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSchema {
    name: String,
    tables: Vec<DatabaseTable>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseTable {
    id: String,
    schema: String,
    name: String,
    kind: String,
    comment: Option<String>,
    columns: Vec<DatabaseColumn>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseColumn {
    id: String,
    name: String,
    ordinal: i16,
    data_type: String,
    nullable: bool,
    default_value: Option<String>,
    comment: Option<String>,
    primary_key: bool,
    foreign_key: bool,
    unique: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseForeignKey {
    id: String,
    name: String,
    source_table_id: String,
    source_column_id: String,
    target_table_id: String,
    target_column_id: String,
    on_delete: String,
    on_update: String,
}

#[tauri::command]
pub async fn test_connection(
    connection: ConnectionDraft,
) -> Result<ConnectionTestResult, AppError> {
    validate_connection(&connection)?;
    let started_at = Instant::now();
    let client = connect_database(&connection).await?;

    let row = client
        .query_one(
            "SELECT current_setting('server_version'), COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false)",
            &[],
        )
        .await
        .map_err(sanitize_database_error)?;

    Ok(ConnectionTestResult {
        server_version: row.get(0),
        latency_ms: started_at.elapsed().as_millis(),
        ssl_active: row.get(1),
    })
}

#[tauri::command]
pub async fn introspect_database(
    connection: ConnectionDraft,
) -> Result<DatabaseSnapshot, AppError> {
    validate_connection(&connection)?;
    let client = connect_database(&connection).await?;

    let table_rows = client
        .query(
            r#"
            SELECT
              n.nspname,
              c.relname,
              CASE c.relkind
                WHEN 'r' THEN 'table'
                WHEN 'p' THEN 'partitioned-table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized-view'
              END AS kind,
              obj_description(c.oid, 'pg_class')
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p', 'v', 'm')
              AND n.nspname <> 'information_schema'
              AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
            ORDER BY n.nspname, c.relname
            "#,
            &[],
        )
        .await
        .map_err(sanitize_database_error)?;

    let column_rows = client
        .query(
            r#"
            SELECT
              n.nspname,
              c.relname,
              a.attname,
              a.attnum,
              format_type(a.atttypid, a.atttypmod),
              NOT a.attnotnull AS nullable,
              pg_get_expr(ad.adbin, ad.adrelid),
              col_description(c.oid, a.attnum),
              EXISTS (
                SELECT 1 FROM pg_constraint con
                WHERE con.conrelid = c.oid AND con.contype = 'p' AND a.attnum = ANY(con.conkey)
              ) AS primary_key,
              EXISTS (
                SELECT 1 FROM pg_constraint con
                WHERE con.conrelid = c.oid AND con.contype = 'f' AND a.attnum = ANY(con.conkey)
              ) AS foreign_key,
              EXISTS (
                SELECT 1 FROM pg_constraint con
                WHERE con.conrelid = c.oid
                  AND con.contype = 'u'
                  AND cardinality(con.conkey) = 1
                  AND a.attnum = ANY(con.conkey)
              ) AS unique_column
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
            WHERE c.relkind IN ('r', 'p', 'v', 'm')
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND n.nspname <> 'information_schema'
              AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
            ORDER BY n.nspname, c.relname, a.attnum
            "#,
            &[],
        )
        .await
        .map_err(sanitize_database_error)?;

    let foreign_key_rows = client
        .query(
            r#"
            SELECT
              con.oid::text,
              con.conname,
              src_ns.nspname,
              src.relname,
              src_col.attname,
              target_ns.nspname,
              target.relname,
              target_col.attname,
              src_key.ordinality::int,
              CASE con.confdeltype
                WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END,
              CASE con.confupdtype
                WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END
            FROM pg_constraint con
            JOIN pg_class src ON src.oid = con.conrelid
            JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
            JOIN pg_class target ON target.oid = con.confrelid
            JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
            JOIN LATERAL unnest(con.conkey) WITH ORDINALITY src_key(attnum, ordinality) ON true
            JOIN LATERAL unnest(con.confkey) WITH ORDINALITY target_key(attnum, ordinality)
              ON target_key.ordinality = src_key.ordinality
            JOIN pg_attribute src_col ON src_col.attrelid = src.oid AND src_col.attnum = src_key.attnum
            JOIN pg_attribute target_col ON target_col.attrelid = target.oid AND target_col.attnum = target_key.attnum
            WHERE con.contype = 'f'
              AND src_ns.nspname <> 'information_schema'
              AND src_ns.nspname NOT LIKE 'pg\_%' ESCAPE '\'
            ORDER BY src_ns.nspname, src.relname, con.conname, src_key.ordinality
            "#,
            &[],
        )
        .await
        .map_err(sanitize_database_error)?;

    let mut schemas: Vec<DatabaseSchema> = Vec::new();
    for row in table_rows {
        let schema_name: String = row.get(0);
        let table_name: String = row.get(1);
        let table_id = format!("{schema_name}.{table_name}");
        let columns = column_rows
            .iter()
            .filter(|column| {
                column.get::<_, String>(0) == schema_name
                    && column.get::<_, String>(1) == table_name
            })
            .map(|column| {
                let column_name: String = column.get(2);
                DatabaseColumn {
                    id: format!("{table_id}.{column_name}"),
                    name: column_name,
                    ordinal: column.get(3),
                    data_type: column.get(4),
                    nullable: column.get(5),
                    default_value: column.get(6),
                    comment: column.get(7),
                    primary_key: column.get(8),
                    foreign_key: column.get(9),
                    unique: column.get(10),
                }
            })
            .collect();

        let table = DatabaseTable {
            id: table_id,
            schema: schema_name.clone(),
            name: table_name,
            kind: row.get(2),
            comment: row.get(3),
            columns,
        };

        if let Some(schema) = schemas.iter_mut().find(|item| item.name == schema_name) {
            schema.tables.push(table);
        } else {
            schemas.push(DatabaseSchema {
                name: schema_name,
                tables: vec![table],
            });
        }
    }

    let foreign_keys = foreign_key_rows
        .into_iter()
        .map(|row| {
            let constraint_id: String = row.get(0);
            let source_schema: String = row.get(2);
            let source_table: String = row.get(3);
            let source_column: String = row.get(4);
            let target_schema: String = row.get(5);
            let target_table: String = row.get(6);
            let target_column: String = row.get(7);
            let ordinal: i32 = row.get(8);
            DatabaseForeignKey {
                id: format!("{constraint_id}:{ordinal}"),
                name: row.get(1),
                source_table_id: format!("{source_schema}.{source_table}"),
                source_column_id: format!("{source_schema}.{source_table}.{source_column}"),
                target_table_id: format!("{target_schema}.{target_table}"),
                target_column_id: format!("{target_schema}.{target_table}.{target_column}"),
                on_delete: row.get(9),
                on_update: row.get(10),
            }
        })
        .collect();

    let captured_at: String = client
        .query_one("SELECT statement_timestamp()::text", &[])
        .await
        .map_err(sanitize_database_error)?
        .get(0);

    Ok(DatabaseSnapshot {
        database_name: connection.database,
        captured_at,
        schemas,
        foreign_keys,
    })
}

async fn connect_database(connection: &ConnectionDraft) -> Result<Client, AppError> {
    let mut config = Config::new();
    config
        .host(&connection.host)
        .port(connection.port)
        .dbname(&connection.database)
        .user(&connection.username)
        .password(&connection.password)
        .ssl_mode(match connection.ssl_mode.as_str() {
            "disable" => PgSslMode::Disable,
            "prefer" => PgSslMode::Prefer,
            _ => PgSslMode::Require,
        })
        .connect_timeout(std::time::Duration::from_secs(8));

    let mut tls_builder = TlsConnector::builder();
    match connection.ssl_mode.as_str() {
        "require" => {
            tls_builder.danger_accept_invalid_certs(true);
            tls_builder.danger_accept_invalid_hostnames(true);
        }
        "verify-ca" => {
            tls_builder.danger_accept_invalid_hostnames(true);
        }
        _ => {}
    }
    let tls = tls_builder
        .build()
        .map(MakeTlsConnector::new)
        .map_err(|_| AppError::InvalidConnection("无法初始化系统 TLS".into()))?;

    let (client, driver) = config
        .connect(tls)
        .await
        .map_err(sanitize_database_error)?;

    tauri::async_runtime::spawn(async move {
        if let Err(error) = driver.await {
            eprintln!("PostgreSQL connection closed: {error}");
        }
    });
    Ok(client)
}

fn validate_connection(connection: &ConnectionDraft) -> Result<(), AppError> {
    if connection.host.trim().is_empty()
        || connection.database.trim().is_empty()
        || connection.username.trim().is_empty()
    {
        return Err(AppError::InvalidConnection(
            "主机、数据库和用户名不能为空".into(),
        ));
    }

    if !matches!(
        connection.ssl_mode.as_str(),
        "disable" | "prefer" | "require" | "verify-ca" | "verify-full"
    ) {
        return Err(AppError::InvalidConnection("不支持的 SSL 模式".into()));
    }
    Ok(())
}

fn sanitize_database_error(error: tokio_postgres::Error) -> AppError {
    if let Some(database_error) = error.as_db_error() {
        let detail = database_error.message().to_owned();
        return match *database_error.code() {
            SqlState::INVALID_PASSWORD | SqlState::INVALID_AUTHORIZATION_SPECIFICATION => {
                AppError::Authentication(detail)
            }
            SqlState::INVALID_CATALOG_NAME => AppError::DatabaseNotFound(detail),
            SqlState::INSUFFICIENT_PRIVILEGE => AppError::PermissionDenied(detail),
            _ => AppError::Connection(detail),
        };
    }

    if error.is_closed() {
        AppError::Connection("连接被服务器关闭".into())
    } else {
        AppError::Connection(
            "网络不可达、连接超时、SSL 配置不匹配或 PostgreSQL 未启动".into(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_host() {
        let connection = ConnectionDraft {
            host: "".into(),
            port: 5432,
            database: "postgres".into(),
            username: "postgres".into(),
            password: String::new(),
            ssl_mode: "prefer".into(),
        };
        assert!(validate_connection(&connection).is_err());
    }
}
