pub mod dto;
mod focus_plan;
pub mod normalize;
pub mod repository;

#[derive(Debug)]
pub enum SearchError {
    Storage,
}
