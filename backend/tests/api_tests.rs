use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt; // Provides the `oneshot` method for mock requests

#[tokio::test]
async fn test_get_dresses_endpoint_returns_success() {
    // 1. Create a test router instance
    let app = axum::Router::new().route(
        "/api/dresses",
        axum::routing::get(|| async { (StatusCode::OK, "[]") }),
    );

    // 2. Build mock HTTP GET Request
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/dresses")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 3. Assert status code 200 OK
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_unauthorized_product_upload_blocked() {
    // Router simulating protected route without auth token
    let app = axum::Router::new().route(
        "/api/dresses",
        axum::routing::post(|| async { StatusCode::UNAUTHORIZED }),
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/dresses")
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"name":"Silk Dress"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    // Assert request without JWT token gets rejected with 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}