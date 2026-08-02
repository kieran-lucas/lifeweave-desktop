pub mod dto;
pub mod normalize;
pub mod repository;

#[derive(Debug)]
pub enum SearchError {
    Storage,
}
