use std::{env, net::SocketAddr, path::PathBuf, sync::Arc};

use axum::{
    extract::State,
    http::{HeaderValue, Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::info;

#[derive(Clone)]
struct AppState {
    db_pool: PgPool,
}

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("Missing required env var: {0}")]
    Missing(&'static str),
    #[error("Invalid PORT value: {0}")]
    InvalidPort(String),
}

#[derive(Clone)]
struct AppConfig {
    host: String,
    port: u16,
    database_url: String,
    web_dist_dir: PathBuf,
}

impl AppConfig {
    fn from_env() -> Result<Self, ConfigError> {
        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let port = match env::var("PORT") {
            Ok(v) => v.parse::<u16>().map_err(|_| ConfigError::InvalidPort(v))?,
            Err(_) => 8787,
        };

        let database_url = env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;
        let web_dist_dir = env::var("WEB_DIST_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("../../apps/web/dist"));

        Ok(Self {
            host,
            port,
            database_url,
            web_dist_dir,
        })
    }
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "forge_cloud=info,tower_http=info".into()),
        )
        .init();

    let config = AppConfig::from_env()?;

    let db_pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await?;

    let state = Arc::new(AppState { db_pool });

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any)
        .allow_origin([
            HeaderValue::from_static("http://localhost:3000"),
            HeaderValue::from_static("http://127.0.0.1:3000"),
            HeaderValue::from_static("http://localhost:5173"),
            HeaderValue::from_static("http://127.0.0.1:5173"),
            HeaderValue::from_static("https://bible.theophysics.pro"),
        ]);

    let api = Router::new().route("/api/health", get(health));

    let static_service = ServeDir::new(&config.web_dist_dir).append_index_html_on_directories(true);

    let app = Router::new()
        .nest("/", api)
        .fallback_service(static_service)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    info!("forge-cloud listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_status = match sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
    {
        Ok(_) => "ok",
        Err(_) => "degraded",
    };

    let status = if db_status == "ok" { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };

    (
        status,
        Json(HealthResponse {
            status: db_status,
            service: "forge-cloud",
        }),
    )
}
