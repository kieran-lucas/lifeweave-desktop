use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthCheck {
    status: &'static str,
    setup_phase: bool,
}

#[tauri::command]
pub fn health_check() -> HealthCheck {
    HealthCheck {
        status: "ok",
        setup_phase: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_check_does_not_claim_product_readiness() {
        let result = health_check();
        assert_eq!(result.status, "ok");
        assert!(result.setup_phase);
    }
}
