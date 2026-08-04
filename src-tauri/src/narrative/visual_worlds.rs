#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NarrativeVisualWorldId {
    Paper,
    Sakura,
    Aurora,
    Nocturne,
}

impl NarrativeVisualWorldId {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "paper" => Some(Self::Paper),
            "sakura" => Some(Self::Sakura),
            "aurora" => Some(Self::Aurora),
            "nocturne" => Some(Self::Nocturne),
            _ => None,
        }
    }
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Paper => "paper",
            Self::Sakura => "sakura",
            Self::Aurora => "aurora",
            Self::Nocturne => "nocturne",
        }
    }
}
