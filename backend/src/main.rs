use axum::{
    extract::Path,
    http::{HeaderMap, StatusCode},
    routing::{delete, get, patch, post},
    Json, Router,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

const SUPERBASE_URL: &str = "https://zfbswuznbkjutzwfyrrs.supabase.co";
const SUPERBASE_KEY: &str = "sb_publishable_uZhlJB3FvRD0-tAF-iM31Q_9MHCWKxA";
const JWT_SECRET: &[u8] = b"sylvora_super_secret_jwt_key_2026_xaf";

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Product {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    name: String,
    price_xaf: u32,
    original_price_xaf: Option<u32>,
    discount_percent: Option<u8>,
    discount_expiry: Option<String>,
    size: String,
    image_url: String,
    is_out_of_stock: bool,
    media_type: Option<String>,
    vendor_name: Option<String>,
    categories: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct UserAccount {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    email: String,
    password_hash: String,
    full_name: String,
    role: String,
}

#[derive(Serialize, Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct CreateUserRequest {
    email: String,
    password: String,
    full_name: String,
    role: String,
}

#[derive(Serialize, Deserialize)]
struct AuthResponse {
    token: String,
    role: String,
    full_name: String,
    email: String,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

#[derive(Serialize, Deserialize)]
struct StockUpdate {
    is_out_of_stock: bool,
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/dresses", get(get_products).post(add_product))
        .route("/api/dresses/:id/stock", patch(toggle_stock))
        .route("/api/dresses/:id", delete(delete_product))
        .route("/api/auth/register", post(register_user))
        .route("/api/auth/login", post(login_user))
        .route("/api/auth/create-admin", post(create_admin_account))
        .layer(cors);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "5000".to_string())
        .parse()
        .unwrap_or(5000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("🚀 Rust server connected to Supabase listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2.hash_password(password.as_bytes(), &salt).unwrap().to_string()
}

fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok()
}

fn verify_jwt(headers: &HeaderMap) -> Result<Claims, StatusCode> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(token_data.claims)
}

async fn login_user(Json(payload): Json<LoginRequest>) -> Result<Json<AuthResponse>, StatusCode> {
    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/users?email=eq.{}", SUPERBASE_URL, payload.email);

    let res = client
        .get(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let users: Vec<UserAccount> = res.json().await.unwrap_or_default();
    if users.is_empty() { return Err(StatusCode::UNAUTHORIZED); }

    let user = &users[0];
    if !verify_password(&payload.password, &user.password_hash) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let claims = Claims {
        sub: user.email.clone(),
        role: user.role.clone(),
        exp: 2000000000,
    };

    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse {
        token,
        role: user.role.clone(),
        full_name: user.full_name.clone(),
        email: user.email.clone(),
    }))
}

async fn register_user(Json(payload): Json<CreateUserRequest>) -> Result<Json<bool>, StatusCode> {
    let hashed = hash_password(&payload.password);
    let user = UserAccount {
        id: None,
        email: payload.email,
        password_hash: hashed,
        full_name: payload.full_name,
        role: "CUSTOMER".to_string(),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/users", SUPERBASE_URL);

    let res = client
        .post(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&user)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res.status().is_success()))
}

async fn create_admin_account(
    headers: HeaderMap,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<bool>, StatusCode> {
    let claims = verify_jwt(&headers)?;
    if claims.role != "SUPER_ADMIN" { return Err(StatusCode::FORBIDDEN); }

    let hashed = hash_password(&payload.password);
    let new_admin = UserAccount {
        id: None,
        email: payload.email,
        password_hash: hashed,
        full_name: payload.full_name,
        role: "ADMIN".to_string(),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/users", SUPERBASE_URL);

    let res = client
        .post(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .header("Content-Type", "application/json")
        .json(&new_admin)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res.status().is_success()))
}

async fn get_products() -> Json<Vec<Product>> {
    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/dresses?select=*&order=id.desc", SUPERBASE_URL);

    let response = client
        .get(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .send()
        .await;

    match response {
        Ok(res) => Json(res.json().await.unwrap_or_default()),
        Err(_) => Json(vec![]),
    }
}

async fn add_product(headers: HeaderMap, Json(payload): Json<Product>) -> Result<Json<bool>, StatusCode> {
    verify_jwt(&headers)?;
    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/dresses", SUPERBASE_URL);

    let res = client
        .post(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res.status().is_success()))
}

async fn toggle_stock(headers: HeaderMap, Path(id): Path<i64>, Json(payload): Json<StockUpdate>) -> Result<Json<bool>, StatusCode> {
    verify_jwt(&headers)?;
    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/dresses?id=eq.{}", SUPERBASE_URL, id);

    let res = client
        .patch(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res.status().is_success()))
}

async fn delete_product(headers: HeaderMap, Path(id): Path<i64>) -> Result<Json<bool>, StatusCode> {
    verify_jwt(&headers)?;
    let client = reqwest::Client::new();
    let url = format!("{}/rest/v1/dresses?id=eq.{}", SUPERBASE_URL, id);

    let res = client
        .delete(&url)
        .header("apikey", SUPERBASE_KEY)
        .header("Authorization", format!("Bearer {}", SUPERBASE_KEY))
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res.status().is_success()))
}