use std::time::Instant;

use native_tls::TlsConnector;
use postgres_native_tls::MakeTlsConnector;
use serde::{Deserialize, Serialize};
use tokio_postgres::{config::SslMode as PgSslMode, error::SqlState, Config};

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

#[tauri::command]
pub async fn test_connection(
    connection: ConnectionDraft,
) -> Result<ConnectionTestResult, AppError> {
    validate_connection(&connection)?;

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

    let started_at = Instant::now();
    let (client, driver) = config
        .connect(tls)
        .await
        .map_err(sanitize_database_error)?;

    tauri::async_runtime::spawn(async move {
        if let Err(error) = driver.await {
            eprintln!("PostgreSQL connection closed: {error}");
        }
    });

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
