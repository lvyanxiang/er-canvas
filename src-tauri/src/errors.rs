use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("连接信息无效：{0}")]
    InvalidConnection(String),
    #[error("PostgreSQL 认证失败：{0}")]
    Authentication(String),
    #[error("PostgreSQL 数据库不存在：{0}")]
    DatabaseNotFound(String),
    #[error("PostgreSQL 权限不足：{0}")]
    PermissionDenied(String),
    #[error("无法连接 PostgreSQL：{0}")]
    Connection(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorPayload {
    code: &'static str,
    message: String,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let code = match self {
            Self::InvalidConnection(_) => "DB_CONFIG_INVALID",
            Self::Authentication(_) => "DB_AUTH_FAILED",
            Self::DatabaseNotFound(_) => "DB_NOT_FOUND",
            Self::PermissionDenied(_) => "DB_PERMISSION_DENIED",
            Self::Connection(_) => "DB_CONNECTION_FAILED",
        };
        ErrorPayload {
            code,
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}
