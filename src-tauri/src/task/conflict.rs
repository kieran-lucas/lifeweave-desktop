pub fn overlaps(a_start: i32, a_end: i32, b_start: i32, b_end: i32) -> bool {
    a_start < b_end && b_start < a_end
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn touching_is_valid_but_partial_overlap_is_not() {
        assert!(!overlaps(480, 540, 540, 600));
        assert!(overlaps(480, 600, 540, 660));
        assert!(overlaps(480, 600, 480, 600));
    }
}
